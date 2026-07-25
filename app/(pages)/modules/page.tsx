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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredModules.length / itemsPerPage),
  );
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

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-base-content">
          Gestion des modules
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Création, organisation et suivi des modules de formation
        </p>
      </div>

      {/* TOOLBAR */}
      <div className="bg-base-100 border rounded-2xl shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* RECHERCHE + FILTRE */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* SEARCH */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-base-200/40 focus-within:border-primary transition w-full sm:w-80">
              <LucideSearch size={18} className="text-gray-400" />

              <input
                className="bg-transparent outline-none w-full text-sm"
                placeholder="Rechercher un module..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* FILIERE */}
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => {
                setSelectedFiliere(opt);
                setCurrentPage(1);
              }}
              placeholder="Filtrer par filière"
              isClearable
              className="w-full sm:w-60"
              classNamePrefix="select"
            />
          </div>

          {/* ACTION */}
          <button
            className={`
        btn btn-accent rounded-xl px-6 shadow-sm
        hover:shadow-md transition
        ${isAdding ? "loading" : ""}
      `}
            onClick={() => setPopupOpen(true)}
          >
            + Ajouter un module
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-base-100 rounded-2xl border shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr className="text-sm uppercase text-gray-600">
                <th className="w-20">ID</th>

                <th>
                  <div
                    className="
                flex items-center gap-2 
                cursor-pointer select-none
                hover:text-primary
                transition
              "
                    onClick={toggleSort}
                  >
                    Intitulé
                    {sortAsc === true && <LucideChevronUp size={15} />}
                    {sortAsc === false && <LucideChevronDown size={15} />}
                  </div>
                </th>

                <th className="text-center">Maximum</th>

                <th>Filière</th>

                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedModules.length ? (
                paginatedModules.map((m) => (
                  <tr
                    key={m.id}
                    className="
                hover:bg-base-200/60
                transition
                duration-200
              "
                  >
                    {/* ID */}
                    <td>
                      <span className="badge badge-ghost rounded-full">
                        #{m.id}
                      </span>
                    </td>

                    {/* INTITULE */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div
                            className="
                        bg-secondary
                        text-secondary-content
                        rounded-full
                        w-10
                        h-10
                        flex
                        items-center
                        justify-center
                      "
                          >
                            <span className="font-bold text-sm uppercase">
                              {m.intitule?.charAt(0)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold">{m.intitule}</p>

                          <p className="text-xs text-gray-400">
                            Module #{m.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* MAX */}
                    <td className="text-center">
                      <span
                        className="
                    inline-flex
                    items-center
                    justify-center
                    min-w-16
                    px-4
                    py-2
                    rounded-full
                    bg-green-500
                    text-white
                    font-semibold
                    text-sm
                  "
                      >
                        {m.max}
                      </span>
                    </td>

                    {/* FILIERE */}
                    <td>
                      <span
                        className="
                    badge
                    badge-info
                    badge-outline
                    rounded-full
                    px-4
                    py-3
                  "
                      >
                        {m.filiere?.nom ?? "Inconnue"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="flex justify-center gap-3">
                        <button
                          className="
                      btn
                      btn-sm
                      btn-circle
                      btn-outline
                      btn-warning
                    "
                          title="Modifier"
                          onClick={() => openEditPopup(m)}
                        >
                          <LucideEdit2 size={15} />
                        </button>

                        <button
                          className="
                      btn
                      btn-sm
                      btn-circle
                      btn-outline
                      btn-error
                    "
                          title="Supprimer"
                          onClick={() => handleDeleteModule(m.id)}
                        >
                          <LucideTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="py-12">
                      <EmptyStates
                        IconComponent={"Inbox"}
                        message="Aucun module trouvé"
                        sm={true}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6">
              <div className="join shadow-sm">
                {/* PRECEDENT */}
                <button
                  className="join-item btn btn-sm"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                >
                  ←
                </button>

                {/* PAGES */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      className={`join-item btn btn-sm ${
                        currentPage === page ? "btn-primary" : ""
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ),
                )}

                {/* SUIVANT */}
                <button
                  className="join-item btn btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
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
