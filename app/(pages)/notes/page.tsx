"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify"; // notifications
import Swal from "sweetalert2"; // alertes confirm
import Select from "react-select"; // dropdowns
import { FileDown, FileUp, LucideTrash2, Plus } from "lucide-react"; // icônes
import { useSession } from "next-auth/react"; // session user
import jsPDF from "jspdf"; // génération PDF
import html2canvas from "html2canvas-pro"; // capture HTML pour PDF
import * as XLSX from "xlsx"; // lecture et écriture Excel
import { saveAs } from "file-saver"; // sauvegarde fichiers


// ================= ACTIONS SERVER =================
import {
  addNote,
  updateNote,
  deleteNote,
  getNotes,
  getReleve,
  getEtudiants,
  getAnneesAcademiques,
  getSessions,
  getFilieres,
} from "@/app/actions/notesActions"; // ton fichier actions.ts

// ================= TYPES =================
export interface SelectOption {
  value: number;
  label: string;
}


export default function NotesClient() {
  const { data: authSession } = useSession();

  const [notes, setNotes] = useState<any[]>([]);
  const [etudiants, setEtudiants] = useState<any[]>([]);
  const [annees, setAnnees] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [formKey, setFormKey] = useState(0);

  const [filterEtudiant, setFilterEtudiant] = useState<SelectOption | null>(null);
  const [filterAnnee, setFilterAnnee] = useState<SelectOption | null>(null);
  const [filterSession, setFilterSession] = useState<SelectOption | null>(null);
  const [filterFiliere, setFilterFiliere] = useState<SelectOption | null>(null);

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);

  const [selectedEtudiant, setSelectedEtudiant] = useState<SelectOption | null>(null);
  const [selectedAnnee, setSelectedAnnee] = useState<SelectOption | null>(null);
  const [selectedSession, setSelectedSession] = useState<SelectOption | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<SelectOption | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tableRef = useRef<HTMLTableElement>(null);


  // =====================
  // LOAD DATA
  // =====================
  useEffect(() => {
    async function load() {
      setNotes(await getNotes());
      setEtudiants(await getEtudiants());
      setAnnees(await getAnneesAcademiques());
      setSessions(await getSessions());
      setFilieres(await getFilieres());
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedNote) setEditPopupOpen(false);
  }, [selectedNote]);

  // =====================
  // OPTIONS
  // =====================
  const etudiantOptions = etudiants.map(e => ({
    value: e.id,
    label: `${e.nom} ${e.postnom} ${e.prenom}`,
  }));

  const anneeOptions = annees.map(a => ({
    value: a.id,
    label: a.annee,
  }));

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  const addHeader = (pdf: jsPDF, pageNumber: number) => {
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);

    // NOM ECOLE (remplace selon ton image)
    pdf.text("LEON ACADEMY", pageWidth / 2, 10, { align: "center" });

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");

    pdf.text(
      `Année académique : ${filterAnnee?.label || ""}`,
      14,
      20
    );

    pdf.text(
      `Session : ${filterSession?.label || ""}`,
      pageWidth - 60,
      20
    );

    pdf.line(10, 30, pageWidth - 10, 30);
  };
  const handleExportDeliberationPDF = async () => {
    if (!filterAnnee || !filterFiliere || !filterSession) {
      toast.info("Veuillez sélectionner l'année, la session et la filière avant d'exporter la grille.");
      return;
    }

    if (!tableRef.current) return;
    const table = tableRef.current;

    const columnsToHide = [7, 8, 9];
    const hiddenCells: HTMLElement[] = [];

    table.querySelectorAll("tr").forEach((row) => {
      columnsToHide.forEach((index) => {
        const cell = row.children[index] as HTMLElement;
        if (cell) {
          hiddenCells.push(cell);
          cell.style.display = "none";
        }
      });
    });

    const canvas = await html2canvas(table, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const blueHeaderHeight = 35;
    const whiteHeaderHeight = 25;
    const logoWidth = 32;
    const logoHeight = 22;
    const tableStartY = blueHeaderHeight + whiteHeaderHeight + 8;

    let heightLeft = imgHeight;
    let position = 0;

    const fetchLogoAsDataURL = async (url: string) => {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    };
    const logoBase64 = await fetchLogoAsDataURL("/logo-leon.png");

    const addHeader = (pdfInstance: jsPDF) => {
      const pageWidth = pdfInstance.internal.pageSize.getWidth();

      // Bande bleue avec coins arrondis
      pdfInstance.setFillColor(72, 118, 255);
      pdfInstance.roundedRect(10, 10, pageWidth - 20, blueHeaderHeight, 4, 4, "F");

      // Logo centré
      pdfInstance.addImage(
        logoBase64,
        pageWidth / 2 - logoWidth / 2,
        18, // logo un peu plus bas pour libérer le texte du haut
        logoWidth,
        logoHeight
      );

      // Texte au-dessus du logo avec margin-top
      pdfInstance.setTextColor(255, 255, 255);
      pdfInstance.setFont("helvetica", "normal");
      pdfInstance.setFontSize(9);
      pdfInstance.text(
        "CENTRE DE FORMATION PROFESSIONNELLE ET METIERS",
        pageWidth / 2,
        12 + 3, // +3 mm pour espacer du bord haut
        { align: "center" }
      );

      // Texte sous le logo
      pdfInstance.setFont("helvetica", "bold");
      pdfInstance.setFontSize(12);
      pdfInstance.text(
        "LEON ACADEMY",
        pageWidth / 2,
        18 + logoHeight + 3, // +3 mm marge
        { align: "center" }
      );

      // Zone blanche sous la bande bleue
      pdfInstance.setFillColor(255, 255, 255);
      pdfInstance.rect(10, blueHeaderHeight + 10, pageWidth - 20, whiteHeaderHeight, "F");

      // Texte grille et info session/année/filière
      pdfInstance.setTextColor(0, 0, 0);
      pdfInstance.setFont("helvetica", "bold");
      pdfInstance.setFontSize(11);
      pdfInstance.text(
        "Grille de Délibération",
        pageWidth / 2,
        blueHeaderHeight + 18,
        { align: "center" }
      );

      pdfInstance.setFont("helvetica", "normal");
      pdfInstance.setFontSize(9);
      pdfInstance.text(
        `Année: ${filterAnnee.label} | Filière: ${filterFiliere.label} | Session: ${filterSession.label}`,
        pageWidth / 2,
        blueHeaderHeight + 26,
        { align: "center" }
      );

      // Ligne séparatrice
      pdfInstance.setDrawColor(72, 118, 255);
      pdfInstance.setLineWidth(0.8);
      pdfInstance.line(
        12,
        blueHeaderHeight + whiteHeaderHeight + 10,
        pageWidth - 12,
        blueHeaderHeight + whiteHeaderHeight + 10
      );
    };

    const modifyTableForPDF = () => {
      const thead = table.querySelector("thead");
      if (thead) {
        Array.from(thead.querySelectorAll("th")).forEach((th) => {
          (th as HTMLElement).style.backgroundColor = "#B0E0E6";
          (th as HTMLElement).style.fontSize = "12px";
          (th as HTMLElement).style.padding = "2px";
        });
      }
      const tbody = table.querySelector("tbody");
      if (tbody) {
        Array.from(tbody.querySelectorAll("tr")).forEach((tr, index) => {
          Array.from(tr.querySelectorAll("td")).forEach((td) => {
            (td as HTMLElement).style.fontSize = "12px";
            (td as HTMLElement).style.padding = "2px";
            (td as HTMLElement).style.backgroundColor =
              index % 2 === 0 ? "#E6F2FA" : "#ffffff";
          });
        });
      }
    };
    modifyTableForPDF();

    const generatePage = () => {
      addHeader(pdf);
      pdf.addImage(imgData, "PNG", 10, tableStartY, imgWidth, imgHeight, undefined, "FAST");
    };

    generatePage();
    heightLeft -= pageHeight - tableStartY;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      addHeader(pdf);
      pdf.addImage(imgData, "PNG", 10, tableStartY + position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight - tableStartY;
    }

    const addFooter = () => {
      pdf.setDrawColor(72, 118, 255);
      pdf.setLineWidth(0.8);
      pdf.line(10, pageHeight - 25, pageWidth - 10, pageHeight - 25);

      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Fait à Kinshasa, le ${new Date().toLocaleDateString()}`, 15, pageHeight - 18);

      pdf.setFont("helvetica", "bold");
      pdf.text("Directeur", pageWidth - 40, pageHeight - 18);
    };
    addFooter();

    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} / ${totalPages}`, pageWidth - 25, pageHeight - 10);
    }

    pdf.save("Grille_Deliberation.pdf");

    hiddenCells.forEach((cell) => (cell.style.display = ""));
  };
  const sessionOptions = sessions.map((s) => ({
    value: s.id,
    label:
      s.dateDebut && s.dateFin
        ? `${formatDate(s.dateDebut)} - ${formatDate(s.dateFin)}`
        : `Session ${s.id}`,
  }));

  const filiereOptions = filieres.map(f => ({
    value: f.id,
    label: f.nom,
  }));

  const calculateMentionFromAverage = (average: number) => {
    const percentage = average;
    if (percentage >= 80) return "Excellent";
    if (percentage >= 70) return "Très bien";
    if (percentage >= 60) return "Bien";
    if (percentage >= 50) return "Assez Bien";
    return "Ajourné";
  };

  // =====================
  // FILTER
  // =====================
  const filteredNotes = notes
    .filter(n =>
      (!filterEtudiant || (n.etudiant && n.etudiant.id === filterEtudiant.value)) &&
      (!filterAnnee || n.anneeAcademique.id === filterAnnee.value) &&
      (!filterSession || n.session?.id === filterSession.value) &&
      (!filterFiliere || n.filiere?.id === filterFiliere.value)
    )
    .filter(n =>
      !search ||
      n.matiere.toLowerCase().includes(search.toLowerCase())
    );

  const moyenneGenerale = filteredNotes.length
    ? filteredNotes.reduce((acc, n) => acc + Number(n.noteTheorique + n.notePratique + n.noteJyry || 0), 0) / filteredNotes.length
    : 0;

  const moyennePourcentage = (moyenneGenerale / 100) * 100;

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);

  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  // =====================
  // EXPORT EXCEL
  // =====================
  const handleExportExcel = () => {
    if (!filteredNotes.length) {
      return toast.info("Aucune note à exporter");
    }

    const dataNotes = filteredNotes.map(n => ({
      Etudiant: n.etudiant ? `${n.etudiant.nom} ${n.etudiant.postnom} ${n.etudiant.prenom}` : "Étudiant supprimé",
      Notes_Th: n.noteTheorique,
      Notes_Pr: n.notePratique,
      Notes_Jury: n.noteJyry,
      Annee: n.anneeAcademique?.annee ?? "N/A",
      Session:
        n.session?.dateDebut && n.session?.dateFin
          ? `${new Date(n.session.dateDebut).toLocaleDateString()} - ${new Date(n.session.dateFin).toLocaleDateString()}`
          : "N/A",
      Filiere: n.filiere?.nom ?? "N/A",
    }));

    const moyenne = filteredNotes.reduce((acc, n) => acc + Number(n.noteTheorique + n.notePratique + n.noteJyry || 0), 0) / 3;
    const mention = calculateMentionFromAverage(moyenne);

    const dataResume = [
      { Clé: "Nombre de notes", Valeur: filteredNotes.length },
      { Clé: "Moyenne générale", Valeur: moyenne.toFixed(2) },
      { Clé: "Mention globale", Valeur: mention },
    ];

    const workbook = XLSX.utils.book_new();

    const wsNotes = XLSX.utils.json_to_sheet(dataNotes);
    XLSX.utils.book_append_sheet(workbook, wsNotes, "Notes");

    const wsResume = XLSX.utils.json_to_sheet(dataResume);
    XLSX.utils.book_append_sheet(workbook, wsResume, "Résumé");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });

    saveAs(blob, "notes_export.xlsx");
  };

  // =====================
  // IMPORT EXCEL
  // =====================
  const handleImportExcel = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames.includes("Notes")
        ? "Notes"
        : workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(worksheet);

      if (!json.length) {
        return toast.error("Fichier vide");
      }

      const requiredCols = ["Etudiant", "Matiere", "Note", "Annee", "Session", "Filiere"];
      const missingCols = requiredCols.filter(col => !Object.keys(json[0]).includes(col));

      if (missingCols.length) {
        return toast.error(`Colonnes manquantes: ${missingCols.join(", ")}`);
      }

      const promises = json.map(async (row: any, index: number) => {
        const etudiantNom = row.Etudiant?.toString().trim();
        const matiere = row.Matiere?.toString().trim();
        const note = Number(row.Note);
        const anneeNom = row.Annee?.toString().trim();
        const sessionLabel = row.Session?.toString().trim();
        const filiereNom = row.Filiere?.toString().trim();

        if (!etudiantNom || !matiere || isNaN(note) || !anneeNom || !sessionLabel || !filiereNom) {
          throw new Error(`Ligne ${index + 2} : données invalides`);
        }

        const etudiant = etudiants.find(e => `${e.nom} ${e.postnom} ${e.prenom}` === etudiantNom);
        const annee = annees.find(a => a.annee === anneeNom);
        const session = sessions.find(s => {
          const label =
            s.dateDebut && s.dateFin
              ? `${formatDate(s.dateDebut)} - ${formatDate(s.dateFin)}`
              : `Session ${s.id}`;
          return label === sessionLabel;
        });
        const filiere = filieres.find(f => f.nom === filiereNom);

        if (!etudiant || !annee || !session || !filiere) {
          throw new Error(`Ligne ${index + 2} : entités non trouvées (étudiant/année/session/filière)`);
        }

        const formData = new FormData();
        formData.append("matiere", matiere);
        formData.append("note", String(note));
        formData.append("etudiantId", String(etudiant.id));
        formData.append("anneeAcademiqueId", String(annee.id));
        formData.append("sessionId", String(session.id));
        formData.append("filiereId", String(filiere.id));
        formData.append("createdById", String(authSession?.user?.id || ""));

        return addNote(formData);
      });

      const createdNotes = await Promise.all(promises);
      setNotes(prev => [...createdNotes, ...prev]);
      toast.success("Importation terminée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'importation");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownloadReleve = async (

    note: any) => {
    const BREVE_CODE_OFFICIEL =
      "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

    if (
      !note?.etudiant?.id ||
      !note?.anneeAcademique?.id ||
      !note?.session?.id ||
      !note?.filiere?.id
    ) {
      return toast.error("Données manquantes");
    }

    const { notes: releveNotes, stats } = await getReleve(
      note.etudiant.id,
      note.anneeAcademique.id,
      note.session.id,
      note.filiere.id
    );

    if (!releveNotes?.length) {
      return toast.info("Aucune note trouvée");
    }

    const first = releveNotes[0];

    if (!first?.etudiant || !first?.session || !first?.filiere) {
      return toast.error("Données relationnelles manquantes");
    }

    const etudiant = first.etudiant;
    const session = first.session;
    const filiere = first.filiere;


    const dateDebut = new Date(session.dateDebut).toLocaleDateString();
    const dateFin = new Date(session.dateFin).toLocaleDateString();

    const releveHtml = `
  <div style="
    width:100%;
    height:100%;
    padding:18mm;
    font-family:'Times New Roman', serif;
    background:#ffffff;
    box-sizing:border-box;
  ">

    <!-- HEADER IDENTIQUE BREVET -->
    <div style="text-align:center;border-bottom:4px solid #1f5e3b;padding-bottom:12px;">
      <h2 style="margin:0;font-size:20px;">
        CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
      </h2>
      <p style="margin:2px 0;font-weight:bold;font-size:18px;color:#1f5e3b;">
        « LEON ACADEMY »
      </p>
      <img src="/logo-leon.png" style="width:90px;margin:8px auto;" />
      <p style="font-size:11px;font-weight:bold;margin-top:5px;">
        ${BREVE_CODE_OFFICIEL}
      </p>
    </div>

    <!-- TITRE -->
    <div style="
      margin:22px auto;
      text-align:center;
      font-weight:bold;
      font-size:20px;
      background:#c9a64d;
      padding:10px 25px;
      width:fit-content;
      letter-spacing:1px;
    ">
      RELEVÉ DE NOTES
    </div>

    <!-- INFOS ETUDIANT -->
    <div style="
      margin-bottom:25px;
      font-size:14px;
      line-height:1.6;
      padding:15px;
      background:#f9f9f9;
      border-left:5px solid #1f5e3b;
    ">
      <p><strong>Étudiant :</strong> ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}</p>
      <p><strong>Filière :</strong> ${filiere.nom}</p>
      <p><strong>Session :</strong> ${dateDebut} - ${dateFin}</p>
      <p><strong>Année académique :</strong> ${note.anneeAcademique.annee}</p>
    </div>

    <!-- TABLE NOTES -->
    <table style="
      width:100%;
      border-collapse:collapse;
      font-size:14px;
    ">
      <thead>
        <tr style="background:#1f5e3b;color:white;">
          <th style="padding:10px;border:1px solid #ddd;text-align:left;">Rubriques</th>
          <th style="padding:10px;border:1px solid #ddd;text-align:center;">Côtations</th>
        </tr>
      </thead>
      <tbody>
      
       
          <tr style="background:;">
            <td style="padding:10px;border:1px solid #ddd;">
            Evaluation Théorique / 20
            </td>
            <td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;">
             ${note.noteTheorique}
            </td>
          </tr>

            <tr style="background:;">
            <td style="padding:10px;border:1px solid #ddd;">
            Evaluation Pratique / 50
            </td>
            <td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;">
             ${note.notePratique}
            </td>
          </tr>

            <tr style="background:;">
            <td style="padding:10px;border:1px solid #ddd;">
            Evaluation Jury / 30
            </td>
            <td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:bold;">
             ${note.noteJyry}
            </td>
          </tr>
        
      </tbody>
    </table>

    <!-- MOYENNE -->
    <div style="
      margin-top:30px;
      padding:15px;
      background:#eef3f0;
      border:2px solid #1f5e3b;
      font-size:15px;
    ">
     
      <p><strong>Pourcentage :</strong> ${stats.pourcentage.toFixed(2)} %</p>
      <p><strong>Mention :</strong> 
        <span style="color:#1f5e3b;font-weight:bold;font-size:16px;">
          ${stats.mention}
        </span>
      </p>
    </div>

    <!-- SIGNATURE -->
    <div style="text-align:right;margin-top:60px;font-size:14px;">
      Fait à Kinshasa, le ${new Date().toLocaleDateString()}
      <div style="margin-top:50px;">
        <div style="border-top:1px solid #000;width:200px;margin-left:auto;"></div>
        <strong style="display:block;text-align:center;width:200px;margin-left:auto;">
          Le Directeur
        </strong>
      </div>
    </div>

  </div>
  `;

    const container = document.createElement("div");
    container.style.width = "210mm";
    container.style.height = "297mm";
    container.innerHTML = releveHtml;
    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      pdf.internal.pageSize.getWidth(),
      pdf.internal.pageSize.getHeight()
    );

    pdf.save("releve-notes.pdf");

    document.body.removeChild(container);
  };


  // =====================
  // ADD NOTE
  // =====================
  const handleAddNote = async (e: any) => {
    e.preventDefault();

    if (!authSession?.user?.id)
      return toast.error("Session expirée");

    if (
      !selectedEtudiant ||
      !selectedSession ||
      !selectedFiliere ||
      !selectedAnnee
    ) {
      return toast.error("Veuillez remplir tous les champs");
    }

    // ✅ Vérification doublon
    const already = notes.find(
      (n) =>
        n.etudiant?.id === selectedEtudiant.value &&
        n.session?.id === selectedSession.value &&
        n.filiere?.id === selectedFiliere.value &&
        n.anneeAcademique?.id === selectedAnnee.value
    );

    if (already) {
      return toast.error(
        "Doublon détecté : cet étudiant a déjà une note pour cette session et filière."
      );
    }

    // ✅ On récupère uniquement les champs nécessaires
    const formData = new FormData(e.currentTarget);

    // ⚠️ IMPORTANT :
    // Si tu as un input name="notePratique" dans ton form,
    // on le supprime pour éviter d'envoyer une mauvaise valeur
    formData.delete("notePratique");

    // ✅ On injecte les relations
    formData.set("etudiantId", String(selectedEtudiant.value));
    formData.set("anneeAcademiqueId", String(selectedAnnee.value));
    formData.set("sessionId", String(selectedSession.value));
    formData.set("filiereId", String(selectedFiliere.value));
    formData.set("createdById", authSession.user.id);

    try {
      const created = await addNote(formData);

      setNotes((prev) => [created, ...prev]);

      toast.success("Note ajoutée avec calcul automatique du pratique");

      setPopupOpen(false);

      // ✅ Reset propre
      setSelectedEtudiant(null);
      setSelectedAnnee(null);
      setSelectedSession(null);
      setSelectedFiliere(null);
      setSelectedNote(null);

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // =====================
  // EDIT NOTE
  // =====================
  const openEditPopup = (note: any) => {
    setSelectedNote(note);

    setSelectedEtudiant({
      value: note.etudiant.id,
      label: `${note.etudiant.nom} ${note.etudiant.postnom} ${note.etudiant.prenom}`,
    });

    setSelectedAnnee({
      value: note.anneeAcademique.id,
      label: note.anneeAcademique.annee,
    });

    setSelectedSession({
      value: note.session?.id,
      label:
        note.session?.dateDebut && note.session?.dateFin
          ? `${formatDate(note.session.dateDebut)} - ${formatDate(note.session.dateFin)}`
          : `Session ${note.session?.id}`,
    });

    setSelectedFiliere({
      value: note.filiere?.id,
      label: note.filiere?.nom,
    });

    setEditPopupOpen(true);
  };

  const handleEditNote = async (e: any) => {
    e.preventDefault();

    if (!selectedNote) return;
    if (!authSession?.user?.id)
      return toast.error("Session expirée");

    if (
      !selectedEtudiant ||
      !selectedAnnee ||
      !selectedSession ||
      !selectedFiliere
    ) {
      return toast.error(
        "Veuillez sélectionner tous les champs (Étudiant / Année / Session / Filière)"
      );
    }

    // ✅ Vérification doublon
    const already = notes.find(
      (n) =>
        n.id !== selectedNote.id &&
        n.etudiant?.id === selectedEtudiant.value &&
        n.session?.id === selectedSession.value &&
        n.filiere?.id === selectedFiliere.value &&
        n.anneeAcademique?.id === selectedAnnee.value
    );

    if (already) {
      return toast.error(
        "Doublon détecté : cet étudiant a déjà une note pour cette session et filière."
      );
    }

    const formData = new FormData(e.currentTarget);

    // ⚠️ IMPORTANT : on supprime notePratique si elle existe
    formData.delete("notePratique");

    // ✅ Injecter les valeurs correctes
    formData.set("id", String(selectedNote.id));
    formData.set("etudiantId", String(selectedEtudiant.value));
    formData.set("anneeAcademiqueId", String(selectedAnnee.value));
    formData.set("sessionId", String(selectedSession.value));
    formData.set("filiereId", String(selectedFiliere.value));
    formData.set("createdById", authSession.user.id);

    try {
      const updated = await updateNote(formData);

      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );

      toast.success("Note modifiée (pratique recalculé automatiquement)");

      setEditPopupOpen(false);

      // ✅ Reset propre
      setSelectedNote(null);
      setSelectedEtudiant(null);
      setSelectedAnnee(null);
      setSelectedSession(null);
      setSelectedFiliere(null);

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // =====================
  // DELETE NOTE
  // =====================
  const handleDeleteNote = async (id: number) => {
    const res = await Swal.fire({
      title: "Supprimer ?",
      icon: "warning",
      showCancelButton: true,
    });
    if (!res.isConfirmed) return;

    await deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success("Supprimé");
  };

  // =====================
  // DOWNLOAD BREVET
  // =====================
  const formatPrenom = (prenom: string) => {
    if (!prenom) return "";
    prenom = prenom.trim();
    return prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
  };

  const handleDownloadBrevet = async (note: any) => {
    const BREVE_CODE_OFFICIEL = "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";
    const estHomme =
      note.etudiant.sexe?.toLowerCase() === "m" ||
      note.etudiant.sexe?.toLowerCase() === "masculin" ||
      note.etudiant.sexe?.toLowerCase() === "homme";

    const pronom = estHomme ? "Il" : "Elle";

    if (
      !note?.etudiant?.id ||
      !note?.anneeAcademique?.id ||
      !note?.session?.id ||
      !note?.filiere?.id
    ) {
      return toast.error("Impossible de générer le brevet (données manquantes)");
    }

    const { notes: releveNotes, stats } = await getReleve(
      note.etudiant.id,
      note.anneeAcademique.id,
      note.session.id,
      note.filiere.id
    );

    if (!releveNotes?.length) return toast.info("Aucune note");

    const firstNote = releveNotes[0];
    if (!firstNote) return toast.error("Aucune note disponible");

    const etudiant = firstNote.etudiant;
    const sessionData = firstNote.session;
    const filiere = firstNote.filiere;

    if (!etudiant) return toast.error("Étudiant manquant");
    if (!sessionData) return toast.error("Session non définie");
    if (!filiere) return toast.error("Filière non définie");

    const dateDebut = new Date(sessionData.dateDebut).toLocaleDateString();
    const dateFin = new Date(sessionData.dateFin).toLocaleDateString();

    const formatPrenom = (prenom: string) => {
      if (!prenom) return "";
      prenom = prenom.trim();
      return prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
    };

    const pourcentage = stats?.pourcentage ?? 0;
    const mention = stats?.mention ?? "BIEN";

    // ==========================
    // HTML BREVET (PAYSAGE A4)
    // ==========================

    const brevetHtml = `
  <div style="
    width:100%;
    height:100%;
    padding:20mm;
    font-family:'Times New Roman', serif;
    background:#f2f2f2;
    position:relative;
    box-sizing:border-box;
  ">

    <!-- Filigrane centré -->
    <img
      src="/format1.png"
      style="
        position:absolute;
        top:54%;
        left:14%;
        transform:translate(-50%, -50%);
        width:340px;
        opacity:20;
        z-index:0;
      "
    />

    <div style="
      position:relative;
      z-index:1;
      height:100%;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
    ">

      <!-- HEADER -->
      <div style="text-align:center;">
        <h2 style="margin:0;font-size:22px;">
          CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
        </h2>
        <p style="margin:2px 0;font-weight:bold;font-size:20px;">
          « LEON ACADEMY »
        </p>
        <img src="/logo-leon.png" style="width:110px;margin:8px auto;" />
        <p style="font-size:12px;font-weight:bold;margin:4px 0;">
          ${BREVE_CODE_OFFICIEL}
        </p>
      </div>

      <!-- TITRE -->
      <div style="
        background:#c9a64d;
        padding:10px 16px;
        margin:15px auto;
        text-align:center;
        font-weight:bold;
        font-size:18px;
        width:fit-content;
        letter-spacing:0.6px;
      ">
        ATTESTATION TENANT LIEU DE CERTIFICAT<br/>
        D’APTITUDE PROFESSIONNELLE
      </div>

      <!-- CORPS -->
      <div style="font-size:15px; line-height:1.7; text-align:justify; margin-left:20px">

        <p>
          Nous soussignons la Direction du centre de formation professionnelle 
          et Métiers <strong>« Léon Academy »</strong>, certifions que :
        </p>

        <p style="
          text-align:center;
          font-size:22px;
          font-weight:bold;
          color:#1f5e3b;
          margin:18px 0;
        ">
          ${etudiant.nom} ${etudiant.postnom} ${formatPrenom(etudiant.prenom)}
        </p>

        <p>
          a suivi, du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong>, 
          une formation professionnelle en 
          <strong>${filiere.nom.toUpperCase()}</strong>,
          comprenant <strong>${filiere.nombreHt} heures de théorie</strong> 
          et <strong>${filiere.nombreHp} heures de pratique</strong>,
          ${filiere.description ?? ""}. ${pronom} a satisfait aux épreuves d’évaluation avec la mention 
          <strong style="color:#1f5e3b;">${mention}</strong>, 
          soit <strong>${pourcentage.toFixed(0)} %</strong>.
        </p>


        <p>
          En foi de quoi, nous lui délivrons la présente attestation 
          pour servir et valoir ce que de droit.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="text-align:right;font-size:14px;">
        <div>Fait à Kinshasa, le ${new Date().toLocaleDateString()}</div>
        <div style="margin-top:30px;">
          <div style="border-top:1px solid #000;width:200px;margin-left:auto;"></div>
          <strong style="display:block;text-align:center;width:200px;margin-left:auto;">
            Le Directeur
          </strong>
        </div>
      </div>

    </div>
  </div>
  `;

    // ==========================
    // GENERATION PDF SANS ESPACE BLANC
    // ==========================

    const container = document.createElement("div");
    container.style.width = "297mm";
    container.style.height = "210mm";
    container.innerHTML = brevetHtml;

    document.body.appendChild(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      width: container.offsetWidth,
      height: container.offsetHeight,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save("brevet.pdf");

    document.body.removeChild(container);
  };

  return (
    <div className="mx-8 mt-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Notes</h1>

      <div className="bg-base-100 p-8 rounded-3xl shadow-lg mb-8 space-y-8">

        {/* ================= TOP : ACTION BUTTONS ================= */}
        <div className="flex flex-wrap gap-4 justify-between items-center border-b pb-6">

          <div className="flex gap-3">
            <button
              className="btn btn-outline btn-primary rounded-2xl flex items-center gap-2 px-6 hover:scale-105 transition"
              onClick={handleExportExcel}
            >
              <FileDown size={18} />
              Export Excel
            </button>

            <button
              className="btn btn-sm btn-primary"
              onClick={handleExportDeliberationPDF}
            >

              Export PDF

            </button>

            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
              id="importExcel"
            />

            <label
              htmlFor="importExcel"
              className="btn btn-outline btn-secondary rounded-2xl flex items-center gap-2 px-6 cursor-pointer hover:scale-105 transition"
            >
              <FileUp size={18} />
              Import Excel
            </label>

          </div>
          <div className="flex flex-wrap gap-3">

            <button
              className="btn btn-accent rounded-2xl flex items-center gap-2 px-6 shadow-md hover:shadow-lg transition"
              onClick={() => {
                setPopupOpen(true);
                setSelectedEtudiant(null);
                setSelectedAnnee(null);
                setSelectedSession(null);
                setSelectedFiliere(null);
                setFormKey(prev => prev + 1); // <-- reset form
              }}
            >
              <Plus size={18} />
              Ajouter une note
            </button>
          </div>

        </div>

        {/* ================= BOTTOM : FILTERS ================= */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-base-content/70">
            Filtres
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Étudiant */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Étudiant</span>
              </label>
              <Select
                options={etudiantOptions}
                isClearable
                placeholder="Sélectionner"
                onChange={(opt) => {
                  setFilterEtudiant(opt);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Année */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Année</span>
              </label>
              <Select
                options={anneeOptions}
                isClearable
                placeholder="Sélectionner"
                onChange={(opt) => {
                  setFilterAnnee(opt);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Session */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Session</span>
              </label>
              <Select
                options={sessionOptions}
                isClearable
                placeholder="Sélectionner"
                onChange={(opt) => {
                  setFilterSession(opt);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Filière */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-medium">Filière</span>
              </label>
              <Select
                options={filiereOptions}
                isClearable
                placeholder="Sélectionner"
                onChange={(opt) => {
                  setFilterFiliere(opt);
                  setCurrentPage(1);
                }}
              />
            </div>

          </div>
        </div>
      </div>



      {/* SEARCH */}


      {/* MOYENNE GÉNÉRALE */}
      <div className="text-lg font-semibold w-full flex justify-between mb-2">
        <div>
          Moyenne générale :{" "}
          <span className="text-primary">
            {moyenneGenerale.toFixed(2)} / 100
          </span>{" "}
          <span className="text-base-content/60">
            ({moyennePourcentage.toFixed(2)}%)
          </span>
        </div>

        <p className="text-sm">
          ({filteredNotes.length} notes)
        </p>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
        <table ref={tableRef} className="table w-full">
          <thead className="bg-base-200 text-sm">
            <tr>
              <th>N°</th> {/* ✅ Nouvelle colonne */}
              <th>Etudiant</th>
              <th>Théorie/20</th>
              <th>Pratique/50</th>
              <th>Jury/30</th>
              <th>Total</th>
              <th>Mention</th>
              <th>Session</th>
              <th>Filière</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedNotes.length ? (
              paginatedNotes.map((n, index) => (
                <tr key={n.id}>
                  {/* ✅ Index avec pagination */}
                  <td>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>

                  <td>
                    {n.etudiant
                      ? `${n.etudiant.nom} ${n.etudiant.postnom} ${n.etudiant.prenom}`
                      : "Étudiant supprimé"}
                  </td>
                  <td>{n.noteTheorique}</td>
                  <td>{n.notePratique}</td>
                  <td>{n.noteJyry}</td>
                  <td>
                    {n.noteJyry + n.notePratique + n.noteTheorique} %
                  </td>
                  <td>
                    {calculateMentionFromAverage(
                      n.noteJyry + n.notePratique + n.noteTheorique
                    )}
                  </td>
                  <td>
                    {n.session?.dateDebut && n.session?.dateFin
                      ? `${new Date(n.session.dateDebut).toLocaleDateString()} - 
                   ${new Date(n.session.dateFin).toLocaleDateString()}`
                      : "N/A"}
                  </td>
                  <td>{n.filiere?.nom ?? "N/A"}</td>

                  <td className="flex justify-center gap-2">
                    <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteNote(n.id)}> <LucideTrash2 size={16} /> </button>
                    <button className="btn btn-xs btn-success btn-outline" onClick={() => handleDownloadBrevet(n)} disabled={!n.session || !n.filiere || !n.anneeAcademique || !n.etudiant} > 🎓 </button>
                    <button className="btn btn-xs btn-warning btn-outline" onClick={() => openEditPopup(n)} > ✏️ </button>
                    <button className="btn btn-xs btn-primary btn-outline" onClick={() => handleDownloadReleve(n)} disabled={!n.session || !n.filiere || !n.anneeAcademique || !n.etudiant} > 📄 </button>
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-500">
                  Aucune note trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="join shadow-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`join-item btn btn-sm ${p === currentPage ? "btn-primary" : ""}`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}



      {/* ================= POPUP AJOUT ================= */}
      <input
        type="checkbox"
        id="modal-add"
        className="modal-toggle"
        checked={popupOpen}
        onChange={() => setPopupOpen(!popupOpen)}
      />

      <div className="modal modal-middle">
        <div className="modal-box w-full max-w-2xl p-0 rounded-3xl shadow-2xl overflow-visible">

          {/* HEADER */}
          <div className="relative px-7 py-5 border-b bg-base-200 rounded-t-3xl">

            <h2 className="text-lg font-bold">Ajouter une note</h2>
            <p className="text-xs text-base-content/60 mt-1">
              Remplissez les informations ci-dessous
            </p>

            {/* CROIX FERMETURE */}
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              className="absolute right-4 top-4 btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>

          </div>

          {/* BODY */}
          <form onSubmit={handleAddNote} className="px-7 py-5 space-y-5 text-sm" key={formKey}>

            {/* Section Informations */}
            <div>
              <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                Informations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Étudiant</span>
                  </label>
                  <Select
                    options={etudiantOptions}
                    value={selectedEtudiant}
                    onChange={setSelectedEtudiant}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Année</span>
                  </label>
                  <Select
                    options={anneeOptions}
                    value={selectedAnnee}
                    onChange={setSelectedAnnee}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Session</span>
                  </label>
                  <Select
                    options={sessionOptions}
                    value={selectedSession}
                    onChange={setSelectedSession}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Filière</span>
                  </label>
                  <Select
                    options={filiereOptions}
                    value={selectedFiliere}
                    onChange={setSelectedFiliere}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

              </div>
            </div>

            {/* Section note */}
            <div>
              <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                Détails des notes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ev Théorique /20</span>
                  </label>
                  <input
                    name="noteTheorique"
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    className="input input-bordered rounded-xl focus:input-primary text-sm"
                    placeholder="Ex: 15.50"
                    required
                    onInput={(e: any) => {
                      const value = e.target.value;
                      const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                      if (!regex.test(value)) {
                        e.target.value = value.slice(0, -1);
                      }
                    }}
                  />
                </div>
                {/* <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Ev Pratique /50</span>
                  </label>
                  <input
                    name="notePratique"
                    type="number"
                    step="0.01"
                    min="0"
                    max="50"
                    className="input input-bordered rounded-xl focus:input-primary text-sm"
                    placeholder="Ex: 15.50"
                    required
                    onInput={(e: any) => {
                      const value = e.target.value;
                      const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                      if (!regex.test(value)) {
                        e.target.value = value.slice(0, -1);
                      }
                    }}
                  />
                </div> */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Jury /30</span>
                  </label>
                  <input
                    name="noteJyry"
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    className="input input-bordered rounded-xl focus:input-primary text-sm"
                    placeholder="Ex: 15.50"
                    required
                    onInput={(e: any) => {
                      const value = e.target.value;
                      const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                      if (!regex.test(value)) {
                        e.target.value = value.slice(0, -1);
                      }
                    }}
                  />
                </div>


              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end pt-6 border-t">
              <button
                type="submit"
                className="btn btn-accent rounded-xl px-7 shadow-md hover:shadow-lg transition flex items-center gap-2"
              >

                Enregistrer
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* POPUP EDIT */}
      {editPopupOpen && selectedNote ? (
        <>
          <input
            type="checkbox"
            id="modal-edit"
            className="modal-toggle"
            checked={editPopupOpen}
            onChange={() => setEditPopupOpen(!editPopupOpen)}
          />

          <div className="modal modal-middle">
            <div className="modal-box w-full max-w-2xl p-0 rounded-3xl shadow-2xl overflow-visible">

              {/* HEADER */}
              <div className="relative px-7 py-5 border-b bg-base-200 rounded-t-3xl">
                <h2 className="text-lg font-bold">Modifier la note</h2>
                <p className="text-xs text-base-content/60 mt-1">
                  Modifiez les informations ci-dessous
                </p>

                {/* CROIX FERMETURE */}
                <button
                  type="button"
                  onClick={() => setEditPopupOpen(false)}
                  className="absolute right-4 top-4 btn btn-sm btn-circle btn-ghost"
                >
                  ✕
                </button>
              </div>

              {/* BODY */}
              <form onSubmit={handleEditNote} className="px-7 py-5 space-y-5 text-sm">

                {/* Section Informations */}
                <div>
                  <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                    Informations
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Étudiant</span>
                      </label>
                      <Select
                        options={etudiantOptions}
                        value={selectedEtudiant}
                        onChange={setSelectedEtudiant}
                        placeholder="Sélectionner"
                        isClearable
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Année</span>
                      </label>
                      <Select
                        options={anneeOptions}
                        value={selectedAnnee}
                        onChange={setSelectedAnnee}
                        placeholder="Sélectionner"
                        isClearable
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Session</span>
                      </label>
                      <Select
                        options={sessionOptions}
                        value={selectedSession}
                        onChange={setSelectedSession}
                        placeholder="Sélectionner"
                        isClearable
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Filière</span>
                      </label>
                      <Select
                        options={filiereOptions}
                        value={selectedFiliere}
                        onChange={setSelectedFiliere}
                        placeholder="Sélectionner"
                        isClearable
                      />
                    </div>

                  </div>
                </div>

                {/* Section note */}
                <div>
                  <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                    Détails des notes
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Ev Théorique /20</span>
                      </label>
                      <input
                        name="noteTheorique"
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        defaultValue={selectedNote.noteTheorique}
                        className="input input-bordered rounded-xl focus:input-primary text-sm"
                        placeholder="Ex: 15.50"
                        required
                        onInput={(e: any) => {
                          const value = e.target.value;
                          const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                          if (!regex.test(value)) {
                            e.target.value = value.slice(0, -1);
                          }
                        }}
                      />
                    </div>
                    {/* <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Ev Pratique /50</span>
                      </label>
                      <input
                        name="notePratique"
                        type="number"
                        step="0.01"
                        min="0"
                        max="50"
                        defaultValue={selectedNote.notePratique}
                        className="input input-bordered rounded-xl focus:input-primary text-sm"
                        placeholder="Ex: 15.50"
                        required
                        onInput={(e: any) => {
                          const value = e.target.value;
                          const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                          if (!regex.test(value)) {
                            e.target.value = value.slice(0, -1);
                          }
                        }}
                      />
                    </div> */}
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Jury /30</span>
                      </label>
                      <input
                        name="noteJyry"
                        type="number"
                        step="0.01"
                        min="0"
                        max="30"
                        defaultValue={selectedNote.noteJyry}
                        className="input input-bordered rounded-xl focus:input-primary text-sm"
                        placeholder="Ex: 15.50"
                        required
                        onInput={(e: any) => {
                          const value = e.target.value;
                          const regex = /^(\d{0,2})(\.\d{0,2})?$/;
                          if (!regex.test(value)) {
                            e.target.value = value.slice(0, -1);
                          }
                        }}
                      />
                    </div>


                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex justify-end pt-6 border-t">
                  <button
                    type="submit"
                    className="btn btn-accent rounded-xl px-7 shadow-md hover:shadow-lg transition"
                  >
                    Modifier
                  </button>
                </div>

              </form>
            </div>
          </div>
        </>
      ) : null}

    </div>
  );
}
