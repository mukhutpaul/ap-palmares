"use client";

import {
  addClasse,
  deleteClasse,
  updateClasse,
  getClasses,
  getSessions,
  getEtudiants,
  getEtudiantById,
} from "@/app/actions/classesActions";
import { getFilieres } from "@/app/actions/filieresActions";// Nouveau : récupérer les sessions
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import {
  LucideEdit2,
  LucideTrash2,
  LucideSearch,
  LucideChevronUp,
  LucideChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import { Filiere, Session } from "@prisma/client";
import Select, { MultiValue } from "react-select";

type Classe = {
  id: number;
  nom: string;
  filiere: { id: number; nom: string } | null;
  session: { id: number; nom: string } | null;
  etudiant: { id: number; nom: string; postnom: string; prenom: string } | null // <-- ajouter ici
  createdById: string;
  createdAt: Date;
};


export default function ClassesClient() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [classeList, setClasseList] = useState<Classe[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]); // Nouveau
  const [search, setSearch] = useState("");

  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [selectedFiliere, setSelectedFiliere] =
    useState<{ value: number; label: string } | null>(null);
  const [selectedSession, setSelectedSession] =
    useState<{ value: number; label: string } | null>(null); // Nouveau

  const [sectionFilter, setSectionFilter] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState(""); // Nouveau
  const [etudiantOptions, setEtudiantOptions] = useState<{ value: number; label: string }[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<MultiValue<{ value: number; label: string }>>([]);


  const [isAdding, setIsAdding] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filiereSortAsc, setFiliereSortAsc] =
    useState<boolean | null>(null);

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    getEtudiants()
      .then((etudiants) => {
        setEtudiantOptions(
          etudiants.map((e: any) => ({
            value: e.id,
            label: e.nom, // ou e.prenom + " " + e.nom si tu veux le nom complet
          }))
        );
      })
      .catch(() => toast.error("Impossible de charger les étudiants"));
  }, []);

  useEffect(() => {
    getClasses()
      .then((classesRaw: any[]) =>
        setClasseList(
          classesRaw.map((c) => ({
            id: c.id,
            nom: c.nom,
            filiere: c.filiere
              ? { id: c.filiere.id, nom: c.filiere.nom }
              : null,
            session: c.session
              ? { id: c.session.id, nom: c.session.designation } // map "designation" -> "nom"
              : null,
            etudiant: c.etudiant
              ? {
                id: c.etudiant.id,
                nom: c.etudiant.nom,
                postnom: c.etudiant.postnom,
                prenom: c.etudiant.prenom,
              }
              : null,
            createdById: c.createdById,
            createdAt: new Date(c.createdAt),
          }))
        )
      )
      .catch(() => toast.error("Impossible de charger les classes"));
  }, []);


  useEffect(() => {
    getFilieres()
      .then(setFilieres)
      .catch(() => toast.error("Impossible de charger les filières"));
    getSessions()
      .then(setSessions)
      .catch(() => toast.error("Impossible de charger les sessions"));
  }, []);

  /* ---------------- DATA ---------------- */

  const filiereOptions = filieres.map((f) => ({
    value: f.id,
    label: f.nom,
  }));

  const sessionOptions = sessions.map((s) => ({
    value: s.id,
    label: s.designation,
  }));



  let filteredClasses = classeList.filter(
    (c) =>
    (c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (filiereFilter === "" || c.filiere?.nom === filiereFilter) &&
      (sessionFilter === "" || c.session?.nom === sessionFilter))
  );

  if (filiereSortAsc !== null) {
    filteredClasses.sort((a, b) =>
      filiereSortAsc
        ? (a.filiere?.nom ?? "").localeCompare(b.filiere?.nom ?? "")
        : (b.filiere?.nom ?? "").localeCompare(a.filiere?.nom ?? "")
    );
  }

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginatedClasses = filteredClasses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ---------------- ACTIONS ---------------- */

  const toggleFiliereSort = () => {
    if (filiereSortAsc === null) setFiliereSortAsc(true);
    else if (filiereSortAsc === true) setFiliereSortAsc(false);
    else setFiliereSortAsc(null);
  };

  const handleAddClasse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFiliere || !selectedSession) {
      toast.error("Veuillez sélectionner la filière et la session !");
      return;
    }

    setIsAdding(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    formData.append("filiereId", selectedFiliere.value.toString());
    formData.append("sessionId", selectedSession.value.toString());
    try {
      let student = null
      const newRaw = await addClasse(formData);
      if (newRaw.etudiantId !== null && newRaw.etudiantId !== undefined) {
        student = await getEtudiantById(newRaw.etudiantId);
      }

      setClasseList((prev) => [
        {
          id: newRaw.id,
          nom: newRaw.nom,
          filiere: newRaw.filiere
            ? { id: newRaw.filiere.id, nom: newRaw.filiere.nom }
            : null,
          session: newRaw.session
            ? { id: newRaw.session.id, nom: newRaw.session.designation }
            : null,
          etudiant: student ?? null,// ✅ null autorisé si pas d'étudiant
          createdById: newRaw.createdById,
          createdAt: new Date(newRaw.createdAt),
        },
        ...prev,
      ]);


      toast.success("Classe ajoutée !");
      setPopupOpen(false);
      setSelectedFiliere(null);
      setSelectedSession(null);
      setSelectedStudents([]);
    } catch {
      toast.error("Erreur lors de l'ajout de la classe");
    }

  };

  const openEditPopup = (classe: Classe) => {
    setSelectedClasse(classe);
    setSelectedFiliere(
      classe.filiere
        ? { value: classe.filiere.id, label: classe.filiere.nom }
        : null
    );
    setSelectedSession(
      classe.session
        ? { value: classe.session.id, label: classe.session.nom }
        : null
    );
    setEditPopupOpen(true);
  };

  const handleUpdateClasse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClasse || !selectedFiliere || !selectedSession || !selectedStudents) {
      toast.error("Veuillez remplir tous les champs !");
      return;
    }

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value.toString());
    formData.append("sessionId", selectedSession.value.toString());
    formData.append("etudiantId", selectedStudents.values.toString());

    try {
      const updatedRaw = await updateClasse(formData);
       let student = null
   
      if (updatedRaw.etudiantId !== null && updatedRaw.etudiantId !== undefined) {
        student = await getEtudiantById(updatedRaw.etudiantId);
      }

      const updatedClasse: Classe = {
        id: updatedRaw.id,
        nom: updatedRaw.nom,
        filiere: updatedRaw.filiere
          ? { id: updatedRaw.filiere.id, nom: updatedRaw.filiere.nom }
          : null,
        session: updatedRaw.session
          ? { id: updatedRaw.session.id, nom: updatedRaw.session.designation }
          : null,
        etudiant: student,  // <-- ici on garde juste l'id
        createdById: updatedRaw.createdById,
        createdAt: updatedRaw.createdAt,
      };

      setClasseList((prev) =>
        prev.map((c) => (c.id === updatedClasse.id ? updatedClasse : c))
      );

      toast.success("Classe modifiée !");
      setEditPopupOpen(false);
      setSelectedClasse(null);
      setSelectedFiliere(null);
      setSelectedSession(null);
      setSelectedStudents([]);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };



  const handleDeleteClasse = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer cette classe ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      await deleteClasse(id);
      setClasseList((prev) => prev.filter((c) => c.id !== id));
      toast.success("Classe supprimée !");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
        />
      )}

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Gestion des classes
        </h1>
        <p className="text-gray-500 mt-1">
          Administration et organisation des classes
        </p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-base-100 shadow-sm w-72">
            <LucideSearch size={18} className="text-gray-400" />
            <input
              className="w-full bg-transparent outline-none text-sm"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="select select-bordered select-sm rounded-xl w-48"
            value={filiereFilter}
            onChange={(e) => setFiliereFilter(e.target.value)}
          >
            <option value="">Toutes filières</option>
            {filieres.map((f) => (
              <option key={f.id}>{f.nom}</option>
            ))}
          </select>

          <select
            className="select select-bordered select-sm rounded-xl w-48"
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
          >
            <option value="">Toutes sessions</option>
            {sessions.map((s) => (
              <option key={s.id}>{s.designation}-{s.dateDebut.toLocaleDateString()}-{s.dateFin.toLocaleDateString()}</option>
            ))}
          </select>
        </div>

        <button
          className={`btn btn-accent rounded-xl px-6 ${isAdding ? "loading" : ""
            }`}
          onClick={() => setPopupOpen(true)}
        >
          + Inscrire un étudiant
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
        <table className="table w-full">
          <thead className="bg-base-200 text-sm">
            <tr>
              <th>ID</th>
              <th>Nom Classe</th>
              <th>Etudiant</th>
              <th>
                <div
                  className="flex items-center gap-1 cursor-pointer select-none"
                  onClick={toggleFiliereSort}
                >
                  Filière
                  {filiereSortAsc === true && <LucideChevronUp size={14} />}
                  {filiereSortAsc === false && <LucideChevronDown size={14} />}
                </div>
              </th>
              <th>Session</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedClasses.length ? (
              paginatedClasses.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nom}</td>
                  <td>{c.etudiant?.nom ?? "Inconnue"} {c.etudiant?.postnom ?? "Inconnue"} {c.etudiant?.prenom ?? "Inconnue"} </td>
                  <td>{c.filiere?.nom ?? "Inconnue"}</td>
                  <td>{c.session?.nom ?? "Inconnue"}</td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn btn-xs btn-outline btn-warning"
                        onClick={() => openEditPopup(c)}
                      >
                        <LucideEdit2 size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-outline btn-error"
                        onClick={() => handleDeleteClasse(c.id)}
                      >
                        <LucideTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  Aucune classe trouvée
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (p) => (
                <button
                  key={p}
                  className={`join-item btn btn-sm ${p === currentPage ? "btn-primary" : ""
                    }`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* POPUP AJOUT */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleAddClasse}
          >
            {/* Bouton fermer en X */}
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setPopupOpen(false)}
            >
              ✕
            </button>

            {/* Titre */}
            <h3 className="text-2xl font-bold text-center mb-4">
              Ajouter une classe
            </h3>

            {/* Champs texte */}
            <input
              name="nom"
              className="input input-bordered w-full"
              placeholder="Nom"
              required
            />
            <input
              name="section"
              className="input input-bordered w-full"
              placeholder="Section"
              required
            />

            {/* Sélect filière */}
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />

            {/* Sélect session */}
            <Select
              options={sessionOptions}
              value={selectedSession}
              onChange={(opt) => setSelectedSession(opt)}
              placeholder="Sélectionner une session"
            />

            {/* Sélect multi étudiants */}
            <Select
              options={etudiantOptions}
              value={selectedStudents}
              onChange={(opt) => setSelectedStudents(opt)}
              placeholder="Sélectionner des étudiants"
              isMulti
            />

            {/* Bouton Ajouter */}
            <div className="modal-action justify-center mt-6">
              <button type="submit" className="btn btn-accent w-full text-lg">
                Ajouter
              </button>
            </div>
          </form>
        </dialog>
      )}


      {/* POPUP MODIFIER */}
      {editPopupOpen && selectedClasse && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-2xl max-w-md flex flex-col gap-4"
            onSubmit={handleUpdateClasse}
          >
            <h3 className="text-xl font-semibold">Modifier la classe</h3>

            <input type="hidden" name="id" value={selectedClasse.id} />

            <input
              name="nom"
              defaultValue={selectedClasse.nom}
              className="input input-bordered w-full"
              required
            />

            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
            />

            <Select
              options={sessionOptions}
              value={selectedSession}
              onChange={(opt) => setSelectedSession(opt)}
            />

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditPopupOpen(false)}
              >
                Annuler
              </button>
              <button className="btn btn-warning">Modifier</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
