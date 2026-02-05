"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Select from "react-select";
import { LucideEdit2, LucideTrash2, LucidePrinter } from "lucide-react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { useRef } from "react";
import html2canvas from "html2canvas";
import "jspdf-autotable";

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
    // Export PDF via API
    //   // =======================
    //   const handlePrintReleve = async (etudiantId: number, anneeId: number) => {
    //     try {
    //       const res = await fetch(`/api/releve?etudiantId=${etudiantId}&anneeId=${anneeId}`);
    //       if (!res.ok) throw new Error("Erreur récupération relevé");

    //       const releveNotes: Note[] = await res.json();
    //       console.log("Relevé reçu:", releveNotes);

    //       if (!Array.isArray(releveNotes) || releveNotes.length === 0) {
    //         return toast.info("Aucune note pour cet étudiant et cette année");
    //       }

    //       // Mapping robuste pour éviter undefined
    //       const releveNotesMapped = releveNotes.map(n => ({
    //         matiere: n.matiere,
    //         note: n.note,
    //         etudiant: typeof n.etudiant === "object" ? n.etudiant : { nom: "", postnom: "", prenom: "" },
    //         anneeAcademique: typeof n.anneeAcademique === "object" ? n.anneeAcademique : { annee: "" },
    //       }));

    //       console.log("Données pour PDF:", releveNotesMapped);

    //       const etudiant = releveNotesMapped[0].etudiant;
    //       const annee = releveNotesMapped[0].anneeAcademique.annee;

    //       const doc = new jsPDF({ unit: "pt", format: "A4" });
    //       const pageWidth = doc.internal.pageSize.getWidth();

    //       // Title
    //       doc.setFontSize(22);
    //       doc.setFont("helvetica", "bold");
    //       doc.text("Relevé de Notes", pageWidth / 2, 50, { align: "center" });

    //       // Student info
    //       doc.setFontSize(14);
    //       doc.setFont("helvetica", "normal");
    //       doc.text(`Étudiant : ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}`, 40, 80);
    //       doc.text(`Année académique : ${annee}`, 40, 100);

    //       // Table
    //       const tableData = releveNotesMapped.map(n => [n.matiere, n.note]);
    //       (doc as any).autoTable({
    //         head: [["Matière", "Note"]],
    //         body: tableData,
    //         startY: 130,
    //         theme: "grid",
    //         headStyles: { fillColor: [30, 144, 255], textColor: 255, fontStyle: "bold", halign: "center" },
    //         bodyStyles: { fontSize: 12 },
    //         alternateRowStyles: { fillColor: [240, 248, 255] },
    //         columnStyles: { 0: { cellWidth: 350 }, 1: { halign: "center" } },
    //       });

    //       // Footer
    //       const pageHeight = doc.internal.pageSize.getHeight();
    //       doc.setFontSize(10);
    //       doc.setTextColor(100);
    //       doc.text(`Document généré automatiquement - ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 20, { align: "center" });

    //       doc.save(`Releve_${etudiant.nom}_${annee}.pdf`);

    //     } catch (err) {
    //       console.error(err);
    //       toast.error("Impossible de générer le relevé");
    //     }
    //   };



    // ...

const handlePrintReleve = async (etudiantId: number, anneeId: number) => {
  try {
    // Récupération des notes filtrées
    const releveNotes = await getReleve(etudiantId, anneeId);
    if (!releveNotes.length) return toast.info("Aucune note pour cet étudiant et cette année");

    const etudiant = releveNotes[0].etudiant;
    const annee = releveNotes[0].anneeAcademique.annee;

    if (!tableRef.current) return toast.error("Table introuvable pour le PDF");

    // Capture du tableau en canvas
    const canvas = await html2canvas(tableRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // Création d’un objet Image pour récupérer dimensions
    const img = new Image();
    img.src = imgData;
    img.onload = () => {
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Titre
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Relevé de Notes", pageWidth / 2, 40, { align: "center" });

      // Infos étudiant
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Étudiant : ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}`, 40, 70);
      doc.text(`Année académique : ${annee}`, 40, 90);

      // Calcul ratio pour garder proportions
      const pdfWidth = pageWidth - 80; // marge 40px
      const pdfHeight = (img.height * pdfWidth) / img.width;

      // Ajouter l'image de la table
      doc.addImage(imgData, "PNG", 40, 110, pdfWidth, pdfHeight);

      // Footer
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Document généré automatiquement - ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        pageHeight - 20,
        { align: "center" }
      );

      doc.save(`Releve_${etudiant.nom}_${annee}.pdf`);
    };
  } catch (err) {
    console.error("Erreur génération PDF :", err);
    toast.error("Impossible de générer le relevé");
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
                <table  ref={tableRef} className="table table-zebra w-full">
                    <thead>
                        <tr>
                            <th>Etudiant</th>
                            <th>Matière</th>
                            <th>Note</th>
                            <th>Année</th>
                            <th />
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
