"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Select from "react-select";
import { LucideTrash2, LucideSearch } from "lucide-react";
import { useSession } from "next-auth/react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

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
  const { data: session } = useSession();

  const [notes, setNotes] = useState<any[]>([]);
  const [etudiants, setEtudiants] = useState<any[]>([]);
  const [annees, setAnnees] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);

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

  // =====================
  // FILTER
  // =====================
  const filteredNotes = notes
    .filter(n =>
      (!filterEtudiant || n.etudiant.id === filterEtudiant.value) &&
      (!filterAnnee || n.anneeAcademique.id === filterAnnee.value) &&
      (!filterSession || n.session?.id === filterSession.value) &&
      (!filterFiliere || n.filiere?.id === filterFiliere.value)
    )
    .filter(n =>
      !search ||
      n.matiere.toLowerCase().includes(search.toLowerCase())
    );

  // pagination
  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const paginatedNotes = filteredNotes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // =====================
  // ADD NOTE
  // =====================
  const handleAddNote = async (e: any) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    const matiere = e.currentTarget.matiere.value.trim();

    // anti doublon (matiere/session/filiere)
    const already = notes.find(n =>
      n.matiere.toLowerCase() === matiere.toLowerCase() &&
      n.session?.id === selectedSession?.value &&
      n.filiere?.id === selectedFiliere?.value
    );
    if (already) {
      return toast.error("Doublon détecté (matière + session + filière)");
    }

    const formData = new FormData(e.currentTarget);
    formData.append("etudiantId", String(selectedEtudiant?.value));
    formData.append("anneeAcademiqueId", String(selectedAnnee?.value));
    formData.append("sessionId", String(selectedSession?.value));
    formData.append("filiereId", String(selectedFiliere?.value));
    formData.append("createdById", session.user.id);

    try {
      const created = await addNote(formData);
      setNotes(prev => [created, ...prev]);
      toast.success("Note ajoutée");
      setPopupOpen(false);
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
      label: note.session?.designation ?? note.session?.nom,
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

    const matiere = e.currentTarget.matiere.value.trim();

    // anti doublon (matiere/session/filiere) sauf la note actuelle
    const already = notes.find(n =>
      n.id !== selectedNote.id &&
      n.matiere.toLowerCase() === matiere.toLowerCase() &&
      n.session?.id === selectedSession?.value &&
      n.filiere?.id === selectedFiliere?.value
    );
    if (already) {
      return toast.error("Doublon détecté (matière + session + filière)");
    }

    const formData = new FormData(e.currentTarget);
    formData.append("id", String(selectedNote.id));
    formData.append("etudiantId", String(selectedEtudiant?.value));
    formData.append("anneeAcademiqueId", String(selectedAnnee?.value));
    formData.append("sessionId", String(selectedSession?.value));
    formData.append("filiereId", String(selectedFiliere?.value));

    try {
      const updated = await updateNote(formData);
      setNotes(prev => prev.map(n => (n.id === updated.id ? updated : n)));
      toast.success("Note modifiée");
      setEditPopupOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // =====================
  // DELETE
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
  const handleDownloadBrevet = async (note: any) => {
    if (!note?.etudiant?.id || !note?.anneeAcademique?.id || !note?.session?.id || !note?.filiere?.id) {
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

    if (!firstNote.etudiant) {
      return toast.error("Étudiant non défini pour cette note.");
    }

    if (!firstNote.session) {
      return toast.error("Session non définie.");
    }

    if (!firstNote.filiere) {
      return toast.error("Filière non définie.");
    }

    const etudiant = firstNote.etudiant;
    const sessionData = firstNote.session;
    const filiere = firstNote.filiere;

    const dateDebut = new Date(sessionData.dateDebut).toLocaleDateString();
    const dateFin = new Date(sessionData.dateFin).toLocaleDateString();

    const html = `
    <div style="width:210mm;height:297mm;padding:20mm;font-family:'Times New Roman';">
      <h2 style="text-align:center;">CENTRE DE FORMATION PROFESSIONNELLE</h2>
      <h3 style="text-align:center;">« LEON ACADEMY »</h3>

      <h3 style="text-align:center;background:#c9a64d;padding:10px;">
        ATTESTATION TENANT LIEU DE CERTIFICAT
      </h3>

      <p>
      Nous certifions que :
      </p>

      <h2 style="text-align:center;color:#1f5e3b;">
        ${etudiant.nom} ${etudiant.postnom} ${etudiant.prenom}
      </h2>

      <p>
      a suivi du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong>
      une formation en <strong>${filiere.nom.toUpperCase()}</strong>,
      comprenant <strong>${filiere.nombreHt} heures de théorie</strong> et
      <strong>${filiere.nombreHp} heures de pratique</strong>,
      ${filiere.description}.
      </p>

      <p>
      Mention : <strong>${stats.mention}</strong> (${stats.pourcentage.toFixed(0)}%)
      </p>

      <p style="margin-top:40px;text-align:right;">
      Fait le ${new Date().toLocaleDateString()}
      </p>
    </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    const canvas = await html2canvas(container, { scale: 3 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    pdf.save("brevet.pdf");

    document.body.removeChild(container);
  };

  return (
    <div className="mx-8 mt-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Notes</h1>

      {/* TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex  items-center justify-between gap-3">
          
          {/* SEARCH */}
       
            <Select
              options={etudiantOptions}
              isClearable
              placeholder="Étudiant"
              onChange={(opt) => {
                setFilterEtudiant(opt);
                setCurrentPage(1);
              }}
              className="w-full"
            />
 
          <Select
            options={anneeOptions}
            isClearable
            placeholder="Année"
            onChange={(opt) => {
              setFilterAnnee(opt);
              setCurrentPage(1);
            }}
             className="w-full"
          />

          <Select
            options={sessionOptions}
            isClearable
            placeholder="Session"
            onChange={(opt) => {
              setFilterSession(opt);
              setCurrentPage(1);
            }}
             className="w-full"
          />

          <Select
            options={filiereOptions}
            isClearable
            placeholder="Filière"
            onChange={(opt) => {
              setFilterFiliere(opt);
              setCurrentPage(1);
            }}
             className="w-full"
          />
        </div>

        <button className="btn btn-accent rounded-xl px-6" onClick={() => setPopupOpen(true)}>
          + Ajouter une note
        </button>
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
                      className="btn btn-xs btn-success  btn-outline"
                      onClick={() => handleDownloadBrevet(n)}
                      disabled={!n.session || !n.filiere || !n.anneeAcademique || !n.etudiant}
                    >
                      🎓
                    </button>
                    <button
                      className="btn btn-xs btn-warning  btn-outline"
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

      {/* POPUP AJOUT */}
      {popupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[520px] p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Ajouter une note</h2>

            <form onSubmit={handleAddNote}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Étudiant</label>
                  <Select
                    options={etudiantOptions}
                    value={selectedEtudiant}
                    onChange={setSelectedEtudiant}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Année académique</label>
                  <Select
                    options={anneeOptions}
                    value={selectedAnnee}
                    onChange={setSelectedAnnee}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Session</label>
                  <Select
                    options={sessionOptions}
                    value={selectedSession}
                    onChange={setSelectedSession}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Filière</label>
                  <Select
                    options={filiereOptions}
                    value={selectedFiliere}
                    onChange={setSelectedFiliere}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Matière</label>
                  <input name="matiere" className="input input-bordered w-full" required />
                </div>

                <div>
                  <label className="text-sm font-medium">Note</label>
                  <input name="note" type="number" step="0.01" min="0" max="20" className="input input-bordered w-full" required />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setPopupOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP EDIT */}
      {editPopupOpen && selectedNote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[520px] p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Modifier la note</h2>

            <form onSubmit={handleEditNote}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Étudiant</label>
                  <Select
                    options={etudiantOptions}
                    value={selectedEtudiant}
                    onChange={setSelectedEtudiant}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Année académique</label>
                  <Select
                    options={anneeOptions}
                    value={selectedAnnee}
                    onChange={setSelectedAnnee}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Session</label>
                  <Select
                    options={sessionOptions}
                    value={selectedSession}
                    onChange={setSelectedSession}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Filière</label>
                  <Select
                    options={filiereOptions}
                    value={selectedFiliere}
                    onChange={setSelectedFiliere}
                    placeholder="Sélectionner"
                    isClearable
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Matière</label>
                  <input
                    name="matiere"
                    defaultValue={selectedNote.matiere}
                    className="input input-bordered w-full"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Note</label>
                  <input
                    name="note"
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    defaultValue={selectedNote.note}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setEditPopupOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
