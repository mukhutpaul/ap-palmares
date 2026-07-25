"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import ReactConfetti from "react-confetti";
import {
  LucideEdit2,
  LucideTrash2,
  LucideSearch,
  LucideChevronUp,
  LucideChevronDown,
} from "lucide-react";

import { getFilieres, syncFilieres } from "@/app/actions/filieresActions";
import EmptyStates from "@/app/components/EmptyStates";
import {
  addModule,
  deleteModule,
  getModules,
  updateModule,
} from "@/app/actions/moduleCotationActions";

type ModuleUI = {
  id: number;
  intitule: string;
  max: number;
  filiere: {
    id: number;
    nom: string;
  } | null;
  createdAt: Date;
};

export default function ModulesClient() {
  const [modules, setModules] = useState<ModuleUI[]>([]);
  const [filiereOptions, setFiliereOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedFiliere, setSelectedFiliere] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleUI | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortAsc, setSortAsc] = useState<boolean | null>(null);

  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        await syncFilieres(); // Synchronise les filières depuis l'API
        await fetchFilieres(); // Recharge la table Filiere
        await fetchModules();
      } catch (e) {
        console.error(e);
      }
    };

    load();
  }, []);

  const fetchModules = async () => {
    try {
      const data = await getModules();
      setModules(
        data.map((m) => ({
          id: m.id,
          intitule: m.intitule,
          max: m.max,
          filiere: m.filiere ? { id: m.filiere.id, nom: m.filiere.nom } : null,
          createdAt: new Date(m.createdAt),
        })),
      );
    } catch {
      toast.error("Impossible de charger les modules");
    }
  };

  const fetchFilieres = async () => {
    try {
      const data = await getFilieres();

      const options = data.map((f) => ({
        value: f.id.toString(),
        label: f.nom,
      }));

      setFiliereOptions(options);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger les filières");
    }
  };

  // Filtrage + recherche
  let filteredModules = modules.filter((m) => {
    const matchesSearch = m.intitule
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFiliere = selectedFiliere
      ? m.filiere === selectedFiliere.value
      : true;
    return matchesSearch && matchesFiliere;
  });

  if (sortAsc !== null) {
    filteredModules.sort((a, b) =>
      sortAsc
        ? (a.intitule ?? "").localeCompare(b.intitule ?? "")
        : (b.intitule ?? "").localeCompare(a.intitule ?? ""),
    );
  }

  const totalPages = Math.ceil(filteredModules.length / itemsPerPage);
  const paginatedModules = filteredModules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const toggleSort = () => {
    if (sortAsc === null) setSortAsc(true);
    else if (sortAsc === true) setSortAsc(false);
    else setSortAsc(null);
  };

  /* ---------------- ACTIONS ---------------- */
  const handleAddModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedFiliere) {
      return toast.error("Veuillez sélectionner une filière !");
    }

    setIsAdding(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value);

    try {
      const res = await addModule(formData);

      if (!res.success) {
        return toast.error(res.error || "Erreur inconnue");
      }

      await fetchModules(); // Recharge la liste des modules

      toast.success("Module ajouté !");
      setPopupOpen(false);
      setSelectedFiliere(null);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'ajout du module",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const openEditPopup = (module: ModuleUI) => {
    setSelectedModule(module);
    setSelectedFiliere(
      module.filiere
        ? {
            value: module.filiere.id.toString(),
            label: module.filiere.nom,
          }
        : null,
    );
    setEditPopupOpen(true);
  };

  const handleUpdateModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModule || !selectedFiliere)
      return toast.error("Veuillez remplir tous les champs !");

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value.toString());

    try {
      const res = await updateModule(formData);
      if (!res?.success) return toast.error(res?.error || "Erreur inconnue");
      if (!res.data) return toast.error("Module non mis à jour");

      const updated = res.data;
      setModules((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? {
                id: updated.id,
                intitule: updated.intitule,
                max: updated.max,
                filiere: updated.filiere
                  ? { id: updated.filiere.id, nom: updated.filiere.nom }
                  : null,
                createdAt: new Date(updated.createdAt),
              }
            : m,
        ),
      );

      toast.success("Module modifié !");
      setEditPopupOpen(false);
      setSelectedModule(null);
      setSelectedFiliere(null);
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };
  const handleDeleteModule = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer ce module ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await deleteModule(id);
      if (!res.success) return toast.error(res.error);
      setModules((prev) => prev.filter((m) => m.id !== id));
      toast.success("Module supprimé !");
    } catch {
      toast.error("Erreur lors de la suppression");
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

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Gestion des modules
        </h1>
        <p className="text-gray-500 mt-1">
          Création et gestion des modules de formation
        </p>
      </div>

      {/* Toolbar */}
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

          <Select
            options={filiereOptions}
            value={selectedFiliere}
            onChange={(opt) => setSelectedFiliere(opt)}
            placeholder="Filtrer par filière"
            isClearable
            className="w-48"
          />
        </div>

        <button
          className={`btn btn-accent rounded-xl px-6 ${isAdding ? "loading" : ""}`}
          onClick={() => setPopupOpen(true)}
        >
          + Ajouter un module
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
        <table className="table w-full">
          <thead className="bg-base-200 text-sm">
            <tr>
              <th>ID</th>
              <th>
                <div
                  className="flex items-center gap-1 cursor-pointer select-none"
                  onClick={toggleSort}
                >
                  Intitulé {sortAsc === true && <LucideChevronUp size={14} />}
                  {sortAsc === false && <LucideChevronDown size={14} />}
                </div>
              </th>
              <th>Max</th>
              <th>Filière</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginatedModules.length ? (
              paginatedModules.map((m) => (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.intitule}</td>
                  <td>{m.max}</td>
                  <td>{m.filiere?.nom ?? "Inconnue"}</td>
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn btn-xs btn-outline btn-warning"
                        onClick={() => openEditPopup(m)}
                      >
                        <LucideEdit2 size={14} />
                      </button>
                      <button
                        className="btn btn-xs btn-outline btn-error"
                        onClick={() => handleDeleteModule(m.id)}
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
                  <EmptyStates
                    IconComponent={"Inbox"}
                    message="Aucun module trouvé"
                    sm={true}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

      {/* Ajouter Popup */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleAddModule}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setPopupOpen(false)}
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-center mb-4">
              Nouveau Module
            </h3>
            <input
              name="intitule"
              className="input input-bordered w-full"
              placeholder="Intitulé"
              required
            />
            <input
              type="number"
              step="0.01"
              name="max"
              className="input input-bordered w-full"
              placeholder="Score max"
              required
            />
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />
            <div className="modal-action justify-center mt-6">
              <button type="submit" className="btn btn-accent w-full text-lg">
                Ajouter
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Modifier Popup */}
      {editPopupOpen && selectedModule && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleUpdateModule}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setEditPopupOpen(false)}
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-center mb-4">
              Modifier le module
            </h3>
            <input type="hidden" name="id" value={selectedModule.id} />
            <input
              name="intitule"
              defaultValue={selectedModule.intitule}
              className="input input-bordered w-full"
              placeholder="Intitulé"
              required
            />
            <input
              type="number"
              step="0.01"
              name="max"
              defaultValue={selectedModule.max}
              className="input input-bordered w-full"
              placeholder="Score max"
              required
            />
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />
            <div className="modal-action justify-center mt-6">
              <button type="submit" className="btn btn-accent w-full text-lg">
                Modifier
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
