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

    // =======================
    // Impression Brevet
    // =======================
    // const handlePrintBrevet = async (etudiantId: number, anneeId: number) => {
    //     try {
    //         const notes = await getReleve(etudiantId, anneeId);
    //         if (!notes.length) {
    //             return toast.info("Aucune note pour cet étudiant et cette année");
    //         }

    //         const etudiant = notes[0].etudiant;
    //         const annee = notes[0].anneeAcademique.annee;

    //         // Calcul moyenne / pourcentage
    //         const total = notes.reduce((sum, n) => sum + n.note, 0);
    //         const max = notes.length * 20;
    //         const pourcentage = (total / max) * 100;

    //         // Mention
    //         let mention = "";
    //         if (pourcentage >= 80) mention = "Grande Distinction";
    //         else if (pourcentage >= 70) mention = "Distinction";
    //         else if (pourcentage >= 50) mention = "Satisfaction";
    //         else mention = "Ajourné";

    //         // HTML Brevet
    //         const brevetHtml = `
    // <div style="
    //   width: 900px;
    //   margin: auto;
    //   padding: 40px;
    //   font-family: 'Times New Roman', serif;
    //   border: 6px double #000;
    //   box-sizing: border-box;
    // ">

    //   <h3 style="text-align:center; margin-bottom:5px;">
    //     RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
    //   </h3>
    //   <h2 style="text-align:center; margin-top:0;">
    //     MINISTÈRE DE L’ENSEIGNEMENT
    //   </h2>

    //   <hr style="margin:20px 0;" />

    //   <h1 style="text-align:center; color:#003366;">
    //     LÉON ACADÉMIE
    //   </h1>

    //   <h2 style="text-align:center; margin-top:30px;">
    //     BREVET DE RÉUSSITE
    //   </h2>

    //   <p style="font-size:18px; margin-top:40px; text-align:justify;">
    //     Il est certifié par la présente que :
    //   </p>

    //   <h2 style="text-align:center; margin:20px 0;">
    //     ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}
    //   </h2>

    //   <p style="font-size:18px; text-align:justify;">
    //     a satisfait aux exigences académiques de l’année académique
    //     <strong>${annee}</strong> et a obtenu les résultats suivants :
    //   </p>

    //   <table style="width:60%; margin:30px auto; font-size:18px;">
    //     <tr>
    //       <td><strong>Moyenne générale :</strong></td>
    //       <td>${pourcentage.toFixed(2)} %</td>
    //     </tr>
    //     <tr>
    //       <td><strong>Mention :</strong></td>
    //       <td>${mention}</td>
    //     </tr>
    //   </table>

    //   <p style="margin-top:40px; font-size:18px;">
    //     En foi de quoi, le présent brevet lui est délivré pour servir et valoir
    //     ce que de droit.
    //   </p>

    //   <div style="display:flex; justify-content:space-between; margin-top:60px;">
    //     <div>
    //       <p>Fait à __________________</p>
    //       <p>Le ${new Date().toLocaleDateString()}</p>
    //     </div>
    //     <div style="text-align:center;">
    //       <p><strong>Le Directeur</strong></p>
    //       <br/><br/>
    //       <p>______________________</p>
    //     </div>
    //   </div>

    // </div>
    // `;

    //         const win = window.open("", "_blank", "width=1000,height=800");
    //         if (!win) return toast.error("Impossible d'ouvrir l'aperçu");

    //         win.document.write(`
    //   <html>
    //     <head>
    //       <title>Brevet de Réussite</title>
    //       <style>
    //         @media print {
    //           body { margin: 0; }
    //         }
    //       </style>
    //     </head>
    //     <body>${brevetHtml}</body>
    //   </html>
    // `);

    //         win.document.close();
    //         win.focus();
    //         win.print();

    //     } catch (error) {
    //         console.error(error);
    //         toast.error("Erreur lors de l'impression du brevet");
    //     }
    // };

    // =======================
