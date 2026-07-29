"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify"; // notifications
import Swal from "sweetalert2"; // alertes confirm
import Select from "react-select"; // dropdowns
import {
  Edit,
  FileDown,
  FileUp,
  LucideTrash2,
  Plus,
  Trash,
} from "lucide-react"; // icônes
import { useSession } from "next-auth/react"; // session user
import jsPDF from "jspdf"; // génération PDF
import html2canvas from "html2canvas-pro"; // capture HTML pour PDF
import * as XLSX from "xlsx"; // lecture et écriture Excel
import { saveAs } from "file-saver"; // sauvegarde fichiers
import { Inbox } from "lucide-react";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

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
import EmptyStates from "@/app/components/EmptyStates";

// ================= TYPES =================
// export interface SelectOption {
//   value: number;
//   label: string;
// }

type SelectOption = { value: number; label: string };

interface FiltreFiliereProps {
  filieres: { id: number; nom: string }[];
}

export default function NotesClient() {
  const { data: authSession } = useSession();

  const [notes, setNotes] = useState<any[]>([]);
  const [etudiants, setEtudiants] = useState<any[]>([]);
  const [formKey, setFormKey] = useState(0);

  const [sessions, setSessions] = useState<string[]>([]);
  const [filieres, setFilieres] = useState<string[]>([]);

  const [filterSession, setFilterSession] = useState<SelectOption | null>(null);
  const [filterFiliere, setFilterFiliere] = useState<SelectOption | null>(null);

  const [popupReleveOpen, setPopupReleveOpen] = useState(false);
  const [selectedReleve, setSelectedReleve] = useState<any>(null);

  const [dateDebutSession, setDateDebutSession] = useState("");
  const [dateFinSession, setDateFinSession] = useState("");
  const [popupDeliberationOpen, setPopupDeliberationOpen] = useState(false);

  const [filterEtudiant, setFilterEtudiant] = useState<SelectOption | null>(
    null,
  );

  const [descriptionBrevet, setDescriptionBrevet] = useState("");
  const [popupReleveFiliereOpen, setPopupReleveFiliereOpen] = useState(false);

  const [isClient, setIsClient] = useState(false);
  const [selectedBrevet, setSelectedBrevet] = useState<any>(null);

  const [selectedSessionBrevet, setSelectedSessionBrevet] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupBrevetOpen, setPopupBrevetOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);

  const [popupBrevetFiliereOpen, setPopupBrevetFiliereOpen] = useState(false);

  const [selectedFiliereBrevet, setSelectedFiliereBrevet] = useState<any>(null);

  const [dateDebutBrevet, setDateDebutBrevet] = useState("");
  const [dateFinBrevet, setDateFinBrevet] = useState("");

  const [selectedEtudiant, setSelectedEtudiant] = useState<SelectOption | null>(
    null,
  );
  const [selectedSession, setSelectedSession] = useState<SelectOption | null>(
    null,
  );
  const [selectedFiliere, setSelectedFiliere] = useState<SelectOption | null>(
    null,
  );

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    setIsClient(true); // On ne rend Select qu'après le montage client
  }, []);

  // =====================
  // LOAD DATA
  // =====================
  useEffect(() => {
    async function load() {
      const notesData = await getNotes();

      setNotes(notesData);
      setEtudiants(await getEtudiants());

      setSessions([
        ...new Set(
          notesData
            .map((n) => n.etudiant?.session)
            .filter((s): s is string => Boolean(s)),
        ),
      ]);

      setFilieres([
        ...new Set(
          notesData
            .map((n) => n.etudiant?.filiere)
            .filter((f): f is string => Boolean(f)),
        ),
      ]);
    }

    load();
  }, []);

  useEffect(() => {
    if (!selectedNote) setEditPopupOpen(false);
  }, [selectedNote]);

  // =====================
  // OPTIONS
  // =====================
  const etudiantOptions = etudiants.map((e) => ({
    value: e.id,
    label: `${e.nom} ${e.postnom} ${e.prenom} - ${e.session} - ${e.filiere}`,
  }));

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
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

    pdf.text(`Année académique : ${filterAnnee?.label || ""}`, 14, 20);

    pdf.text(`Session : ${filterSession?.label || ""}`, pageWidth - 60, 20);

    pdf.line(10, 30, pageWidth - 10, 30);
  };

  const handleExportDeliberationPDF = async () => {
    if (!selectedFiliereBrevet) {
      return toast.info("Veuillez sélectionner une filière");
    }

    if (!selectedSessionBrevet) {
      return toast.info("Veuillez sélectionner une session");
    }

    if (!dateDebutBrevet || !dateFinBrevet) {
      return toast.info("Veuillez renseigner la période");
    }

    const filiere = selectedFiliereBrevet.label;
    const session = selectedSessionBrevet.label;

    const periode = `${dateDebutBrevet} au ${dateFinBrevet}`;

    try {
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 12;

      // ===============================
      // LOGO
      // ===============================

      const logo = new Image();

      logo.src = "/logo-leon.png";

      await new Promise((resolve) => {
        logo.onload = resolve;
      });

      // ===============================
      // FILIGRANE
      // ===============================

      const drawWatermark = () => {
        pdf.saveGraphicsState();

        pdf.setGState(
          new pdf.GState({
            opacity: 0.05,
          }),
        );

        pdf.addImage(
          logo,
          "PNG",
          pageWidth / 2 - 50,
          pageHeight / 2 - 50,
          100,
          100,
        );

        pdf.restoreGraphicsState();
      };

      // ===============================
      // ENTETE
      // ===============================

      const drawHeader = () => {
        pdf.addImage(logo, "PNG", pageWidth / 2 - 13, 8, 26, 26);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(15, 118, 110);

        pdf.text(
          "CENTRE DE FORMATION PROFESSIONNELLE ET MÉTIERS",
          pageWidth / 2,
          39,
          {
            align: "center",
          },
        );

        pdf.setFontSize(18);
        pdf.setTextColor(29, 78, 216);

        pdf.text("« LEON ACADEMY »", pageWidth / 2, 48, {
          align: "center",
        });

        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);

        pdf.text(
          "N°028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023",
          pageWidth / 2,
          56,
          {
            align: "center",
          },
        );

        pdf.setDrawColor(15, 118, 110);
        pdf.setLineWidth(0.8);

        pdf.line(margin, 65, pageWidth - margin, 65);

        pdf.setFontSize(16);
        pdf.setTextColor(15, 118, 110);

        pdf.text("GRILLE DE DÉLIBÉRATION", pageWidth / 2, 76, {
          align: "center",
        });

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");

        pdf.text(`Filière : ${filiere}`, margin, 87);

        pdf.text(`Session : ${session}`, pageWidth / 2, 87, {
          align: "center",
        });

        pdf.text(`Période : ${periode}`, pageWidth - margin, 87, {
          align: "right",
        });
      };

      // ===============================
      // FOOTER
      // ===============================

      const drawFooter = (page: number, total: number) => {
        pdf.setFontSize(9);
        pdf.setTextColor(90);

        pdf.text(
          `Imprimé le : ${new Date().toLocaleDateString("fr-FR")}`,
          margin,
          pageHeight - 10,
        );

        pdf.text(`Page ${page} / ${total}`, pageWidth / 2, pageHeight - 10, {
          align: "center",
        });

        if (page === total) {
          pdf.line(
            pageWidth - 75,
            pageHeight - 30,
            pageWidth - 20,
            pageHeight - 30,
          );

          pdf.text("Directeur", pageWidth - 47, pageHeight - 24, {
            align: "center",
          });
        }
      };

      // ===============================
      // EXTRACTION DES DONNEES FILTREES
      // ===============================

      const body: any[] = [];

      const apprenants = notes.filter((n: any) => {
        const matchFiliere = n.etudiant?.filiere === filiere;

        const matchSession = n.session === session;

        return matchFiliere && matchSession;
      });

      if (!apprenants.length) {
        return toast.info("Aucun apprenant trouvé pour cette filière.");
      }

      apprenants.forEach((note: any, index: number) => {
        const etudiant = note.etudiant;

        const nomComplet = [etudiant?.nom, etudiant?.postnom, etudiant?.prenom]
          .filter(Boolean)
          .join(" ");

        const total =
          Number(note.noteTheorique ?? 0) +
          Number(note.notePratique ?? 0) +
          Number(note.noteJyry ?? 0);

        const mention = calculateMentionFromAverage(total);

        body.push([
          index + 1, // N°
          etudiant?.matricule ?? "", // Matricule
          nomComplet, // Étudiant
          note.noteTheorique ?? 0, // Théorie
          note.notePratique ?? 0, // Pratique
          note.noteJyry ?? 0, // Jury
          total.toFixed(2), // Total
          mention, // Mention
        ]);
      });

      /*
       Ancien tableau supposé :
       Nom | Matricule | Théorique | Pratique | Jury | Total | Mention

       Nouveau PDF :
       N° | Matricule | Étudiant | Théorique | Pratique | Jury | Total | Mention
    */

      // ===============================
      // TABLEAU
      // ===============================

      autoTable(pdf, {
        startY: 100,

        head: [
          [
            "N°",
            "Matricule",
            "Étudiant",
            "Théorique",
            "Pratique",
            "Jury",
            "Total",
            "Mention",
          ],
        ],

        body,

        margin: {
          top: 95,
          left: margin,
          right: margin,
          bottom: 20,
        },

        theme: "grid",

        styles: {
          fontSize: 8,

          cellPadding: 3,

          valign: "middle",

          halign: "center",

          lineColor: [200, 200, 200],

          lineWidth: 0.2,
        },

        headStyles: {
          fillColor: [15, 118, 110],

          textColor: 255,

          fontStyle: "bold",

          halign: "center",
        },

        alternateRowStyles: {
          fillColor: [245, 250, 250],
        },

        columnStyles: {
          0: {
            cellWidth: 10,
          },

          1: {
            cellWidth: 25,
          },

          // ETUDIANT LARGE
          2: {
            cellWidth: 55,
            halign: "left",
            fontStyle: "bold",
          },

          3: {
            cellWidth: 18,
          },

          4: {
            cellWidth: 18,
          },

          5: {
            cellWidth: 15,
          },

          6: {
            cellWidth: 18,
            fontStyle: "bold",
          },

          7: {
            cellWidth: 25,
            fontStyle: "bold",
          },
        },

        didDrawPage: () => {
          drawHeader();
        },
      });

      // ===============================
      // FINALISATION PAGES
      // ===============================

      const totalPages = pdf.getNumberOfPages();

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);

        drawWatermark();

        drawFooter(i, totalPages);
      }

      pdf.save(`Grille_Deliberation_${filiere}_${session}.pdf`);
    } catch (error) {
      console.error(error);

      toast.error("Erreur lors de la génération PDF");
    }
  };
  const sessionOptions = [
    ...new Set(
      notes
        .map((n) => n.session)
        .filter((session): session is string => !!session),
    ),
  ].map((session) => ({
    value: session,
    label: session,
  }));

  const filiereOptions = [
    ...new Set(
      etudiants
        .map((e) => e.filiere)
        .filter((filiere): filiere is string => !!filiere),
    ),
  ].map((filiere) => ({
    value: filiere,
    label: filiere,
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
  const filteredNotes = notes.filter((n) => {
    return (
      (!filterEtudiant || n.etudiant?.id === filterEtudiant.value) &&
      (!filterSession || n.etudiant?.session === filterSession.value) &&
      (!filterFiliere || n.etudiant?.filiere === filterFiliere.value) &&
      (!search ||
        `${n.etudiant?.nom} ${n.etudiant?.postnom} ${n.etudiant?.prenom}`
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });

  const moyenneGenerale = filteredNotes.length
    ? filteredNotes.reduce(
        (acc, n) =>
          acc + Number(n.noteTheorique + n.notePratique + n.noteJyry || 0),
        0,
      ) / filteredNotes.length
    : 0;

  const moyennePourcentage = (moyenneGenerale / 100) * 100;

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);

  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // =====================
  // EXPORT EXCEL
  // =====================
  const handleExportExcel = () => {
    if (!filteredNotes.length) {
      return toast.info("Aucune note à exporter");
    }

    const dataNotes = filteredNotes.map((n) => ({
      Etudiant: n.etudiant
        ? `${n.etudiant.nom} ${n.etudiant.postnom} ${n.etudiant.prenom}`
        : "Étudiant supprimé",

      Notes_Th: n.noteTheorique ?? 0,
      Notes_Pr: n.notePratique ?? 0,
      Notes_Jury: n.noteJyry ?? 0,

      Session: n.etudiant?.session ?? "N/A",

      Filiere: n.etudiant?.filiere ?? "N/A",
    }));

    const moyenne =
      filteredNotes.reduce(
        (acc, n) =>
          acc +
          ((n.noteTheorique ?? 0) + (n.notePratique ?? 0) + (n.noteJyry ?? 0)),
        0,
      ) / filteredNotes.length;

    const mention = calculateMentionFromAverage(moyenne);

    const dataResume = [
      {
        Clé: "Nombre de notes",
        Valeur: filteredNotes.length,
      },
      {
        Clé: "Moyenne générale",
        Valeur: moyenne.toFixed(2),
      },
      {
        Clé: "Mention globale",
        Valeur: mention,
      },
    ];

    const workbook = XLSX.utils.book_new();

    const wsNotes = XLSX.utils.json_to_sheet(dataNotes);
    XLSX.utils.book_append_sheet(workbook, wsNotes, "Notes");

    const wsResume = XLSX.utils.json_to_sheet(dataResume);
    XLSX.utils.book_append_sheet(workbook, wsResume, "Résumé");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

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

      const requiredCols = ["Etudiant", "Notes_Jury"];

      const missingCols = requiredCols.filter(
        (col) => !Object.keys(json[0]).includes(col),
      );

      if (missingCols.length) {
        return toast.error(`Colonnes manquantes : ${missingCols.join(", ")}`);
      }

      const promises = json.map(async (row: any, index: number) => {
        const etudiantNom = row.Etudiant?.toString().trim();
        const noteJyry = Number(row.Notes_Jury);

        if (!etudiantNom || isNaN(noteJyry)) {
          throw new Error(`Ligne ${index + 2} : données invalides`);
        }

        // Recherche étudiant
        const etudiant = etudiants.find(
          (e) => `${e.nom} ${e.postnom} ${e.prenom}` === etudiantNom,
        );

        if (!etudiant) {
          throw new Error(`Ligne ${index + 2} : étudiant introuvable`);
        }

        // Vérification session/filière de l'étudiant
        if (!etudiant.session || !etudiant.filiere) {
          throw new Error(
            `Ligne ${index + 2} : session ou filière absente pour ${etudiantNom}`,
          );
        }

        const formData = new FormData();

        formData.append("noteJyry", String(noteJyry));

        formData.append("etudiantId", String(etudiant.id));

        formData.append("createdById", String(authSession?.user?.id || ""));

        return addNote(formData);
      });

      const createdNotes = await Promise.all(promises);

      setNotes((prev) => [...createdNotes, ...prev]);

      toast.success("Importation terminée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur d'importation");
    } finally {
      e.target.value = "";
    }
  };

  const handleDownloadReleve = async (
    note: any,
    dateDebutSession: string,
    dateFinSession: string,
  ) => {
    const BREVE_CODE_OFFICIEL =
      "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

    if (!note?.etudiant?.id) {
      return toast.error("Étudiant introuvable");
    }

    const { notes: releveNotes } = await getReleve(note.etudiant.id);

    if (!releveNotes?.length) {
      return toast.info("Aucune note trouvée");
    }

    const first = releveNotes[0];

    if (!first?.etudiant) {
      return toast.error("Données étudiant manquantes");
    }

    const etudiant = first.etudiant;

    // Calcul identique au tableau
    const total =
      Number(note.noteTheorique ?? 0) +
      Number(note.notePratique ?? 0) +
      Number(note.noteJyry ?? 0);

    const pourcentage = Number(total.toFixed(2));

    const mention = calculateMentionFromAverage(pourcentage);

    const sessionAffichee =
      dateDebutSession && dateFinSession
        ? `${dateDebutSession} - ${dateFinSession}`
        : "N/A";

    const releveHtml = `
  <div style="
    width:100%;
    height:100%;
    padding:18mm;
    font-family:'Times New Roman', serif;
    background:#ffffff;
    box-sizing:border-box;
  ">

    <!-- HEADER -->
    <div style="
      text-align:center;
      border-bottom:4px solid #1f5e3b;
      padding-bottom:12px;
    ">

      <h2 style="margin:0;font-size:20px;">
        CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
      </h2>

      <p style="
        margin:2px 0;
        font-weight:bold;
        font-size:18px;
        color:#1f5e3b;
      ">
        « LEON ACADEMY »
      </p>

      <img src="/logo-leon.png"
        style="width:90px;margin:8px auto;"
      />

      <p style="
        font-size:11px;
        font-weight:bold;
      ">
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



    <!-- INFORMATIONS -->
    <div style="
      margin-bottom:25px;
      font-size:14px;
      line-height:1.6;
      padding:15px;
      background:#f9f9f9;
      border-left:5px solid #1f5e3b;
    ">

      <p>
        <strong>Étudiant :</strong>
        ${etudiant.nom ?? ""}
        ${etudiant.postnom ?? ""}
        ${etudiant.prenom ?? ""}
      </p>


      <p>
        <strong>Matricule :</strong>
        ${etudiant.matricule ?? "N/A"}
      </p>


      <p>
        <strong>Filière :</strong>
        ${note.filiere ?? etudiant.filiere ?? "N/A"}
      </p>


      <p>
        <strong>Session :</strong>
        ${sessionAffichee}
      </p>

    </div>



    <!-- TABLE NOTES -->
    <table style="
      width:100%;
      border-collapse:collapse;
      font-size:14px;
    ">

      <thead>

        <tr style="
          background:#1f5e3b;
          color:white;
        ">

          <th style="
            padding:10px;
            border:1px solid #ddd;
            text-align:left;
          ">
            Rubriques
          </th>


          <th style="
            padding:10px;
            border:1px solid #ddd;
            text-align:center;
          ">
            Cotations
          </th>

        </tr>

      </thead>



      <tbody>


        <tr>

          <td style="
            padding:10px;
            border:1px solid #ddd;
          ">
            Évaluation Théorique / 20
          </td>


          <td style="
            padding:10px;
            border:1px solid #ddd;
            text-align:center;
            font-weight:bold;
          ">
            ${note.noteTheorique ?? 0}
          </td>

        </tr>



        <tr>

          <td style="
            padding:10px;
            border:1px solid #ddd;
          ">
            Évaluation Pratique / 50
          </td>


          <td style="
            padding:10px;
            border:1px solid #ddd;
            text-align:center;
            font-weight:bold;
          ">
            ${note.notePratique ?? 0}
          </td>

        </tr>
        <tr>

          <td style="
            padding:10px;
            border:1px solid #ddd;
          ">
            Évaluation Jury / 30
          </td>


          <td style="
            padding:10px;
            border:1px solid #ddd;
            text-align:center;
            font-weight:bold;
          ">
            ${note.noteJyry ?? 0}
          </td>

        </tr>


      </tbody>

    </table>




    <!-- RESULTAT -->

    <div style="
      margin-top:30px;
      padding:15px;
      background:#eef3f0;
      border:2px solid #1f5e3b;
      font-size:15px;
    ">


      <p>
        <strong>Pourcentage :</strong>
        ${pourcentage.toFixed(2)} %
      </p>



      <p>

        <strong>Mention :</strong>

        <span style="
          color:#1f5e3b;
          font-weight:bold;
          font-size:16px;
        ">

          ${mention}

        </span>

      </p>


    </div>




    <!-- SIGNATURE -->

    <div style="
      text-align:right;
      margin-top:60px;
      font-size:14px;
    ">


      Fait à Kinshasa, le ${new Date().toLocaleDateString()}



      <div style="
        margin-top:50px;
      ">


        <div style="
          border-top:1px solid #000;
          width:200px;
          margin-left:auto;
        "></div>



        <strong style="
          display:block;
          text-align:center;
          width:200px;
          margin-left:auto;
        ">
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
      pdf.internal.pageSize.getHeight(),
    );

    pdf.save("releve-notes.pdf");

    document.body.removeChild(container);
  };

  const handleDownloadRelevesFiliere = async () => {
    if (!selectedFiliereBrevet) {
      return toast.error("Sélectionnez une filière");
    }

    if (!selectedSessionBrevet) {
      return toast.error("Sélectionnez une session");
    }

    if (!dateDebutBrevet || !dateFinBrevet) {
      return toast.error("Veuillez renseigner la période");
    }

    const filiere = selectedFiliereBrevet.label;
    const session = selectedSessionBrevet.label;

    // Filtrer les étudiants
    const apprenants = notes.filter((n: any) => {
      const matchFiliere = n.etudiant?.filiere === filiere;

      const matchSession = n.session === session;

      return matchFiliere && matchSession;
    });

    if (!apprenants.length) {
      return toast.info("Aucun apprenant trouvé.");
    }

    const BREVE_CODE_OFFICIEL =
      "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < apprenants.length; i++) {
      const note = apprenants[i];

      const { notes: releveNotes } = await getReleve(note.etudiant.id);

      if (!releveNotes?.length) continue;

      const first = releveNotes[0];

      const etudiant = first.etudiant;

      const total =
        Number(note.noteTheorique ?? 0) +
        Number(note.notePratique ?? 0) +
        Number(note.noteJyry ?? 0);

      const pourcentage = Number(total.toFixed(2));

      const mention = calculateMentionFromAverage(pourcentage);

      const sessionAffichee = `${dateDebutBrevet} - ${dateFinBrevet}`;

      const releveHtml = `

<div style="
width:100%;
height:100%;
padding:18mm;
font-family:'Times New Roman',serif;
background:white;
box-sizing:border-box;
">


<div style="
text-align:center;
border-bottom:4px solid #1f5e3b;
padding-bottom:12px;
">


<h2 style="margin:0;font-size:20px;">
CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
</h2>


<p style="
margin:2px 0;
font-weight:bold;
font-size:18px;
color:#1f5e3b;
">
« LEON ACADEMY »
</p>


<img src="/logo-leon.png"
style="width:90px;margin:8px auto;"
/>


<p style="
font-size:11px;
font-weight:bold;
">
${BREVE_CODE_OFFICIEL}
</p>


</div>



<div style="
margin:22px auto;
text-align:center;
font-weight:bold;
font-size:20px;
background:#c9a64d;
padding:10px 25px;
width:fit-content;
">
RELEVÉ DE NOTES
</div>





<div style="
margin-bottom:25px;
font-size:14px;
line-height:1.6;
padding:15px;
background:#f9f9f9;
border-left:5px solid #1f5e3b;
">


<p>
<strong>Étudiant :</strong>
${etudiant.nom ?? ""}
${etudiant.postnom ?? ""}
${etudiant.prenom ?? ""}
</p>


<p>
<strong>Matricule :</strong>
${etudiant.matricule ?? "N/A"}
</p>


<p>
<strong>Filière :</strong>
${filiere}
</p>


<p>
<strong>Session :</strong>
${sessionAffichee}
</p>


</div>




<table style="
width:100%;
border-collapse:collapse;
font-size:14px;
">


<thead>

<tr style="
background:#1f5e3b;
color:white;
">

<th style="
padding:10px;
border:1px solid #ddd;
">
Rubriques
</th>


<th style="
padding:10px;
border:1px solid #ddd;
">
Cotations
</th>

</tr>

</thead>




<tbody>


<tr>
<td style="
padding:10px;
border:1px solid #ddd;
">
Évaluation Théorique /20
</td>


<td style="
padding:10px;
border:1px solid #ddd;
text-align:center;
font-weight:bold;
">
${note.noteTheorique ?? 0}
</td>

</tr>




<tr>

<td style="
padding:10px;
border:1px solid #ddd;
">
Évaluation Pratique /50
</td>


<td style="
padding:10px;
border:1px solid #ddd;
text-align:center;
font-weight:bold;
">
${note.notePratique ?? 0}
</td>

</tr>




<tr>

<td style="
padding:10px;
border:1px solid #ddd;
">
Évaluation Jury /30
</td>


<td style="
padding:10px;
border:1px solid #ddd;
text-align:center;
font-weight:bold;
">
${note.noteJyry ?? 0}
</td>

</tr>



</tbody>

</table>





<div style="
margin-top:30px;
padding:15px;
background:#eef3f0;
border:2px solid #1f5e3b;
">


<p>
<strong>Pourcentage :</strong>
${pourcentage.toFixed(2)} %
</p>



<p>
<strong>Mention :</strong>

<span style="
color:#1f5e3b;
font-weight:bold;
font-size:16px;
">
${mention}
</span>

</p>


</div>





<div style="
text-align:right;
margin-top:60px;
">


Fait à Kinshasa, le
${new Date().toLocaleDateString("fr-FR")}



<div style="margin-top:50px;">


<div style="
border-top:1px solid #000;
width:200px;
margin-left:auto;
"></div>



<strong style="
display:block;
width:200px;
text-align:center;
margin-left:auto;
">
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

      const imgData = canvas.toDataURL("image/jpeg", 0.85);

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        imgData,
        "JPEG",
        0,
        0,
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight(),
      );

      document.body.removeChild(container);
    }

    pdf.save(`releves-${filiere}-${session}.pdf`);

    setPopupReleveFiliereOpen(false);
  };

  // =====================
  // ADD NOTE
  // =====================
  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userId = authSession?.user?.id;

    if (!userId) {
      toast.error("Session expirée");
      return;
    }

    if (!selectedEtudiant) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    // Vérification doublon
    const already = notes.find(
      (n) => n.etudiant?.id === selectedEtudiant.value,
    );

    if (already) {
      toast.error(
        "Doublon détecté : cet étudiant possède déjà une note pour cette session et cette filière.",
      );
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);

      // Champs obligatoires selon ton modèle Prisma
      formData.set("etudiantId", String(selectedEtudiant.value));

      formData.set("createdById", userId);

      // Note Jury uniquement (théorique/pratique calculées serveur)
      const juryValue = formData.get("noteJyry");

      formData.set("noteJyry", juryValue ? String(juryValue) : "0");

      // Ces valeurs ne viennent pas du formulaire
      formData.delete("noteTheorique");
      formData.delete("notePratique");

      const created = await addNote(formData);

      setNotes((prev) => [created, ...prev]);

      toast.success("Note ajoutée avec succès.");

      // Fermeture et nettoyage
      setPopupOpen(false);

      setSelectedEtudiant(null);
      setSelectedSession(null);
      setSelectedFiliere(null);
      setSelectedNote(null);

      e.currentTarget.reset();
    } catch (err: any) {
      console.error("Erreur ajout note :", err);

      toast.error(err?.message ?? "Erreur lors de l'ajout de la note.");
    }
  };
  // =====================
  // EDIT NOTE
  // =====================
  const openEditPopup = (note: any) => {
    setSelectedNote(note);

    // Étudiant
    if (note.etudiant) {
      setSelectedEtudiant({
        value: note.etudiant.id,
        label: `${note.etudiant.nom} ${note.etudiant.postnom} ${note.etudiant.prenom}`,
      });
    }

    // Session (String)
    if (note.session) {
      setSelectedSession({
        value: note.session,
        label: note.session,
      });
    }

    // Filière (String)
    if (note.filiere) {
      setSelectedFiliere({
        value: note.filiere,
        label: note.filiere,
      });
    }

    setEditPopupOpen(true);
  };

  const handleEditNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedNote) return;

    const userId = authSession?.user?.id;

    if (!userId) {
      toast.error("Session expirée");
      return;
    }

    if (!selectedEtudiant || !selectedSession || !selectedFiliere) {
      toast.error(
        "Veuillez sélectionner tous les champs (Étudiant / Année / Session / Filière)",
      );
      return;
    }

    // Vérification doublon
    const already = notes.find(
      (n) =>
        n.id !== selectedNote.id &&
        n.etudiant?.id === selectedEtudiant.value &&
        n.session === selectedSession.label &&
        n.filiere === selectedFiliere.label,
    );

    if (already) {
      toast.error(
        "Doublon détecté : cet étudiant possède déjà une note pour cette session et cette filière.",
      );
      return;
    }

    try {
      const formData = new FormData(e.currentTarget);

      // Suppression des champs calculés automatiquement
      formData.delete("noteTheorique");
      formData.delete("notePratique");

      // Valeurs selon ton modèle Prisma
      formData.set("id", String(selectedNote.id));

      formData.set("etudiantId", String(selectedEtudiant.value));

      formData.set("session", selectedSession.label);

      formData.set("filiere", selectedFiliere.label);

      formData.set("createdById", userId);

      const updated = await updateNote(formData);

      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));

      toast.success("Note modifiée avec recalcul automatique.");

      setEditPopupOpen(false);

      setSelectedNote(null);
      setSelectedEtudiant(null);
      setSelectedSession(null);
      setSelectedFiliere(null);
    } catch (err: any) {
      console.error("Erreur modification note :", err);

      toast.error(err?.message || "Erreur lors de la modification de la note");
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
    setNotes((prev) => prev.filter((n) => n.id !== id));
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

  //   const generateBrevetHtml = (
  //     note: any,
  //     etudiant: any,
  //     stats: any,
  //     dateDebutSession: string,
  //     dateFinSession: string,
  //     descriptionBrevet: string,
  //   ) => {
  //     const BREVE_CODE_OFFICIEL =
  //       "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

  //     const estHomme =
  //       etudiant.sexe?.toLowerCase() === "m" ||
  //       etudiant.sexe?.toLowerCase() === "masculin" ||
  //       etudiant.sexe?.toLowerCase() === "homme";

  //     const pronom = estHomme ? "Il" : "Elle";

  //     const formatPrenom = (prenom?: string | null) => {
  //       if (!prenom) return "";

  //       const value = prenom.trim();

  //       return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  //     };

  //     const pourcentage =
  //       Number(note.noteTheorique ?? 0) +
  //       Number(note.notePratique ?? 0) +
  //       Number(note.noteJyry ?? 0);

  //     const mention = calculateMentionFromAverage(pourcentage);

  //     const sessionAffichee = `${dateDebutSession} au ${dateFinSession}`;

  //     return `

  // <div style="
  // width:100%;
  // height:100%;
  // padding:20mm;
  // font-family:'Times New Roman', serif;
  // background:#f2f2f2;
  // position:relative;
  // box-sizing:border-box;
  // ">

  // <!-- FILIGRANE -->

  // <img
  // src="/format1.png"
  // style="
  // position:absolute;
  // top:57%;
  // left:15%;
  // transform:translate(-50%, -50%);
  // width:380px;
  // opacity:0.35;
  // z-index:0;
  // "
  // />

  // <div style="
  // position:relative;
  // z-index:1;
  // height:100%;
  // display:flex;
  // flex-direction:column;
  // justify-content:space-between;
  // ">

  // <!-- ================= HEADER ================= -->

  // <div style="
  // text-align:center;
  // line-height:1;
  // ">

  // <h2 style="
  // margin:0;
  // padding:0;
  // font-size:22px;
  // line-height:1.1;
  // ">
  // CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
  // </h2>

  // <p style="
  // margin:0;
  // padding:0;
  // font-weight:bold;
  // font-size:20px;
  // line-height:1.1;
  // color:#1f5e3b;
  // ">
  // « LEON ACADEMY »
  // </p>

  // <img
  // src="/logo-leon.png"
  // style="
  // width:140px;
  // height:auto;
  // display:block;
  // margin:0 auto;
  // padding:0;
  // "
  // />

  // <p style="
  // font-size:12px;
  // font-weight:bold;
  // margin:0;
  // padding:0;
  // line-height:1;
  // ">
  // ${BREVE_CODE_OFFICIEL}
  // </p>

  // </div>

  // <!-- ================= TITRE ================= -->

  // <div style="
  // background:#c9a64d;
  // padding:12px 25px;
  // margin:15px auto;
  // text-align:center;
  // font-weight:bold;
  // font-size:18px;
  // ">

  // ATTESTATION TENANT LIEU DE CERTIFICAT<br/>
  // D’APTITUDE PROFESSIONNELLE

  // </div>

  // <!-- ================= CONTENU ================= -->

  // <div style="
  // font-size:15px;
  // line-height:1.7;
  // text-align:justify;
  // ">

  // <p>
  // Nous soussignons la Direction du centre de formation professionnelle
  // et Métiers <strong>« Léon Academy »</strong>,
  // certifions que :
  // </p>

  // <p style="
  // text-align:center;
  // font-size:22px;
  // font-weight:bold;
  // color:#1f5e3b;
  // ">

  // ${etudiant.nom ?? ""}
  // ${etudiant.postnom ?? ""}
  // ${formatPrenom(etudiant.prenom)}

  // </p>

  // <p>

  // a suivi une formation professionnelle du

  // <strong>
  // ${sessionAffichee}
  // </strong>

  // en

  // <strong>
  // ${String(note.filiere).toUpperCase()}
  // </strong>. ${
  //   descriptionBrevet ||
  //   "Formation professionnelle sanctionnée par une attestation d'aptitude professionnelle."
  // }

  // </p>

  // <p>

  // ${pronom} a satisfait aux épreuves d’évaluation
  // avec la mention

  // <strong style="
  // color:#1f5e3b;
  // ">

  // ${mention}

  // </strong>

  // soit

  // <strong>
  // ${pourcentage.toFixed(0)} %
  // </strong>.

  // </p>

  // <p>
  // En foi de quoi, nous lui délivrons la présente attestation
  // pour servir et valoir ce que de droit.
  // </p>

  // </div>

  // <!-- ================= SIGNATURE ================= -->

  // <div style="
  // text-align:right;
  // font-size:14px;
  // ">

  // <p>
  // Fait à Kinshasa, le
  // ${new Date().toLocaleDateString("fr-FR")}
  // </p>

  // <div style="
  // margin-top:40px;
  // ">

  // <div style="
  // border-top:1px solid #000;
  // width:200px;
  // margin-left:auto;
  // ">
  // </div>

  // <strong style="
  // display:block;
  // text-align:center;
  // width:200px;
  // margin-left:auto;
  // ">
  // Le Directeur
  // </strong>

  // </div>

  // </div>

  // </div>

  // </div>

  // `;
  //   };

  const generateBrevetHtml = async (
    note: any,
    etudiant: any,
    stats: any,
    dateDebutSession: string,
    dateFinSession: string,
    descriptionBrevet: string,
  ) => {
    const BREVE_CODE_OFFICIEL =
      "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

    const estHomme =
      etudiant.sexe?.toLowerCase() === "m" ||
      etudiant.sexe?.toLowerCase() === "masculin" ||
      etudiant.sexe?.toLowerCase() === "homme";

    const civilite = estHomme ? "Mr" : "Mme";

    const formatPrenom = (prenom?: string | null) => {
      if (!prenom) return "";
      const value = prenom.trim();
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    };

    const pourcentage =
      Number(note.noteTheorique ?? 0) +
      Number(note.notePratique ?? 0) +
      Number(note.noteJyry ?? 0);

    const mention = calculateMentionFromAverage(pourcentage);

    const anneeEnCours = new Date().getFullYear();

const numeroBrevet = `${String(etudiant.id)
  .replace(/-/g, "")
  .substring(0, 8)
  .toUpperCase()}`;
    // Exemple : 2026-483921
    

    const nomComplet = `
${etudiant.nom ?? ""}
${etudiant.postnom ?? ""}
${formatPrenom(etudiant.prenom)}
`
      .replace(/\s+/g, " ")
      .trim();

const qrData = `
N° Brevet : ${numeroBrevet}/${anneeEnCours}
Nom : ${nomComplet}
Filière : ${note?.filiere?? ""}
Mention : ${mention}
Pourcentage : ${pourcentage.toFixed(0)}%
`.trim();

const qrCodeBase64 = await QRCode.toDataURL(qrData, {
  color: {
    dark: "#0033CC",
    light: "#FFFFFF"
  }
});

    return `

<div
style="
width:1123px;
height:794px;
position:relative;
font-family:Arial,Helvetica,sans-serif;
background:url('/brevt.jpeg') center center no-repeat;
background-size:100% 100%;
overflow:hidden;
">

<!-- NOM -->

<div
style="
position:absolute;
left:350px;
top:420px;
width:830px;
font-size:22px;
font-weight:bold;
font-family: Arial, sans-serif;
">
${civilite}. ${nomComplet}
</div>

<!-- DATE DEBUT -->

<div
style="
position:absolute;
left:190px;
top:720px;
font-size:19px;
font-weight:bold;
font-family: Arial, sans-serif;
">
${dateDebutSession}
</div>

<!-- DATE FIN -->

<div
style="
position:absolute;
left:700px;
top:720px;
font-size:19px;
font-weight:bold;
font-family: Arial, sans-serif;
">
${dateFinSession}
</div>

<!-- NUMERO DU BREVET -->

<!-- NUMERO DU BREVET -->

<div
style="
position:absolute;
right:290px;
top:305px;
font-size:26px;
font-weight:normal;
font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
color:#FFFFFF;
text-transform:uppercase;
"
>
 ${numeroBrevet}
</div>

<!-- ANNEE -->

<div
style="
position:absolute;
right:125px;
top:305px;
font-size:26px;
font-weight:normal;
font-family:Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif;
color:#FFFFFF;
text-transform:uppercase;
"
>
 ${anneeEnCours}
</div>

<!-- FILIERE -->

<div
style="
position:absolute;
left:590px;
top:365px;
font-size:19px;
font-weight:bold;
">

</div>

<!-- DESCRIPTION -->

<div
style="
position:absolute;
left:50px;
top:450px;
width:955px;
font-size:17px;
line-height:1.5;
text-align:center;
font-family: Arial, sans-serif;
">
${descriptionBrevet ?? ""}
</div>

<!-- MENTION -->

<div
style="
position:absolute;
left:620px;
top:550px;
font-size:20px;
font-weight:bold;
">
${mention}
</div>

<!-- POURCENTAGE -->

<div
style="
position:absolute;
left:930px;
top:550px;
font-size:20px;
font-weight:bold;
">
${pourcentage.toFixed(0)} 
</div>

<!-- DATE -->

<div
style="
position:absolute;
right:130px;
top:630px;
font-size:20px;
font-weight:normal;
font-family: Arial, sans-serif;
">
Fait à Kinshasa le ${new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}
</div>

<!-- QR CODE -->



<!-- QR CODE + INFORMATIONS -->

<div
style="
position:absolute;
left:50%;
bottom:20px;
transform:translateX(-50%);
text-align:center;
font-family:Arial,sans-serif;

"
>

<img
src="${qrCodeBase64}"
style="
width:150px;
height:150px;

"
/>


</div>


`;
  };

//   const handleDownloadBrevet = async (
//     note: any,
//     dateDebutSession: string,
//     dateFinSession: string,
//     descriptionBrevet: string,
//   ) => {
//     const BREVE_CODE_OFFICIEL =
//       "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

//     try {
//       if (!note?.etudiant?.id) {
//         return toast.error(
//           "Impossible de générer le brevet (données manquantes)",
//         );
//       }

//       if (!dateDebutSession || !dateFinSession) {
//         return toast.error("Veuillez renseigner la période de formation");
//       }

//       const { notes: releveNotes } = await getReleve(
//         note.etudiant.id,
//         note.session,
//         note.filiere,
//       );

//       if (!releveNotes?.length) {
//         return toast.info("Aucune note trouvée");
//       }

//       const firstNote = releveNotes[0];

//       const etudiant = firstNote.etudiant;

//       if (!etudiant) {
//         return toast.error("Étudiant manquant");
//       }

//       const estHomme =
//         etudiant.sexe?.toLowerCase() === "m" ||
//         etudiant.sexe?.toLowerCase() === "masculin" ||
//         etudiant.sexe?.toLowerCase() === "homme";

//       const pronom = estHomme ? "Il" : "Elle";

//       const formatPrenom = (prenom?: string | null) => {
//         if (!prenom) return "";

//         const value = prenom.trim();

//         return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
//       };

//       const pourcentage =
//         Number(note.noteTheorique ?? 0) +
//         Number(note.notePratique ?? 0) +
//         Number(note.noteJyry ?? 0);

//       const mention = calculateMentionFromAverage(pourcentage);

//       const sessionAffichee = `${dateDebutSession} au ${dateFinSession}`;

//       const brevetHtml = `

// <div style="
// width:100%;
// height:100%;
// padding:20mm;
// font-family:'Times New Roman', serif;
// background:#f2f2f2;
// position:relative;
// box-sizing:border-box;
// ">


// <img
// src="/format1.png"
// style="
// position:absolute;
// top:57%;
// left:15%;
// transform:translate(-50%, -50%);
// width:380px;
// opacity:0.35;
// z-index:0;
// />


// <div style="
// position:relative;
// z-index:1;
// height:100%;
// display:flex;
// flex-direction:column;
// justify-content:space-between;
// ">



// <div style="text-align:center;">


// <h2 style="margin:0;font-size:22px;">
// CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
// </h2>


// <p style="
// margin:2px 0;
// font-weight:bold;
// font-size:20px;
// ">
// « LEON ACADEMY »
// </p>


// <img
// src="/logo-leon.png"
// style="width:110px;margin:8px auto;"
// />


// <p style="
// font-size:12px;
// font-weight:bold;
// ">
// ${BREVE_CODE_OFFICIEL}
// </p>


// </div>





// <div style="
// background:#c9a64d;
// padding:10px 20px;
// margin:15px auto;
// text-align:center;
// font-weight:bold;
// font-size:18px;
// ">

// ATTESTATION TENANT LIEU DE CERTIFICAT<br/>
// D’APTITUDE PROFESSIONNELLE

// </div>





// <div style="
// font-size:15px;
// line-height:1.7;
// text-align:justify;
// ">


// <p>
// Nous soussignons la Direction du centre de formation professionnelle
// et Métiers <strong>« Léon Academy »</strong>,
// certifions que :
// </p>



// <p style="
// text-align:center;
// font-size:22px;
// font-weight:bold;
// color:#1f5e3b;
// ">

// ${etudiant.nom ?? ""}
// ${etudiant.postnom ?? ""}
// ${formatPrenom(etudiant.prenom)}

// </p>





// <p>

// a suivi une formation professionnelle du

// <strong>
// ${sessionAffichee}
// </strong>

// en

// <strong>
// ${String(note.filiere).toUpperCase()}
// </strong>. ${descriptionBrevet || "Formation professionnelle qualifiante."}


// </p>


// ${pronom} a satisfait aux épreuves d’évaluation
// avec la mention

// <strong style="color:#1f5e3b;">
// ${mention}
// </strong>

// soit

// <strong>
// ${pourcentage.toFixed(0)} %
// </strong>.

// </p>




// <p>
// En foi de quoi, nous lui délivrons la présente attestation
// pour servir et valoir ce que de droit.
// </p>



// </div>





// <div style="
// text-align:right;
// font-size:14px;
// ">


// <div>
// Fait à Kinshasa, le ${new Date().toLocaleDateString("fr-FR")}
// </div>



// <div style="margin-top:40px;">


// <div style="
// border-top:1px solid #000;
// width:200px;
// margin-left:auto;
// ">
// </div>



// <strong style="
// display:block;
// text-align:center;
// width:200px;
// margin-left:auto;
// ">
// Le Directeur
// </strong>


// </div>


// </div>



// </div>


// </div>

// `;

//       const container = document.createElement("div");

//       container.style.width = "297mm";
//       container.style.height = "210mm";

//       container.innerHTML = brevetHtml;

//       document.body.appendChild(container);

//       const canvas = await html2canvas(container, {
//         scale: 2,
//         useCORS: true,
//       });

//       const imgData = canvas.toDataURL("image/png");

//       const pdf = new jsPDF("l", "mm", "a4");

//       pdf.addImage(
//         imgData,
//         "PNG",
//         0,
//         0,
//         pdf.internal.pageSize.getWidth(),
//         pdf.internal.pageSize.getHeight(),
//       );

//       pdf.save("brevet.pdf");

//       document.body.removeChild(container);
//     } catch (error: any) {
//       console.error(error);

//       toast.error(error?.message || "Erreur lors de la génération du brevet");
//     }
//   };

const handleDownloadBrevet = async (
  note: any,
  dateDebutSession: string,
  dateFinSession: string,
  descriptionBrevet: string,
) => {
  try {
    if (!note?.etudiant?.id) {
      return toast.error(
        "Impossible de générer le brevet (données manquantes)",
      );
    }

    if (!dateDebutSession || !dateFinSession) {
      return toast.error("Veuillez renseigner la période de formation");
    }

    const { notes: releveNotes } = await getReleve(
      note.etudiant.id,
      note.session,
      note.filiere,
    );

    if (!releveNotes?.length) {
      return toast.info("Aucune note trouvée");
    }

    const firstNote = releveNotes[0];

    const etudiant = firstNote?.etudiant;

    if (!etudiant) {
      return toast.error("Étudiant manquant");
    }

    const pourcentage =
      Number(note.noteTheorique ?? 0) +
      Number(note.notePratique ?? 0) +
      Number(note.noteJyry ?? 0);

    const mention = calculateMentionFromAverage(pourcentage);

    const anneeEnCours = new Date().getFullYear();

    const numeroBrevet = String(etudiant.id)
      .replace(/-/g, "")
      .substring(0, 8)
      .toUpperCase();

    // =========================
    // DONNÉES DU QR CODE
    // =========================

    const qrData = `
N° Brevet : ${numeroBrevet}/${anneeEnCours}

Nom : ${etudiant.nom ?? ""} ${etudiant.postnom ?? ""} ${
      etudiant.prenom ?? ""
    }

Filière : ${String(note.filiere ?? "").toUpperCase()}

Mention : ${mention}

Pourcentage : ${pourcentage.toFixed(0)}%
`.trim();

    const qrCodeBase64 = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 1,
      color: {
        dark: "#0033CC",
        light: "#FFFFFF",
      },
    });

    // =========================
    // GÉNÉRATION DU HTML
    // =========================

    const brevetHtml = await generateBrevetHtml(
      note,
      etudiant,
      {
        qrcode: qrCodeBase64,
        qrCode: qrCodeBase64,
      },
      dateDebutSession,
      dateFinSession,
      descriptionBrevet,
    );

    // =========================
    // CONTAINER
    // =========================

    const container = document.createElement("div");

    container.style.width = "1123px";
    container.style.height = "794px";
    container.style.position = "absolute";
    container.style.left = "-99999px";
    container.style.top = "0";
    container.style.margin = "0";
    container.style.padding = "0";

    container.innerHTML = brevetHtml;

    document.body.appendChild(container);

    // =========================
    // ATTENDRE LE CHARGEMENT
    // =========================

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Attendre les images
    const images = Array.from(
      container.querySelectorAll("img"),
    );

    await Promise.all(
      images.map((img) => {
        if (img.complete) {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }),
    );

    // =========================
    // HTML → CANVAS
    // =========================

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

    // =========================
    // CANVAS → IMAGE
    // =========================

    const imgData = canvas.toDataURL("image/png", 1.0);

    // =========================
    // CRÉATION PDF
    // =========================

    const pdf = new jsPDF(
      "l",
      "mm",
      "a4",
    );

    const pageWidth =
      pdf.internal.pageSize.getWidth();

    const pageHeight =
      pdf.internal.pageSize.getHeight();

    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      pageWidth,
      pageHeight,
    );

    // =========================
    // NOM DU FICHIER
    // =========================

    const nomFichier = [
      etudiant.nom,
      etudiant.postnom,
      etudiant.prenom,
    ]
      .filter(Boolean)
      .join("-")
      .replace(/\s+/g, "-");

    pdf.save(
      `Brevet-${nomFichier || "etudiant"}.pdf`,
    );

    // =========================
    // NETTOYAGE
    // =========================

    document.body.removeChild(container);

  } catch (error: any) {
    console.error(
      "Erreur génération brevet :",
      error,
    );

    toast.error(
      error?.message ||
        "Erreur lors de la génération du brevet",
    );
  }
};
  const handleDownloadBrevetFiliere = async () => {
    if (!selectedFiliereBrevet) {
      return toast.error("Sélectionnez une filière");
    }

    if (!dateDebutBrevet || !dateFinBrevet) {
      return toast.error("Veuillez renseigner la période");
    }

    const filiere = selectedFiliereBrevet.label;
    const session = selectedSessionBrevet?.label;

    const apprenants = notes.filter((n: any) => {
      const matchFiliere = n.etudiant?.filiere === filiere;
      const matchSession = session ? n.etudiant?.session === session : true;

      return matchFiliere && matchSession;
    });

    if (!apprenants.length) {
      return toast.info("Aucun apprenant trouvé dans cette filière");
    }

    const pdf = new jsPDF("l", "mm", "a4");

    for (let i = 0; i < apprenants.length; i++) {
      const note = apprenants[i];

      const { notes: releveNotes, stats } = await getReleve(
        note.etudiant.id,
        note.session,
        note.filiere,
      );

      if (!releveNotes.length) continue;

      const etudiant = releveNotes[0].etudiant;

      const html = await generateBrevetHtml(
        note,
        etudiant,
        stats,
        dateDebutBrevet,
        dateFinBrevet,
        descriptionBrevet,
      );

      const container = document.createElement("div");

      container.style.width = "297mm";
      container.style.height = "210mm";
      container.innerHTML = html;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
      });

      const img = canvas.toDataURL("image/png");

      if (i > 0) pdf.addPage();

      pdf.addImage(img, "PNG", 0, 0, 297, 210);

      document.body.removeChild(container);
    }

    pdf.save(`brevets-${filiere}.pdf`);

    setPopupBrevetFiliereOpen(false);
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

            <button
              className="btn btn-success rounded-xl gap-2"
              onClick={() => setPopupBrevetFiliereOpen(true)}
            >
              🎓 Imprimer brevets par filière et session
            </button>

            <button
              className="btn btn-success rounded-xl gap-2"
              onClick={() => setPopupReleveFiliereOpen(true)}
            >
              🎓 Imprimer relevés par filière et session
            </button>

            <button
              className="btn btn-info"
              onClick={() => setPopupDeliberationOpen(true)}
            >
              📊 Grille de délibération
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn btn-accent rounded-2xl flex items-center gap-2 px-6 shadow-md hover:shadow-lg transition"
              onClick={() => {
                setPopupOpen(true);
                setSelectedEtudiant(null);
                setSelectedSession(null);
                setSelectedFiliere(null);
                setFormKey((prev) => prev + 1); // <-- reset form
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

        <p className="text-sm">({filteredNotes.length} notes)</p>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-xl">
        <table ref={tableRef} className="table table-zebra">
          {/* HEADER */}
          <thead className="bg-gradient-to-r from-primary to-secondary text-primary-content">
            <tr>
              <th className="w-14 text-center">#</th>
              <th>Étudiant</th>
              <th className="text-center">Théorie</th>
              <th className="text-center">Pratique</th>
              <th className="text-center">Jury</th>
              <th className="text-center">Total</th>
              <th className="text-center">Mention</th>
              <th className="text-center">Session</th>
              <th className="text-center">Filière</th>
              <th className="text-center w-52">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedNotes.length ? (
              paginatedNotes.map((n, index) => {
                const total = n.noteTheorique + n.notePratique + n.noteJyry;

                const mention = calculateMentionFromAverage(total);

                return (
                  <tr
                    key={n.id}
                    className="hover:bg-primary/5 transition-all duration-200"
                  >
                    <td className="text-center font-bold text-primary">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>

                    <td>
                      {n.etudiant ? (
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="avatar placeholder">
                            <div className="bg-primary text-primary-content rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm">
                              {`${n.etudiant.nom?.charAt(0) ?? ""}${n.etudiant.postnom?.charAt(0) ?? ""}`.toUpperCase()}
                            </div>
                          </div>

                          {/* Informations */}
                          <div className="flex flex-col">
                            <span className="font-semibold leading-5">
                              {n.etudiant.nom} {n.etudiant.postnom}{" "}
                              {n.etudiant.prenom}
                            </span>

                            <span className="text-xs text-base-content/60">
                              Matricule : {n.etudiant.matricule}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-error">Étudiant supprimé</span>
                      )}
                    </td>

                    <td className="text-center">
                      <span className="badge badge-info badge-outline">
                        {n.noteTheorique}/20
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="badge badge-success badge-outline">
                        {n.notePratique}/50
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="badge badge-warning badge-outline">
                        {n.noteJyry}/30
                      </span>
                    </td>

                    <td className="text-center">
                      <div className="font-bold text-lg text-primary">
                        {total.toFixed(2)}%
                      </div>
                    </td>

                    <td className="text-center">
                      <span
                        className={`badge font-semibold
                    ${
                      mention === "Excellent"
                        ? "badge-success"
                        : mention === "Très bien"
                          ? "badge-info"
                          : mention === "Bien"
                            ? "badge-primary"
                            : mention === "Assez bien"
                              ? "badge-warning"
                              : "badge-error"
                    }
                  `}
                      >
                        {mention}
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="badge badge-neutral badge-outline">
                        {n.etudiant?.session ?? "-"}
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="badge badge-secondary">
                        {n.etudiant?.filiere ?? "-"}
                      </span>
                    </td>

                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          className="btn btn-sm btn-error btn-circle"
                          title="Supprimer"
                          onClick={() => handleDeleteNote(n.id)}
                        >
                          <LucideTrash2 size={16} />
                        </button>

                        <button
                          className="btn btn-sm btn-warning btn-circle"
                          title="Modifier"
                          onClick={() => openEditPopup(n)}
                        >
                          <Edit size={16} />
                        </button>

                        <button
                          className="btn btn-sm btn-success btn-circle"
                          title="Télécharger le brevet"
                          onClick={() => {
                            setSelectedBrevet(n);
                            setPopupBrevetOpen(true);
                          }}
                        >
                          🎓
                        </button>

                        <button
                          className="btn btn-sm btn-primary btn-circle"
                          title="Télécharger le relevé"
                          onClick={() => {
                            setSelectedReleve(n);
                            setDateDebutSession("");
                            setDateFinSession("");
                            setPopupReleveOpen(true);
                          }}
                        >
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="py-16">
                  <EmptyStates
                    IconComponent={"Inbox"}
                    message="Aucune note trouvée"
                    sm={true}
                  />
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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

      {popupBrevetOpen && (
        <div className="modal modal-open backdrop-blur-sm">
          <div
            className="
        modal-box
        max-w-2xl
        rounded-3xl
        shadow-2xl
        border
        border-base-200
        p-0
        overflow-hidden
      "
          >
            {/* ================= HEADER ================= */}
            <div
              className="
          bg-success
          text-success-content
          px-7
          py-5
        "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
              w-12
              h-12
              rounded-2xl
              bg-white/20
              flex
              items-center
              justify-center
              text-2xl
            "
                >
                  🎓
                </div>

                <div>
                  <h3 className="font-bold text-xl">Générer le brevet</h3>

                  <p className="text-sm opacity-80">
                    Informations de formation
                  </p>
                </div>
              </div>
            </div>

            {/* ================= BODY ================= */}
            <div className="px-7 py-6">
              {/* INFORMATION */}
              <div
                className="
            bg-base-200
            rounded-2xl
            p-4
            mb-6
          "
              >
                <p
                  className="
              text-sm
              text-base-content/70
              leading-relaxed
            "
                >
                  Renseignez la période et la description de la formation. Ces
                  informations seront imprimées automatiquement sur le brevet.
                </p>
              </div>

              <div className="space-y-6">
                {/* PERIODE */}
                <div className="w-full">
                  <label className="label">
                    <span className="label-text font-semibold">
                      📅 Période de formation
                    </span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DATE DEBUT */}
                    <div className="form-control w-full">
                      <span
                        className="
                    text-xs
                    text-base-content/60
                    mb-2
                  "
                      >
                        Chef d'entité
                      </span>

                      <input
                        type="text"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    w-full
                    focus:input-success
                  "
                        value={dateDebutSession}
                        onChange={(e) => setDateDebutSession(e.target.value)}
                      />
                    </div>

                    {/* DATE FIN */}
                    <div className="form-control w-full">
                      <span
                        className="
                    text-xs
                    text-base-content/60
                    mb-2
                  "
                      >
                        Directeur
                      </span>

                      <input
                        type="text"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    w-full
                    focus:input-success
                  "
                        value={dateFinSession}
                        onChange={(e) => setDateFinSession(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION FORMATION */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">
                      📝 Description de la formation
                    </span>
                  </label>

                  <textarea
                    className="
                textarea
                textarea-bordered
                rounded-2xl
                w-full
                min-h-40
                resize-none
                focus:textarea-success
              "
                    placeholder="
Exemple :
Formation professionnelle en informatique de gestion comprenant :
- Programmation
- Bases de données
- Administration système
- Réseaux informatiques
              "
                    value={descriptionBrevet}
                    onChange={(e) => setDescriptionBrevet(e.target.value)}
                  />

                  <span
                    className="
                text-xs
                text-base-content/60
                mt-2
              "
                  >
                    Cette description sera affichée après la filière sur le
                    brevet.
                  </span>
                </div>
              </div>
            </div>

            {/* ================= FOOTER ================= */}
            <div
              className="
          px-7
          py-5
          bg-base-200/50
          border-t
          flex
          justify-end
          gap-3
        "
            >
              <button
                className="
            btn
            btn-ghost
            rounded-2xl
            px-6
          "
                onClick={() => {
                  setPopupBrevetOpen(false);
                }}
              >
                Annuler
              </button>

              <button
                className="
            btn
            btn-success
            rounded-2xl
            px-7
            shadow-md
            hover:shadow-lg
            transition
            gap-2
          "
                onClick={() => {
                  if (!dateDebutSession || !dateFinSession) {
                    return toast.error("Veuillez renseigner les dates.");
                  }

                  if (!descriptionBrevet.trim()) {
                    return toast.error(
                      "Veuillez saisir la description de la formation.",
                    );
                  }

                  setPopupBrevetOpen(false);

                  handleDownloadBrevet(
                    selectedBrevet,

                    dateDebutSession,

                    dateFinSession,

                    descriptionBrevet,
                  );
                }}
              >
                🎓 Générer
              </button>
            </div>
          </div>
        </div>
      )}
      {popupReleveOpen && (
        <div className="modal modal-open backdrop-blur-sm">
          <div className="modal-box max-w-md rounded-3xl shadow-2xl p-0 overflow-hidden">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-primary to-success px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-3">📄</div>

                <div>
                  <h3 className="font-bold text-xl">Générer le relevé</h3>

                  <p className="text-sm text-white/80 mt-1">
                    Définissez la période de formation
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-6 py-6 space-y-5">
              <div className="bg-base-200 rounded-xl p-4 text-sm">
                <p className="flex items-center gap-2">
                  📅
                  <span>Veuillez entrer les dates exactes de la session.</span>
                </p>
              </div>

              {/* DATE DEBUT */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">
                    Date de début
                  </span>
                </label>

                <input
                  type="date"
                  className="
              input input-bordered
              rounded-xl
              focus:outline-primary
              w-full
            "
                  value={dateDebutSession}
                  onChange={(e) => setDateDebutSession(e.target.value)}
                />
              </div>

              {/* DATE FIN */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Date de fin</span>
                </label>

                <input
                  type="date"
                  className="
              input input-bordered
              rounded-xl
              focus:outline-primary
              w-full
            "
                  value={dateFinSession}
                  onChange={(e) => setDateFinSession(e.target.value)}
                />
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="
        flex justify-end gap-3
        px-6 py-5
        border-t
        bg-base-100
      "
            >
              <button
                className="
            btn btn-ghost
            rounded-xl
          "
                onClick={() => setPopupReleveOpen(false)}
              >
                Annuler
              </button>

              <button
                className="
            btn btn-primary
            rounded-xl
            px-6
            shadow-md
            hover:shadow-lg
          "
                onClick={() => {
                  if (!dateDebutSession || !dateFinSession) {
                    return toast.error("Veuillez renseigner les deux dates.");
                  }

                  setPopupReleveOpen(false);

                  handleDownloadReleve(
                    selectedReleve,
                    dateDebutSession,
                    dateFinSession,
                  );
                }}
              >
                📄 Générer le PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {editPopupOpen && selectedNote && (
        <>
          <input
            type="checkbox"
            className="modal-toggle"
            checked={editPopupOpen}
            readOnly
          />

          <div className="modal modal-middle">
            <div className="modal-box w-full max-w-lg p-0 rounded-3xl shadow-2xl overflow-hidden bg-base-100">
              {/* HEADER */}
              <div className="relative px-8 py-6 bg-gradient-to-r from-warning to-orange-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                    ✏️
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">Modifier une note</h2>

                    <p className="text-xs opacity-80 mt-1">
                      Modifier les informations de l'évaluation
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditPopupOpen(false);
                    setSelectedNote(null);
                  }}
                  className="absolute right-5 top-5 btn btn-sm btn-circle bg-white/20 border-none text-white hover:bg-white/30"
                >
                  ✕
                </button>
              </div>

              {/* FORMULAIRE */}
              <form onSubmit={handleEditNote} className="px-8 py-7 space-y-6">
                {/* ETUDIANT */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    👤 Étudiant
                  </label>

                  <Select
                    options={etudiantOptions}
                    value={selectedEtudiant}
                    onChange={setSelectedEtudiant}
                    placeholder="Sélectionner un étudiant..."
                    isClearable
                    className="text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "48px",
                        borderRadius: "14px",
                        borderColor: "#e5e7eb",
                        boxShadow: "none",
                      }),
                    }}
                  />
                </div>

                {/* NOTE JURY */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      ⭐ Note du Jury
                    </span>

                    <span className="badge badge-warning badge-outline">
                      /30
                    </span>
                  </label>

                  <input
                    name="noteJyry"
                    type="number"
                    step="0.01"
                    min="0"
                    max="30"
                    defaultValue={selectedNote.noteJyry}
                    className="
                input
                input-bordered
                w-full
                h-12
                rounded-2xl
                text-base
                focus:ring-2
                focus:ring-warning/40
              "
                    placeholder="Exemple : 25.50"
                    required
                    onInput={(e: React.FormEvent<HTMLInputElement>) => {
                      const input = e.currentTarget;

                      const regex = /^(\d{0,2})(\.\d{0,2})?$/;

                      if (!regex.test(input.value)) {
                        input.value = input.value.slice(0, -1);
                      }

                      if (Number(input.value) > 30) {
                        input.value = "30";
                      }
                    }}
                  />

                  <p className="text-xs text-base-content/50">
                    Valeur comprise entre 0 et 30 points.
                  </p>
                </div>

                {/* INFO */}
                <div className="rounded-2xl bg-warning/10 border border-warning/20 p-4 flex items-center gap-3">
                  <div className="text-2xl">ℹ️</div>

                  <div>
                    <p className="font-semibold text-sm">
                      Recalcul automatique
                    </p>

                    <p className="text-xs text-base-content/60">
                      Après modification, les notes théorique et pratique seront
                      recalculées automatiquement.
                    </p>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-3 pt-5 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setEditPopupOpen(false);
                      setSelectedNote(null);
                    }}
                    className="btn btn-ghost rounded-xl"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="btn btn-warning rounded-xl px-8 shadow-lg hover:shadow-xl transition"
                  >
                    💾 Modifier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {popupDeliberationOpen && (
        <div className="modal modal-open backdrop-blur-sm">
          <div
            className="
        modal-box
        max-w-lg
        rounded-3xl
        shadow-2xl
        border
        border-base-200
        p-0
        overflow-hidden
      "
          >
            {/* HEADER */}
            <div
              className="
          bg-info
          text-info-content
          px-7
          py-5
        "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
              w-12
              h-12
              rounded-2xl
              bg-white/20
              flex
              items-center
              justify-center
              text-2xl
            "
                >
                  📊
                </div>

                <div>
                  <h3 className="font-bold text-xl">
                    Impression grille de délibération
                  </h3>

                  <p className="text-sm opacity-80">
                    Génération par filière et session
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-7 py-6">
              <div
                className="
            bg-base-200
            rounded-2xl
            p-4
            mb-5
          "
              >
                <p
                  className="
              text-sm
              text-base-content/70
              leading-relaxed
            "
                >
                  Sélectionnez la filière, la session et la période de formation
                  pour générer la grille de délibération au format PDF.
                </p>
              </div>

              <div className="space-y-5">
                {/* SESSION */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">🗂️ Session</span>
                  </label>

                  <Select
                    options={sessionOptions}
                    value={selectedSessionBrevet}
                    onChange={setSelectedSessionBrevet}
                    placeholder="Choisir une session"
                    isClearable
                  />
                </div>

                {/* FILIERE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">📚 Filière</span>
                  </label>

                  <Select
                    options={filiereOptions}
                    value={selectedFiliereBrevet}
                    onChange={setSelectedFiliereBrevet}
                    placeholder="Choisir une filière"
                    isClearable
                  />
                </div>

                {/* PERIODE */}
                <div>
                  <label className="label mb-1">
                    <span className="label-text font-semibold">
                      📅 Période de formation
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    {/* DATE DEBUT */}
                    <div className="form-control">
                      <span className="text-xs text-base-content/60 mb-2">
                        Date début
                      </span>

                      <input
                        type="date"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    focus:input-info
                    transition
                  "
                        value={dateDebutBrevet}
                        onChange={(e) => setDateDebutBrevet(e.target.value)}
                      />
                    </div>

                    {/* DATE FIN */}
                    <div className="form-control">
                      <span className="text-xs text-base-content/60 mb-2">
                        Date fin
                      </span>

                      <input
                        type="date"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    focus:input-info
                    transition
                  "
                        value={dateFinBrevet}
                        onChange={(e) => setDateFinBrevet(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="
          px-7
          py-5
          bg-base-200/50
          border-t
          flex
          justify-end
          gap-3
        "
            >
              <button
                className="
            btn
            btn-ghost
            rounded-2xl
            px-6
          "
                onClick={() => setPopupDeliberationOpen(false)}
              >
                Annuler
              </button>

              <button
                className="
            btn
            btn-info
            rounded-2xl
            px-7
            shadow-md
            hover:shadow-lg
            transition
            gap-2
          "
                onClick={handleExportDeliberationPDF}
              >
                📊 Générer PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {popupBrevetFiliereOpen && (
        <div className="modal modal-open backdrop-blur-sm">
          <div
            className="
        modal-box
        max-w-2xl
        rounded-3xl
        shadow-2xl
        border
        border-base-200
        p-0
        overflow-hidden
      "
          >
            {/* ================= HEADER ================= */}
            <div
              className="
          bg-success
          text-success-content
          px-7
          py-5
        "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
              w-12
              h-12
              rounded-2xl
              bg-white/20
              flex
              items-center
              justify-center
              text-2xl
            "
                >
                  🎓
                </div>

                <div>
                  <h3 className="font-bold text-xl">Impression des brevets</h3>

                  <p className="text-sm opacity-80">
                    Génération en masse par filière
                  </p>
                </div>
              </div>
            </div>

            {/* ================= BODY ================= */}
            <div className="px-7 py-6">
              {/* INFORMATION */}
              <div
                className="
            bg-base-200
            rounded-2xl
            p-4
            mb-6
          "
              >
                <p
                  className="
              text-sm
              text-base-content/70
              leading-relaxed
            "
                >
                  Sélectionnez la session, la filière, la période de formation
                  et ajoutez la description qui sera affichée automatiquement
                  sur chaque brevet.
                </p>
              </div>

              <div className="space-y-6 w-full">
                {/* SESSION */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">🗂️ Session</span>
                  </label>

                  <Select
                    options={sessionOptions}
                    value={selectedSessionBrevet}
                    onChange={setSelectedSessionBrevet}
                    placeholder="Choisir une session"
                    isClearable
                  />
                </div>

                {/* FILIERE */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">📚 Filière</span>
                  </label>

                  <Select
                    options={filiereOptions}
                    value={selectedFiliereBrevet}
                    onChange={setSelectedFiliereBrevet}
                    placeholder="Choisir une filière"
                    isClearable
                  />
                </div>

                {/* PERIODE */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">
                      📅 Période de formation
                    </span>
                  </label>

                  <div
                    className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-4
              "
                  >
                    {/* DATE DEBUT */}
                    <div className="w-full">
                      <span
                        className="
                    text-xs
                    text-base-content/60
                    mb-2
                    block
                  "
                      >
                        Chef d'entité
                      </span>

                      <input
                        type="text"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    w-full
                    focus:input-success
                  "
                        value={dateDebutBrevet}
                        onChange={(e) => setDateDebutBrevet(e.target.value)}
                      />
                    </div>

                    {/* DATE FIN */}
                    <div className="w-full">
                      <span
                        className="
                    text-xs
                    text-base-content/60
                    mb-2
                    block
                  "
                      >
                        Directeur
                      </span>

                      <input
                        type="text"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    w-full
                    focus:input-success
                  "
                        value={dateFinBrevet}
                        onChange={(e) => setDateFinBrevet(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-semibold">
                      📝 Description de la formation
                    </span>
                  </label>

                  <textarea
                    className="
                textarea
                textarea-bordered
                rounded-2xl
                w-full
                min-h-40
                resize-none
                focus:textarea-success
              "
                    placeholder="
Exemple :
Formation professionnelle en informatique de gestion comprenant :
- Programmation
- Bases de données
- Administration système
- Réseaux informatiques
              "
                    value={descriptionBrevet}
                    onChange={(e) => setDescriptionBrevet(e.target.value)}
                  />

                  <span
                    className="
                text-xs
                text-base-content/60
                mt-2
              "
                  >
                    Cette description sera imprimée sur tous les brevets
                    générés.
                  </span>
                </div>
              </div>
            </div>

            {/* ================= FOOTER ================= */}
            <div
              className="
          px-7
          py-5
          bg-base-200/50
          border-t
          flex
          justify-end
          gap-3
        "
            >
              <button
                className="
            btn
            btn-ghost
            rounded-2xl
            px-6
          "
                onClick={() => setPopupBrevetFiliereOpen(false)}
              >
                Annuler
              </button>

              <button
                className="
            btn
            btn-success
            rounded-2xl
            px-7
            shadow-md
            hover:shadow-lg
            transition
            gap-2
          "
                onClick={handleDownloadBrevetFiliere}
              >
                🎓 Générer PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {popupReleveFiliereOpen && (
        <div className="modal modal-open backdrop-blur-sm">
          <div
            className="
        modal-box
        max-w-lg
        rounded-3xl
        shadow-2xl
        border
        border-base-200
        p-0
        overflow-hidden
      "
          >
            {/* HEADER */}
            <div
              className="
          bg-primary
          text-primary-content
          px-7
          py-5
        "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
              w-12
              h-12
              rounded-2xl
              bg-white/20
              flex
              items-center
              justify-center
              text-2xl
            "
                >
                  📄
                </div>

                <div>
                  <h3 className="font-bold text-xl">Impression des relevés</h3>

                  <p className="text-sm opacity-80">
                    Génération en masse par filière
                  </p>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="px-7 py-6">
              <div
                className="
            bg-base-200
            rounded-2xl
            p-4
            mb-5
          "
              >
                <p
                  className="
              text-sm
              text-base-content/70
              leading-relaxed
            "
                >
                  Sélectionnez la session, la filière et la période
                  d'évaluation. Tous les apprenants concernés auront leur relevé
                  de notes regroupé dans un seul fichier PDF.
                </p>
              </div>

              <div className="space-y-5">
                {/* SESSION */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">🗂️ Session</span>
                  </label>

                  <Select
                    options={sessionOptions}
                    value={selectedSessionBrevet}
                    onChange={setSelectedSessionBrevet}
                    placeholder="Choisir une session"
                    isClearable
                  />
                </div>

                {/* FILIERE */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">📚 Filière</span>
                  </label>

                  <Select
                    options={filiereOptions}
                    value={selectedFiliereBrevet}
                    onChange={setSelectedFiliereBrevet}
                    placeholder="Choisir une filière"
                    isClearable
                  />
                </div>

                {/* PERIODE */}
                <div>
                  <label className="label mb-1">
                    <span className="label-text font-semibold">
                      📅 Période de formation
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-control">
                      <span className="text-xs text-base-content/60 mb-2">
                        Date début
                      </span>

                      <input
                        type="date"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    focus:input-primary
                    transition
                  "
                        value={dateDebutBrevet}
                        onChange={(e) => setDateDebutBrevet(e.target.value)}
                      />
                    </div>

                    <div className="form-control">
                      <span className="text-xs text-base-content/60 mb-2">
                        Date fin
                      </span>

                      <input
                        type="date"
                        className="
                    input
                    input-bordered
                    rounded-2xl
                    focus:input-primary
                    transition
                  "
                        value={dateFinBrevet}
                        onChange={(e) => setDateFinBrevet(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="
          px-7
          py-5
          bg-base-200/50
          border-t
          flex
          justify-end
          gap-3
        "
            >
              <button
                className="
            btn
            btn-ghost
            rounded-2xl
            px-6
          "
                onClick={() => setPopupReleveFiliereOpen(false)}
              >
                Annuler
              </button>

              <button
                className="
            btn
            btn-primary
            rounded-2xl
            px-7
            shadow-md
            hover:shadow-lg
            transition
            gap-2
          "
                onClick={handleDownloadRelevesFiliere}
              >
                📄 Générer PDF
              </button>
            </div>
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
        <div className="modal-box w-full max-w-lg p-0 rounded-3xl shadow-2xl overflow-hidden bg-base-100">
          {/* HEADER */}
          <div className="relative px-8 py-6 bg-gradient-to-r from-primary to-secondary text-primary-content">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                📝
              </div>

              <div>
                <h2 className="text-xl font-bold">Ajouter une note</h2>

                <p className="text-xs opacity-80 mt-1">
                  Enregistrement de l'évaluation du jury
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              className="
          absolute right-5 top-5
          btn btn-sm btn-circle
          bg-white/20 border-none
          text-white
          hover:bg-white/30
        "
            >
              ✕
            </button>
          </div>

          {/* FORMULAIRE */}
          <form
            onSubmit={handleAddNote}
            className="px-8 py-7 space-y-6"
            key={formKey}
          >
            {/* ETUDIANT */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                👤 Étudiant
              </label>

              <Select
                options={etudiantOptions}
                value={selectedEtudiant}
                onChange={setSelectedEtudiant}
                placeholder="Choisir un étudiant..."
                isClearable
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: "48px",
                    borderRadius: "14px",
                    borderColor: "#e5e7eb",
                    boxShadow: "none",
                  }),
                }}
              />
            </div>

            {/* NOTE JURY */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">⭐ Note du Jury</span>

                <span className="badge badge-primary badge-outline">/30</span>
              </label>

              <input
                name="noteJyry"
                type="number"
                step="0.01"
                min="0"
                max="30"
                defaultValue="0"
                className="
            input input-bordered
            w-full
            rounded-2xl
            h-12
            text-base
            focus:outline-none
            focus:ring-2
            focus:ring-primary/40
          "
                placeholder="Exemple : 25.50"
                required
                onInput={(e: React.FormEvent<HTMLInputElement>) => {
                  const input = e.currentTarget;

                  const regex = /^(\d{0,2})(\.\d{0,2})?$/;

                  if (!regex.test(input.value)) {
                    input.value = input.value.slice(0, -1);
                  }

                  if (Number(input.value) > 30) {
                    input.value = "30";
                  }
                }}
              />

              <p className="text-xs text-base-content/50">
                La note doit être comprise entre 0 et 30 points.
              </p>
            </div>

            {/* RESUME */}
            <div
              className="
        rounded-2xl
        bg-base-200
        p-4
        flex
        items-center
        gap-3
      "
            >
              <div className="text-2xl">🎓</div>

              <div>
                <p className="text-sm font-semibold">Calcul automatique</p>

                <p className="text-xs text-base-content/60">
                  Les notes théorique et pratique seront générées
                  automatiquement.
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div
              className="
        flex
        justify-end
        gap-3
        pt-5
        border-t
      "
            >
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="
            btn
            btn-ghost
            rounded-xl
          "
              >
                Annuler
              </button>

              <button
                type="submit"
                className="
            btn
            btn-primary
            rounded-xl
            px-8
            shadow-lg
            hover:shadow-xl
            transition
          "
              >
                💾 Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
