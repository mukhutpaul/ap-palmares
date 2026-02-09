"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Select from "react-select";
import { LucideEdit2, LucideTrash2, LucidePrinter } from "lucide-react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas-pro';

import {
  addNote,
  updateNote,
  deleteNote,
  getNotes,
  getEtudiants,
  getAnneesAcademiques,
  getReleve,
  importNotesFromExcel,

} from "@/app/actions/notesActions";

// ===============================
// TYPES
// ===============================
interface Etudiant { id: number; nom: string; postnom: string; prenom: string; }
interface Annee { id: number; annee: string; }
interface Note { id: number; matiere: string; note: number; etudiant: Etudiant; anneeAcademique: Annee; }
interface SelectOption { value: number; label: string; }

// ===============================
// COMPONENT
// ===============================
export default function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [annees, setAnnees] = useState<Annee[]>([]);

  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [selectedEtudiant, setSelectedEtudiant] = useState<SelectOption | null>(null);
  const [selectedAnnee, setSelectedAnnee] = useState<SelectOption | null>(null);

  const [filterEtudiant, setFilterEtudiant] = useState<SelectOption | null>(null);
  const [filterAnnee, setFilterAnnee] = useState<SelectOption | null>(null);

  const { data: session } = useSession();

  const tableRef = useRef<HTMLTableElement>(null);

  // =======================
  // Chargements initiaux
  // =======================
  useEffect(() => {
    getNotes().then(setNotes).catch(() => toast.error("Impossible de charger les notes"));
    getEtudiants().then(setEtudiants).catch(() => toast.error("Erreur chargement étudiants"));
    getAnneesAcademiques().then(setAnnees).catch(() => toast.error("Erreur chargement années"));
  }, []);

  // =======================
  // Options Select
  // =======================
  const etudiantOptions = etudiants.map((e) => ({
    value: e.id,
    label: `${e.nom} ${e.postnom} ${e.prenom}`,
  }));

  const anneeOptions = annees.map((a) => ({ value: a.id, label: a.annee }));

  // =======================
  // Filtrage
  // =======================
  const filteredNotes = notes.filter((n) => {
    const matchEtudiant = filterEtudiant ? n.etudiant.id === filterEtudiant.value : true;
    const matchAnnee = filterAnnee ? n.anneeAcademique.id === filterAnnee.value : true;
    return matchEtudiant && matchAnnee;
  });

  // =======================
  // Actions
  // =======================
  const handleOpenAddPopup = () => { setSelectedEtudiant(null); setSelectedAnnee(null); setPopupOpen(true); };

  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEtudiant || !selectedAnnee || !session?.user?.id) return toast.error("Tous les champs sont obligatoires");

    const formData = new FormData(e.currentTarget);
    formData.append("etudiantId", selectedEtudiant.value.toString());
    formData.append("anneeAcademiqueId", selectedAnnee.value.toString());
    formData.append("createdById", session.user.id);

    try {
      const created = await addNote(formData);
      setNotes((prev) => [created, ...prev]);
      setPopupOpen(false);
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur ajout note");
    }
  };

  const handleEditNote = (note: Note) => {
    setSelectedNote(note);
    setSelectedEtudiant({ value: note.etudiant.id, label: `${note.etudiant.nom} ${note.etudiant.postnom} ${note.etudiant.prenom}` });
    setSelectedAnnee({ value: note.anneeAcademique.id, label: note.anneeAcademique.annee });
    setEditPopupOpen(true);
  };

  // =======================
  // Import Excel
  // =======================
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    try {
      await importNotesFromExcel(file);
      // Recharge les notes après import
      const updatedNotes = await getNotes();
      setNotes(updatedNotes);
      toast.success("Importation réussie !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'importation des notes");
    } finally {
      // Reset input pour pouvoir réimporter le même fichier si nécessaire
      e.target.value = "";
    }
  };

  const BREVE_CODE_OFFICIEL = "028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023";

  const handleUpdateNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedNote || !selectedEtudiant || !selectedAnnee || !session?.user?.id) return;

    const formData = new FormData(e.currentTarget);
    formData.append("id", selectedNote.id.toString());
    formData.append("etudiantId", selectedEtudiant.value.toString());
    formData.append("anneeAcademiqueId", selectedAnnee.value.toString());
    formData.append("createdById", session.user.id);

    try {
      const updated = await updateNote(formData);
      setNotes((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      setEditPopupOpen(false);
      toast.success("Note modifiée");
    } catch {
      toast.error("Erreur modification note");
    }
  };

  const handleDeleteNote = async (id: number) => {
    const res = await Swal.fire({ title: "Supprimer cette note ?", icon: "warning", showCancelButton: true, confirmButtonText: "Oui", cancelButtonText: "Non" });
    if (!res.isConfirmed) return;

    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note supprimée");
    } catch {
      toast.error("Erreur suppression note");
    }
  };

  const downloadHtmlAsPdf = async (
    html: string,
    filename: string,
    landscape = false
  ) => {
    const container = document.createElement("div");
    container.innerHTML = html;
    container.style.position = "fixed";
    container.style.left = "-9999px";
    document.body.appendChild(container);

    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);

    document.body.removeChild(container);
  };

  const handleDownloadBrevet = async (etudiantId: number, anneeId: number) => {
    try {
      const notes = await getReleve(etudiantId, anneeId);
      if (!notes.length) {
        return toast.info("Aucune note pour cet étudiant et cette année");
      }

      const etudiant = notes[0].etudiant;
      const annee = notes[0].anneeAcademique.annee;

      const total = notes.reduce((sum, n) => sum + n.note, 0);
      const max = notes.length * 20;
      const pourcentage = (total / max) * 100;

      let mention = "";
      if (pourcentage >= 80) mention = "Grande Distinction";
      else if (pourcentage >= 70) mention = "Distinction";
      else if (pourcentage >= 50) mention = "Satisfaction";
      else mention = "Ajourné";

const brevetHtml = `
<div style="
  width:210mm;
  height:297mm;
  padding:15mm 15mm;
  font-family:'Times New Roman', serif;
  background:#f2f2f2;
  position:relative;
  box-sizing:border-box;
  overflow:hidden;
">

  <!-- Bande décorative gauche ondulée sur toute la page -->
  <svg style="position:absolute; top:0; left:0; width:35mm; height:100%;" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1f5e3b"/>
        <stop offset="100%" stop-color="#c9a64d"/>
      </linearGradient>
    </defs>
    <path d="
      M0,0
      C25,30 35,100 35,148
      C35,196 25,267 0,297
      L0,0
      Z
    " fill="url(#grad)"/>
  </svg>

  <!-- Contenu principal -->
  <div style="
    position:relative;
    z-index:1;
    height:100%;
    padding-left:10mm; /* Texte reculé légèrement moins, proche du bord */
    display:flex;
    flex-direction:column;
    justify-content:space-between;
  ">

    <!-- En-tête -->
    <div style="text-align:center;">
      <h2 style="margin:0;font-size:20px;">CENTRE DE FORMATION PROFESSIONNELLE ET METIERS</h2>
      <p style="margin:1px 0;font-weight:bold;font-size:18px;">« LEON ACADEMY »</p>
      <img src="/logo-leon.png" style="width:100px;margin:5px auto;" />
      <p style="font-size:11px;font-weight:bold;margin:2px 0;">${BREVE_CODE_OFFICIEL}</p>
    </div>

    <!-- Titre -->
    <div style="
      background:#c9a64d; 
      padding:6px 10px; 
      margin:10px auto; 
      text-align:center; 
      font-weight:bold; 
      font-size:14px; 
      width:fit-content; 
      letter-spacing:0.3px;
    ">
      ATTESTATION TENANT LIEU DE CERTIFICAT<br/>D’APTITUDE PROFESSIONNELLE
    </div>

    <!-- Texte principal -->
    <div style="font-size:12px; line-height:1.4; flex-grow:1;">
      <p style="text-align:justify;margin:5px 0;">
        Nous soussignons la Direction du centre de formation Professionnelle et Métiers <strong>« Léon Academy »</strong>, certifions que :
      </p>

      <p style="text-align:center;font-size:15px;font-weight:bold;color:#1f5e3b;margin:8px 0;">
        ${etudiant.nom} ${etudiant.postnom} ${formatPrenom(etudiant.prenom)}
      </p>

      <p style="text-align:justify;margin:5px 0;">
        a suivi, du <strong>19 mai 2025</strong> au <strong>19 août 2025</strong>, une formation professionnelle en <strong>CAISSE</strong>, comprenant <strong>60 heures de théorie</strong> et <strong>180 heures de pratique</strong>, axée sur la gestion de la caisse et des transactions financières, le service et la relation clientèle, les connaissances des produits et le merchandising, la sécurité et les procédures, ainsi que l’utilisation des outils informatiques.
      </p>

      <p style="text-align:justify;margin:5px 0;">
        Elle a satisfait aux épreuves d’évaluation avec la mention <strong style="color:#1f5e3b;">BIEN</strong>, soit <strong>${pourcentage.toFixed(0)} %</strong>.
      </p>

      <p style="text-align:justify;margin:5px 0;">
        En foi de quoi, nous lui délivrons la présente attestation pour servir et valoir ce que de droit.
      </p>

        <!-- Pied de page -->
    <div style="text-align:right;font-size:12px;margin-top:12px;">
      <div>Fait à Kinshasa, le ${new Date().toLocaleDateString()}</div>
      
      <div style="margin-top:15px;">
        <div style="margin-top:3px;border-top:1px solid #000;width:140px;margin-left:auto;"></div>
        <strong style="display:block;margin-left:auto;width:140px;text-align:center;">Le Directeur</strong>
      </div>
    </div>
    </div>

  

  </div>
</div>
`;

      await downloadHtmlAsPdf(brevetHtml, "brevet-reussite.pdf", true);

    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du téléchargement du brevet");
    }
  };



  // =======================
  // Export Excel
  // =======================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredNotes.map(n => ({
      Etudiant: `${n.etudiant.nom} ${n.etudiant.postnom} ${n.etudiant.prenom}`,
      Matiere: n.matiere,
      Note: n.note,
      Annee: n.anneeAcademique.annee,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
    XLSX.writeFile(wb, "notes.xlsx");
  };

  // =======================
  // PDF relevé sans colonnes Étudiant et Année
  // =======================
  const handlePrintReleve = async (etudiantId: number, anneeId: number) => {
    try {
      const releveNotes = await getReleve(etudiantId, anneeId);
      if (!releveNotes.length) return toast.info("Aucune note pour cet étudiant et cette année");

      const etudiant = releveNotes[0].etudiant;
      const annee = releveNotes[0].anneeAcademique.annee;

      // Calcul du pourcentage
      const totalObt = releveNotes.reduce((sum, n) => sum + n.note, 0);
      const maxTotal = releveNotes.length * 20; // chaque note sur 20
      const pourcentage = (totalObt / maxTotal) * 100;

      // Détermination mention selon ton barème
      let mention = "";
      if (pourcentage >= 80 && pourcentage <= 99) mention = "GD";       // Grande Distinction
      else if (pourcentage >= 70 && pourcentage <= 79) mention = "D";   // Distinction
      else if (pourcentage >= 50 && pourcentage <= 69) mention = "S";   // Satisfaction
      else mention = "Ajourné";

      // HTML du relevé avec design universitaire
      const tableHtml = `
      <div style="font-family: 'Arial', sans-serif; width: 800px; margin: 0 auto; padding: 30px; box-sizing: border-box; border: 2px solid #004080; border-radius: 10px;">
        <h1 style="text-align:center; color:#004080; margin-bottom: 10px;">Léon Académie</h1>
        <h2 style="text-align:center; color:#004080; margin-bottom: 30px;">Relevé de Notes</h2>

        <p><strong>Étudiant :</strong> ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}</p>
        <p><strong>Année académique :</strong> ${annee}</p>

        <table cellspacing="0" cellpadding="10" style="width:100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; border-radius: 5px; overflow: hidden;">
          <thead style="background-color:#004080; color:white;">
            <tr>
              <th style="width:70%; text-align:left;">Matière</th>
              <th style="width:30%; text-align:center;">Note / 20</th>
            </tr>
          </thead>
          <tbody>
            ${releveNotes.map((n, i) => `
              <tr style="background-color:${i % 2 === 0 ? '#f0f8ff' : '#e6f2ff'}">
                <td style="word-wrap: break-word;">${n.matiere}</td>
                <td style="text-align:center;">${n.note.toFixed(2)}</td>
              </tr>`).join("")}
          </tbody>
        </table>

        <p style="margin-top: 20px; font-size: 16px;"><strong>Moyenne :</strong> ${pourcentage.toFixed(2)} %</p>
        <p style="font-size: 16px;"><strong>Mention :</strong> ${mention}</p>

        <p style="text-align:center; font-size: 10px; color: gray; margin-top: 30px;">
          Léon Académie - ${new Date().toLocaleDateString()}
        </p>
      </div>
    `;

      // Fenêtre d'aperçu
      const printWindow = window.open("", "_blank", "width=900,height=700");
      if (!printWindow) return toast.error("Impossible d'ouvrir la fenêtre d'aperçu");

      printWindow.document.write(`
      <html>
        <head>
          <title>Relevé de Notes</title>
          <style>
            @media print {
              body { margin: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>${tableHtml}</body>
      </html>
    `);
      printWindow.document.close();

      // Imprimer après aperçu
      printWindow.focus();
      printWindow.print();

    } catch (err) {
      console.error("Erreur génération PDF :", err);
      toast.error("Impossible de générer le relevé");
    }
  };



  const handleDownloadReleve = async (etudiantId: number, anneeId: number) => {
    try {
      const releveNotes = await getReleve(etudiantId, anneeId);
      if (!releveNotes.length) {
        return toast.info("Aucune note pour cet étudiant et cette année");
      }

      const etudiant = releveNotes[0].etudiant;
      const annee = releveNotes[0].anneeAcademique.annee;

      const totalObt = releveNotes.reduce((sum, n) => sum + n.note, 0);
      const maxTotal = releveNotes.length * 20;
      const pourcentage = (totalObt / maxTotal) * 100;

      let mention = "";
      if (pourcentage >= 80 && pourcentage <= 99) mention = "GD";
      else if (pourcentage >= 70 && pourcentage <= 79) mention = "D";
      else if (pourcentage >= 50 && pourcentage <= 69) mention = "S";
      else mention = "Ajourné";

      // Création d'un container parent avec padding en haut
      const container = document.createElement("div");
      container.style.width = "100%";
      container.style.paddingTop = "80px"; // <-- espace en haut plus grand
      container.style.boxSizing = "border-box"; // important pour le padding
      container.style.backgroundColor = "white"; // éviter fonds transparents

      // Contenu du relevé
      const releveHTML = `
      <div style="
        font-family: Arial, sans-serif;
        width: 96%;
        margin: 0 auto; /* centrage horizontal */
        padding: 30px;
        border: 5px solid #004080;
        border-radius: 10px;
        font-size: 18pt;
        line-height: 1.6;
      ">
        <h1 style="text-align:center; color:#004080; margin-bottom: 20px; font-size: 32pt;">Léon Académie</h1>
        <h2 style="text-align:center; color:#004080; margin-bottom: 25px; font-size: 24pt;">Relevé de Notes</h2>

        <p style="font-size: 18pt;"><strong>Étudiant :</strong> ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}</p>
        <p style="font-size: 18pt;"><strong>Année académique :</strong> ${annee}</p>

        <table cellspacing="0" cellpadding="12" style="width:100%; border-collapse: collapse; margin-top: 20px; table-layout: fixed; font-size: 18pt;">
          <thead style="background-color:#004080; color:white;">
            <tr>
              <th style="width:70%; text-align:left;">Matière</th>
              <th style="width:30%; text-align:center;">Note / 20</th>
            </tr>
          </thead>
          <tbody>
            ${releveNotes.map((n, i) => `
              <tr style="background-color:${i % 2 === 0 ? '#f0f8ff' : '#e6f2ff'}">
                <td style="word-wrap: break-word; font-size: 18pt;">${n.matiere}</td>
                <td style="text-align:center; font-size: 18pt;">${n.note.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <p style="margin-top: 25px; font-size: 18pt;"><strong>Moyenne :</strong> ${pourcentage.toFixed(2)} %</p>
        <p style="font-size: 18pt;"><strong>Mention :</strong> ${mention}</p>

        <p style="text-align:center; font-size: 12pt; color: gray; margin-top: 30px;">
          Léon Académie - ${new Date().toLocaleDateString()}
        </p>
      </div>
    `;

      container.innerHTML = releveHTML;

      document.body.appendChild(container); // nécessaire pour html2canvas

      // Génération du canvas avec scale élevé pour texte lisible
      const canvas = await html2canvas(container, { scale: 3, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("releve-notes.pdf");

      document.body.removeChild(container); // nettoyage
    } catch (err) {
      console.error("Erreur téléchargement relevé :", err);
      toast.error("Impossible de télécharger le relevé");
    }
  };




  const formatPrenom = (prenom: string) => {
    if (!prenom) return "";
    return prenom.charAt(0).toUpperCase() + prenom.slice(1).toLowerCase();
  };
  const handlePrintBrevet = async (etudiantId: number, anneeId: number) => {
    try {
      const notes = await getReleve(etudiantId, anneeId);
      if (!notes.length) {
        return toast.info("Aucune note pour cet étudiant et cette année");
      }

      const etudiant = notes[0].etudiant;
      const annee = notes[0].anneeAcademique.annee;

      // Calcul moyenne / pourcentage
      const total = notes.reduce((sum, n) => sum + n.note, 0);
      const max = notes.length * 20;
      const pourcentage = (total / max) * 100;

      // Mention
      let mention = "";
      if (pourcentage >= 80) mention = "Grande Distinction";
      else if (pourcentage >= 70) mention = "Distinction";
      else if (pourcentage >= 50) mention = "Satisfaction";
      else mention = "Ajourné";

      // HTML du brevet (format paysage compact)
      const brevetHtml = `
<div style="
  width:96%;
  margin:2% auto;
  padding:40px;
  font-family:Arial, sans-serif;
  background:#e5e5e5;
  border:2px solid #999;
">

  <h2 style="text-align:center;margin:0;">
    CENTRE DE FORMATION PROFESSIONNELLE ET METIERS
  </h2>
  <p style="text-align:center;margin:4px 0;">
    « LEON ACADEMY »
  </p>

  <p style="text-align:center;font-weight:bold;">
    ${codeBrevet}
  </p>

  <h3 style="
    text-align:center;
    background:#d4af37;
    padding:8px;
    margin:20px auto;
    width:fit-content;
  ">
    ATTESTATION TENANT LIEU DE CERTIFICAT<br/>
    D’APTITUDE PROFESSIONNELLE
  </h3>

  <p>
    Nous soussignons la Direction du centre de formation Professionnelle
    et Métiers « Léon Academy », certifions que :
  </p>

  <p style="text-align:center;font-weight:bold;font-size:18px;">
    ${etudiant.nom} ${etudiant.postnom} ${formatPrenom(etudiant.prenom)}
  </p>

  <p>
    a suivi la formation et a satisfait aux épreuves d’évaluation
    avec la mention <strong>BIEN</strong>
    soit <strong>${pourcentage.toFixed(0)} %</strong>.
  </p>

  <p>
    En foi de quoi, nous lui délivrons la présente attestation.
  </p>

  <p style="margin-top:40px;">
    Fait à Kinshasa le ${new Date().toLocaleDateString()}
  </p>

  <div style="text-align:right;margin-top:60px;">
    <strong>Le Directeur</strong>
    <div style="margin-top:40px;border-top:1px solid #000;width:200px;"></div>
  </div>
</div>
`;


      const win = window.open("", "_blank", "width=1200,height=850");
      if (!win) return toast.error("Impossible d'ouvrir l'aperçu");

      win.document.write(`
      <html>
        <head>
          <title>Brevet de Réussite</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${brevetHtml}</body>
      </html>
    `);

      win.document.close();
      win.focus();
      win.print();

    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'impression du brevet");
    }
  };








  // =======================
  // Render
  // =======================
  return (
    <div className="mx-8 mt-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Notes</h1>

      {/* Filtres et boutons */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <Select options={etudiantOptions} isClearable placeholder="Filtrer par étudiant" value={filterEtudiant} onChange={setFilterEtudiant} className="w-1/4" />
        <Select options={anneeOptions} isClearable placeholder="Filtrer par année" value={filterAnnee} onChange={setFilterAnnee} className="w-1/4" />
        <button className="btn btn-primary" onClick={handleOpenAddPopup}>Ajouter</button>
        <button className="btn btn-secondary" onClick={exportExcel}>Exporter Excel</button>

        {/* Nouveau bouton Import */}
        <label className="btn btn-accent cursor-pointer">
          Importer Excel
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
        </label>
      </div>

      {/* Table */}
      {filteredNotes.length === 0 ? (
        <div className="text-center text-gray-500 py-10">Aucune note trouvée</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
          <table ref={tableRef} className="table w-full">
            <thead className="bg-base-200 text-sm">
              <tr>
                <th>Etudiant</th>
                <th>Matière</th>
                <th>Note</th>
                <th>Année</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map(n => (
                <tr key={n.id}>
                  <td>{n.etudiant.nom} {n.etudiant.postnom} {n.etudiant.prenom}</td>
                  <td>{n.matiere}</td>
                  <td>{n.note}</td>
                  <td>{n.anneeAcademique.annee}</td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button className="btn btn-xs btn-warning btn-outline" onClick={() => handleEditNote(n)}><LucideEdit2 size={16} /></button>
                      <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDeleteNote(n.id)}><LucideTrash2 size={16} /></button>
                      <button className="btn btn-xs btn-outline btn-info" onClick={() => handlePrintReleve(n.etudiant.id, n.anneeAcademique.id)}><LucidePrinter size={16} /></button>
                      <button
                        className="btn btn-xs btn-outline btn-success"
                        onClick={() => handlePrintBrevet(n.etudiant.id, n.anneeAcademique.id)}
                      >
                        🎓
                      </button>
                      <button
                        className="btn btn-xs btn-outline btn-primary"
                        onClick={() => handleDownloadBrevet(
                          n.etudiant.id,
                          n.anneeAcademique.id
                        )}
                      >
                        ⬇️🎓
                      </button>

                      <button
                        className="btn btn-xs btn-outline btn-primary"
                        onClick={() => handleDownloadReleve(
                          n.etudiant.id,
                          n.anneeAcademique.id
                        )}
                      >
                        ⬇️ Relevé
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* POPUP ADD */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form className="modal-box" onSubmit={handleAddNote}>
            <h3 className="font-bold mb-4">Ajouter Note</h3>
            <input name="matiere" placeholder="Matière" className="input w-full mb-2" required />
            <input name="note" type="number" placeholder="Note" className="input w-full mb-2" required />

            <Select options={etudiantOptions} placeholder="Etudiant" value={selectedEtudiant} onChange={setSelectedEtudiant} className="mb-2" />
            <Select options={anneeOptions} placeholder="Année" value={selectedAnnee} onChange={setSelectedAnnee} />

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </dialog>
      )}

      {/* POPUP EDIT */}
      {editPopupOpen && selectedNote && (
        <dialog className="modal modal-open">
          <form className="modal-box" onSubmit={handleUpdateNote}>
            <h3 className="font-bold mb-4">Modifier Note</h3>
            <input name="matiere" defaultValue={selectedNote.matiere} className="input w-full mb-2" required />
            <input name="note" type="number" defaultValue={selectedNote.note} className="input w-full mb-2" required />

            <Select options={etudiantOptions} placeholder="Etudiant" value={selectedEtudiant} onChange={setSelectedEtudiant} className="mb-2" />
            <Select options={anneeOptions} placeholder="Année" value={selectedAnnee} onChange={setSelectedAnnee} />

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setEditPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Enregistrer</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
