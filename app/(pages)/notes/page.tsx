"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Select from "react-select";
import { FileDown, FileUp, LucideTrash2, Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


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
} from "@/app/actions/notesActions";

interface SelectOption {
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
    const percentage = (average / 20) * 100;
    if (percentage >= 80) return "Grande Distinction";
    if (percentage >= 70) return "Distinction";
    if (percentage >= 50) return "Satisfaction";
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
    ? filteredNotes.reduce((acc, n) => acc + Number(n.note || 0), 0) / filteredNotes.length
    : 0;

  const moyennePourcentage = (moyenneGenerale / 20) * 100;

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
      Matiere: n.matiere,
      Note: n.note,
      Annee: n.anneeAcademique?.annee ?? "N/A",
      Session:
        n.session?.dateDebut && n.session?.dateFin
          ? `${new Date(n.session.dateDebut).toLocaleDateString()} - ${new Date(n.session.dateFin).toLocaleDateString()}`
          : "N/A",
      Filiere: n.filiere?.nom ?? "N/A",
    }));

    const moyenne = filteredNotes.reduce((acc, n) => acc + Number(n.note || 0), 0) / filteredNotes.length;
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

  // =====================
  // ADD NOTE
  // =====================
  const handleAddNote = async (e: any) => {
    e.preventDefault();
    if (!authSession?.user?.id) return toast.error("Session expirée");

    const matiere = e.currentTarget.matiere.value.trim();

    const already = notes.find(n =>
      n.matiere.toLowerCase() === matiere.toLowerCase() &&
      n.etudiant?.id === selectedEtudiant?.value &&
      n.session?.id === selectedSession?.value &&
      n.filiere?.id === selectedFiliere?.value &&
      n.anneeAcademique?.id === selectedAnnee?.value
    );

    if (already) {
      return toast.error("Doublon détecté : cet étudiant a déjà une note pour cette matière, session et filière.");
    }

    const formData = new FormData(e.currentTarget);
    formData.append("etudiantId", String(selectedEtudiant?.value));
    formData.append("anneeAcademiqueId", String(selectedAnnee?.value));
    formData.append("sessionId", String(selectedSession?.value));
    formData.append("filiereId", String(selectedFiliere?.value));
    formData.append("createdById", authSession.user.id);

    try {
      const created = await addNote(formData);
      setNotes(prev => [created, ...prev]);
      toast.success("Note ajoutée");
      setPopupOpen(false);
      const resetForm = () => {
        setSelectedEtudiant(null);
        setSelectedAnnee(null);
        setSelectedSession(null);
        setSelectedFiliere(null);
        setSelectedNote(null)
      };
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
    if (!authSession?.user?.id) return toast.error("Session expirée");
    if (!selectedEtudiant || !selectedAnnee || !selectedSession || !selectedFiliere) {
      return toast.error("Veuillez sélectionner tous les champs (Étudiant / Année / Session / Filière)");
    }

    const matiere = e.currentTarget.matiere.value.trim();

    const already = notes.find(n =>
      n.id !== selectedNote.id &&
      n.matiere.toLowerCase() === matiere.toLowerCase() &&
      n.etudiant?.id === selectedEtudiant?.value &&
      n.session?.id === selectedSession?.value &&
      n.filiere?.id === selectedFiliere?.value &&
      n.anneeAcademique?.id === selectedAnnee?.value
    );

    if (already) {
      return toast.error("Doublon détecté : cet étudiant a déjà une note pour cette matière, session et filière.");
    }

    const formData = new FormData(e.currentTarget);
    formData.append("id", String(selectedNote.id));
    formData.append("etudiantId", String(selectedEtudiant.value));
    formData.append("anneeAcademiqueId", String(selectedAnnee.value));
    formData.append("sessionId", String(selectedSession.value));
    formData.append("filiereId", String(selectedFiliere.value));
    formData.append("createdById", authSession.user.id);

    try {
      const updated = await updateNote(formData);
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
      toast.success("Note modifiée");
      setEditPopupOpen(false);
      setSelectedNote(null);
      setSelectedEtudiant(null);
      setSelectedAnnee(null);
      setSelectedSession(null);
      setSelectedFiliere(null);
      setSelectedNote(null)
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

      {/* TOOLBAR */}
      {/* <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 w-full">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Étudiant</span>
            </label>
            <Select
              options={etudiantOptions}
              isClearable
              placeholder="Sélectionner"
              onChange={(opt) => {
                setFilterEtudiant(opt);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Année</span>
            </label>
            <Select
              options={anneeOptions}
              isClearable
              placeholder="Sélectionner"
              onChange={(opt) => {
                setFilterAnnee(opt);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Session</span>
            </label>
            <Select
              options={sessionOptions}
              isClearable
              placeholder="Sélectionner"
              onChange={(opt) => {
                setFilterSession(opt);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Filière</span>
            </label>
            <Select
              options={filiereOptions}
              isClearable
              placeholder="Sélectionner"
              onChange={(opt) => {
                setFilterFiliere(opt);
                setCurrentPage(1);
              }}
              className="w-full"
            />
          </div>

          <button
            className="btn btn-accent rounded-xl h-12"
            onClick={() => setPopupOpen(true)}
          >
            + Ajouter une note
          </button>

          <button
            className="btn btn-outline btn-primary rounded-xl h-12"
            onClick={handleExportExcel}
          >
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
            className="btn btn-outline btn-secondary rounded-xl h-12 cursor-pointer"
          >
            Import Excel
          </label>
        </div>
      </div> */}

      <div className="bg-base-100 p-8 rounded-3xl shadow-lg mb-8 space-y-8">

        {/* ================= TOP : ACTION BUTTONS ================= */}
        <div className="flex flex-wrap gap-4 justify-between items-center border-b pb-6">


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
          {moyenneGenerale.toFixed(2)} / 20
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
              <th>Etudiant</th>
              <th>Matière</th>
              <th>Note</th>
              <th>Année</th>
              <th>Session</th>
              <th>Filière</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedNotes.length ? (
              paginatedNotes.map(n => (
                <tr key={n.id}>
                  <td>
                    {n.etudiant
                      ? `${n.etudiant.nom} ${n.etudiant.postnom} ${n.etudiant.prenom}`
                      : "Étudiant supprimé"}
                  </td>
                  <td>{n.matiere}</td>
                  <td>{n.note}</td>
                  <td>{n.anneeAcademique?.annee ?? "N/A"}</td>
                  <td>
                    {n.session?.dateDebut && n.session?.dateFin
                      ? `${new Date(n.session.dateDebut).toLocaleDateString()} - ${new Date(n.session.dateFin).toLocaleDateString()}`
                      : "N/A"}
                  </td>
                  <td>{n.filiere?.nom ?? "N/A"}</td>
                  <td className="flex justify-center gap-2">
                    <button className="btn btn-xs btn-error btn-outline" onClick={() => handleDeleteNote(n.id)}>
                      <LucideTrash2 size={16} />
                    </button>
                    <button
                      className="btn btn-xs btn-success btn-outline"
                      onClick={() => handleDownloadBrevet(n)}
                      disabled={!n.session || !n.filiere || !n.anneeAcademique || !n.etudiant}
                    >
                      🎓
                    </button>
                    <button
                      className="btn btn-xs btn-warning btn-outline"
                      onClick={() => openEditPopup(n)}
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
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
                Détails de la note
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Matière</span>
                  </label>
                  <input
                    name="matiere"
                    className="input input-bordered rounded-xl focus:input-primary text-sm"
                    placeholder="Ex: Mathématiques"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Note /20</span>
                  </label>
                  <input
                    name="note"
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
                    Détails de la note
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Matière</span>
                      </label>
                      <input
                        name="matiere"
                        defaultValue={selectedNote.matiere}
                        className="input input-bordered rounded-xl focus:input-primary text-sm"
                        required
                      />
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-medium">Note /20</span>
                      </label>
                      <input
                        name="note"
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        defaultValue={selectedNote.note}
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