// Impression Brevet coloré
// =======================
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

    // HTML du brevet
    const brevetHtml = `
    <div style="
      width:1000px;
      margin:auto;
      padding:50px;
      font-family: 'Georgia', serif;
      background: linear-gradient(135deg, #ffffff, #f2f6fa);
      border: 12px solid #0b3c5d;
      box-sizing:border-box;
    ">

      <!-- Bande décorative haut -->
      <div style="
        height:14px;
        background: linear-gradient(to right, #0b3c5d, #d4af37, #0b3c5d);
        margin-bottom:30px;
      "></div>

      <!-- En-tête -->
      <h3 style="text-align:center; color:#0b3c5d; margin-bottom:6px;">
        RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
      </h3>
      <h4 style="text-align:center; color:#444; margin-top:0;">
        Ministère de l’Enseignement
      </h4>

      <hr style="border:1px solid #d4af37; margin:25px 0;" />

      <!-- Académie -->
      <h1 style="
        text-align:center;
        color:#0b3c5d;
        font-size:42px;
        letter-spacing:2px;
        margin-bottom:5px;
      ">
        LÉON ACADÉMIE
      </h1>

      <p style="text-align:center; font-style:italic; color:#555;">
        Excellence • Discipline • Réussite
      </p>

      <!-- Titre -->
      <h2 style="
        text-align:center;
        margin:40px 0;
        font-size:34px;
        color:#d4af37;
        text-transform:uppercase;
      ">
        Brevet de Réussite
      </h2>

      <!-- Texte principal -->
      <p style="font-size:19px; text-align:justify; line-height:1.7;">
        Le présent brevet atteste que :
      </p>

      <h2 style="
        text-align:center;
        color:#0b3c5d;
        margin:30px 0;
        font-size:30px;
      ">
        ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}
      </h2>

      <p style="font-size:19px; text-align:justify; line-height:1.7;">
        a satisfait avec succès aux exigences académiques de l’année académique
        <strong>${annee}</strong> au sein de Léon Académie, et a obtenu les résultats suivants :
      </p>

      <!-- Tableau résultats -->
      <table style="
        width:65%;
        margin:40px auto;
        border-collapse:collapse;
        font-size:20px;
      ">
        <tr style="background:#0b3c5d; color:white;">
          <td style="padding:14px;">Moyenne Générale</td>
          <td style="padding:14px; text-align:center;">
            ${pourcentage.toFixed(2)} %
          </td>
        </tr>
        <tr style="background:#eef3f8;">
          <td style="padding:14px;">Mention</td>
          <td style="
            padding:14px;
            text-align:center;
            font-weight:bold;
            color:#d4af37;
          ">
            ${mention}
          </td>
        </tr>
      </table>

      <!-- Conclusion -->
      <p style="font-size:19px; text-align:justify; line-height:1.7;">
        En foi de quoi, le présent brevet est délivré à l’intéressé(e) pour servir
        et valoir ce que de droit.
      </p>

      <!-- Signatures -->
      <div style="
        display:flex;
        justify-content:space-between;
        margin-top:70px;
        font-size:18px;
      ">
        <div>
          <p>Fait à Kinshasa</p>
          <p>Le ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="text-align:center;">
          <p><strong>Le Directeur</strong></p>
          <div style="height:50px;"></div>
          <p style="border-top:1px solid #000; padding-top:6px;">
            Signature & Cachet
          </p>
        </div>
      </div>

      <!-- Bande décorative bas -->
      <div style="
        height:12px;
        background: linear-gradient(to right, #0b3c5d, #d4af37, #0b3c5d);
        margin-top:45px;
      "></div>

    </div>
    `;

    const win = window.open("", "_blank", "width=1100,height=850");
    if (!win) return toast.error("Impossible d'ouvrir l'aperçu");

    win.document.write(`
      <html>
        <head>
          <title>Brevet de Réussite</title>
          <style>
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
            <div className="flex gap-2 mb-4">
                <Select options={etudiantOptions} isClearable placeholder="Filtrer par étudiant" value={filterEtudiant} onChange={setFilterEtudiant} className="w-1/4" />
                <Select options={anneeOptions} isClearable placeholder="Filtrer par année" value={filterAnnee} onChange={setFilterAnnee} className="w-1/4" />
                <button className="btn btn-primary" onClick={handleOpenAddPopup}>Ajouter</button>
                <button className="btn btn-secondary" onClick={exportExcel}>Exporter Excel</button>
            </div>

            {/* Table */}
            {filteredNotes.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Aucune note trouvée</div>
            ) : (
                <table ref={tableRef} className="table table-zebra w-full">
                    <thead>
                        <tr>
                            <th>Etudiant</th>
                            <th>Matière</th>
                            <th>Note</th>
                            <th>Année</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredNotes.map(n => (
                            <tr key={n.id}>
                                <td>{n.etudiant.nom} {n.etudiant.postnom} {n.etudiant.prenom}</td>
                                <td>{n.matiere}</td>
                                <td>{n.note}</td>
                                <td>{n.anneeAcademique.annee}</td>
                                <td className="flex gap-2">
                                    <button className="btn btn-sm btn-warning" onClick={() => handleEditNote(n)}><LucideEdit2 size={16} /></button>
                                    <button className="btn btn-sm btn-error" onClick={() => handleDeleteNote(n.id)}><LucideTrash2 size={16} /></button>
                                    <button className="btn btn-sm btn-info" onClick={() => handlePrintReleve(n.etudiant.id, n.anneeAcademique.id)}><LucidePrinter size={16} /></button>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => handlePrintBrevet(n.etudiant.id, n.anneeAcademique.id)}
                                    >
                                        🎓
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
