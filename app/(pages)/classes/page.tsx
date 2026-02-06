"use client";

import {
  addClasse,
  deleteClasse,
  updateClasse,
  getClasses,
} from "@/app/actions/classesActions";
import { getFilieres } from "@/app/actions/filieresActions";
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
import { Filiere } from "@prisma/client";
import Select from "react-select";

interface Classe {
  id: number;
  nom: string;
  section: string;
  filiere: { id: number; nom: string };
}

export default function ClassesClient() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [classeList, setClasseList] = useState<Classe[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [selectedFiliere, setSelectedFiliere] =
    useState<{ value: number; label: string } | null>(null);

  const [sectionFilter, setSectionFilter] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("");
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
    getClasses()
      .then((classesRaw: any[]) =>
        setClasseList(
          classesRaw.map((c) => ({
            id: c.id,
            nom: c.nom,
            section: c.section,
            filiere: c.filiere
              ? { id: c.filiere.id, nom: c.filiere.nom }
              : { id: 0, nom: "Inconnue" },
          }))
        )
      )
      .catch(() => toast.error("Impossible de charger les classes"));
  }, []);

  useEffect(() => {
    getFilieres()
      .then(setFilieres)
      .catch(() => toast.error("Impossible de charger les filières"));
  }, []);

  /* ---------------- DATA ---------------- */

  const filiereOptions = filieres.map((f) => ({
    value: f.id,
    label: f.nom,
  }));

  const sections = Array.from(
    new Set(classeList.map((c) => c.section))
  ).sort();

  let filteredClasses = classeList.filter(
    (c) =>
      (c.nom.toLowerCase().includes(search.toLowerCase()) ||
        c.section.toLowerCase().includes(search.toLowerCase())) &&
      (sectionFilter === "" || c.section === sectionFilter) &&
      (filiereFilter === "" || c.filiere.nom === filiereFilter)
  );

  if (filiereSortAsc !== null) {
    filteredClasses.sort((a, b) =>
      filiereSortAsc
        ? a.filiere.nom.localeCompare(b.filiere.nom)
        : b.filiere.nom.localeCompare(a.filiere.nom)
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
    if (!selectedFiliere) {
      toast.error("Veuillez sélectionner une filière !");
      return;
    }

    setIsAdding(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value.toString());

    try {
      const newRaw = await addClasse(formData);
      setClasseList((prev) => [
        {
          id: newRaw.id,
          nom: newRaw.nom,
          section: newRaw.section,
          filiere: newRaw.filiere,
        },
        ...prev,
      ]);
      toast.success("Classe ajoutée !");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      setPopupOpen(false);
      setSelectedFiliere(null);
      form.reset();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsAdding(false);
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

  const openEditPopup = (classe: Classe) => {
    setSelectedClasse(classe);
    setSelectedFiliere({
      value: classe.filiere.id,
      label: classe.filiere.nom,
    });
    setEditPopupOpen(true);
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
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="">Toutes sections</option>
            {sections.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

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
        </div>

        <button
          className={`btn btn-primary rounded-xl px-6 ${isAdding ? "loading" : ""
            }`}
          onClick={() => setPopupOpen(true)}
        >
          + Ajouter une classe
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
        <table className="table w-full">
          <thead className="bg-base-200 text-sm">
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Section</th>
              <th>
                <div
                  className="flex items-center gap-1 cursor-pointer select-none"
                  onClick={toggleFiliereSort}
                >
                  Filière
                  {filiereSortAsc === true && <LucideChevronUp size={14} />}
                  {filiereSortAsc === false && (
                    <LucideChevronDown size={14} />
                  )}
                </div>
              </th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedClasses.length ? (
              paginatedClasses.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.nom}</td>
                  <td>{c.section}</td>

                  {/* ✅ Correction ici */}
                  <td>{c.filiere?.nom ?? "Inconnue"}</td>

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
                <td colSpan={5} className="text-center py-6 text-gray-500">
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
            className="modal-box rounded-2xl max-w-md flex flex-col gap-4"
            onSubmit={handleAddClasse}
          >
            <h3 className="text-xl font-semibold">
              Ajouter une classe
            </h3>

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

            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPopupOpen(false)}
              >
                Annuler
              </button>
              <button className="btn btn-primary">
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
            <h3 className="text-xl font-semibold">
              Modifier la classe
            </h3>

            <input type="hidden" name="id" value={selectedClasse.id} />

            <input
              name="nom"
              defaultValue={selectedClasse.nom}
              className="input input-bordered w-full"
              required
            />
            <input
              name="section"
              defaultValue={selectedClasse.section}
              className="input input-bordered w-full"
              required
            />

            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
            />

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditPopupOpen(false)}
              >
                Annuler
              </button>
              <button className="btn btn-warning">
                Modifier
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
