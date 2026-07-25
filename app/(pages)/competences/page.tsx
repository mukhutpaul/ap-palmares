"use client";

import { useState, useEffect } from "react";
import Select, { SingleValue } from "react-select";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  createCompetence,
  updateCompetence,
  deleteCompetence,
  getCompetences,
} from "@/app/actions/competence.actions";

import {
  LucideEdit2,
  LucideTrash2,
  LucideSearch,
  LucideChevronUp,
  LucideChevronDown,
} from "lucide-react";
import EmptyStates from "@/app/components/EmptyStates";
import { getModules } from "@/app/actions/moduleCotationActions";

interface ModuleCotation {
  id: number;
  intitule: string; // obligatoire
}

interface CompetencePayload {
  nom: string;
  maxScore: number;
  coefficient: number;
  moduleCotationId: number;
}

interface Competence {
  id: number;
  nom: string;
  maxScore: number;
  coefficient: number;
  moduleCotationId: number;
  moduleCotation?: ModuleCotation | null;
  createdAt: Date;
}

interface FormState {
  nom: string;
  maxScore: number;
  coefficient?: number;
}

export default function CompetencesClient() {
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [modules, setModules] = useState<ModuleCotation[]>([]);
  const [search, setSearch] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedCompetence, setSelectedCompetence] =
    useState<Competence | null>(null);
  const [selectedModule, setSelectedModule] =
    useState<SingleValue<{ value: number; label: string }>>(null);
  const [moduleSortAsc, setModuleSortAsc] = useState<boolean | null>(null);

  const [form, setForm] = useState<FormState>({
    nom: "",
    maxScore: 0,
    coefficient: 1,
  });

  /* ---------------- EFFECTS ---------------- */
  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (modules.length > 0) {
      fetchCompetences();
    }
  }, [modules]);

  const fetchModules = async () => {
    try {
      const data = await getModules();
      setModules(data);
    } catch {
      toast.error("Impossible de charger les modules");
    }
  };

  const fetchCompetences = async () => {
    try {
      const data = await getCompetences();
      setCompetences(
        data.map((c: any) => ({ ...c, createdAt: new Date(c.createdAt) })),
      );
    } catch {
      toast.error("Impossible de charger les compétences");
    }
  };

  const moduleOptions = modules.map((m) => ({
    value: m.id,
    label: m.intitule, // utiliser intitule ici
  }));

  /* ---------------- FILTER / SORT ---------------- */
  let filteredCompetences = competences.filter((c) =>
    c.nom.toLowerCase().includes(search.toLowerCase()),
  );

  if (moduleSortAsc !== null) {
    filteredCompetences = [...filteredCompetences].sort((a, b) =>
      moduleSortAsc
        ? (a.moduleCotation?.intitule ?? "").localeCompare(
            b.moduleCotation?.intitule ?? "",
          )
        : (b.moduleCotation?.intitule ?? "").localeCompare(
            a.moduleCotation?.intitule ?? "",
          ),
    );
  }

  const toggleModuleSort = () => {
    if (moduleSortAsc === null) setModuleSortAsc(true);
    else if (moduleSortAsc === true) setModuleSortAsc(false);
    else setModuleSortAsc(null);
  };

  /* ---------------- ACTIONS ---------------- */
  const handleAddCompetence = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModule || !form.nom || !form.maxScore) {
      toast.error("Remplir tous les champs !");
      return;
    }

    const payload: CompetencePayload = {
      nom: form.nom,
      maxScore: form.maxScore,
      coefficient: form.coefficient ?? 1,
      moduleCotationId: selectedModule.value,
    };

    const res = await createCompetence(payload);
    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success("Compétence ajoutée !");
    if (!res?.data) return;

    setCompetences((prev) => [
      {
        id: res.data.id,
        nom: res.data.nom!,
        maxScore: res.data.maxScore!,
        coefficient: res.data.coefficient!,
        moduleCotationId: res.data.moduleCotationId!,
        moduleCotation: {
          id: selectedModule.value,
          intitule: selectedModule.label,
        },
        createdAt: new Date(res.data.createdAt),
      },
      ...prev,
    ]);

    setPopupOpen(false);
    setForm({ nom: "", maxScore: 0, coefficient: 1 });
    setSelectedModule(null);
  };

  const openEditPopup = (c: Competence) => {
    setSelectedCompetence(c);
    setForm({
      nom: c.nom,
      maxScore: c.maxScore,
      coefficient: c.coefficient,
    });

    const selected = moduleOptions.find((m) => m.value === c.moduleCotationId);
    setSelectedModule(selected ?? null);

    setEditPopupOpen(true);
  };

  const handleUpdateCompetence = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!selectedCompetence || !selectedModule) return;

    const payload: CompetencePayload = {
      nom: form.nom,
      maxScore: form.maxScore,
      coefficient: form.coefficient ?? 1,
      moduleCotationId: selectedModule.value,
    };

    const res = await updateCompetence(selectedCompetence.id, payload);
    if (!res.success) {
      toast.error(res.error);
      return;
    }

    toast.success("Compétence modifiée !");
    if (!res?.data) return;

    setCompetences((prev) =>
      prev.map((c) =>
        c.id === selectedCompetence.id
          ? {
              id: res.data.id,
              nom: res.data.nom!,
              maxScore: res.data.maxScore!,
              coefficient: res.data.coefficient!,
              moduleCotationId: res.data.moduleCotationId!,
              moduleCotation: {
                id: selectedModule.value,
                intitule: selectedModule.label,
              },
              createdAt: new Date(res.data.createdAt),
            }
          : c,
      ),
    );

    setEditPopupOpen(false);
    setSelectedCompetence(null);
    setSelectedModule(null);
  };

  const handleDeleteCompetence = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer cette compétence ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    const res = await deleteCompetence(id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }

    setCompetences((prev) => prev.filter((c) => c.id !== id));
    toast.success("Compétence supprimée !");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Gestion des compétences
        </h1>
        <p className="text-gray-500 mt-1">
          Administration des compétences par module
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-base-100 shadow-sm w-72">
          <LucideSearch size={18} className="text-gray-400" />
          <input
            className="w-full bg-transparent outline-none text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          className="btn btn-accent rounded-xl px-6"
          onClick={() => setPopupOpen(true)}
        >
          + Ajouter compétence
        </button>
      </div>

      {/* Table */}
      <div className="bg-base-100 rounded-2xl border shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr className="text-sm uppercase text-gray-600">
                <th className="w-20">ID</th>

                <th>Compétence</th>

                <th>
                  <div
                    className="flex items-center gap-2 cursor-pointer select-none hover:text-primary transition"
                    onClick={toggleModuleSort}
                  >
                    Module
                    {moduleSortAsc === true && <LucideChevronUp size={15} />}
                    {moduleSortAsc === false && <LucideChevronDown size={15} />}
                  </div>
                </th>

                <th className="text-center">Score max</th>

                <th className="text-center">Coefficient</th>

                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCompetences.length ? (
                filteredCompetences.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-base-200/60 transition duration-200"
                  >
                    {/* ID */}
                    <td>
                      <span className="badge badge-ghost rounded-full">
                        #{c.id}
                      </span>
                    </td>

                    {/* NOM COMPETENCE */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div
                            className="
                      bg-primary 
                      text-primary-content 
                      rounded-full 
                      w-10 
                      h-10 
                      flex 
                      items-center 
                      justify-center
                    "
                          >
                            <span className="font-bold text-sm uppercase">
                              {c.nom?.charAt(0)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold">{c.nom}</p>

                          <p className="text-xs text-gray-400">
                            Compétence #{c.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* MODULE */}
                    <td>
                      <span className="badge badge-info badge-outline rounded-full px-4 py-3">
                        {c.moduleCotation?.intitule ?? "Inconnu"}
                      </span>
                    </td>

                    {/* SCORE MAX */}
                    <td className="text-center">
                      <span
                        className="
                  inline-flex 
                  items-center 
                  justify-center
                  min-w-16
                  px-3 
                  py-2
                  rounded-full
                  bg-green-500
                  text-white
                  font-semibold
                  text-sm
                "
                      >
                        {c.maxScore}
                      </span>
                    </td>

                    {/* COEFFICIENT */}
                    <td className="text-center">
                      <span
                        className="
                  badge 
                  badge-warning 
                  rounded-full
                  px-4
                  py-3
                "
                      >
                        x{c.coefficient}
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
                          onClick={() => openEditPopup(c)}
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
                          onClick={() => handleDeleteCompetence(c.id)}
                        >
                          <LucideTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="py-12">
                      <EmptyStates
                        IconComponent={"Inbox"}
                        message="Aucune compétence trouvée"
                        sm={true}
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleAddCompetence}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setPopupOpen(false)}
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-center mb-4">
              Nouvelle compétence
            </h3>

            <input
              name="nom"
              placeholder="Nom"
              className="input input-bordered w-full"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />

            <input
              type="number"
              name="maxScore"
              placeholder="Score max"
              className="input input-bordered w-full"
              required
              value={form.maxScore ?? ""}
              onChange={(e) =>
                setForm({ ...form, maxScore: parseFloat(e.target.value) || 0 })
              }
            />

            <input
              type="number"
              name="coefficient"
              placeholder="Coefficient"
              className="input input-bordered w-full"
              value={form.coefficient ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  coefficient:
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                })
              }
            />

            <Select
              options={moduleOptions}
              value={selectedModule}
              onChange={setSelectedModule}
              placeholder="Sélectionner un module"
            />

            <div className="modal-action justify-center mt-6">
              <button type="submit" className="btn btn-accent w-full text-lg">
                Ajouter
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* Edit Modal */}
      {editPopupOpen && selectedCompetence && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleUpdateCompetence}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setEditPopupOpen(false)}
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-center mb-4">
              Modifier compétence
            </h3>

            <input
              type="text"
              name="nom"
              placeholder="Nom"
              className="input input-bordered w-full"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />

            <input
              type="number"
              name="maxScore"
              placeholder="Score max"
              className="input input-bordered w-full"
              required
              value={form.maxScore ?? ""}
              onChange={(e) =>
                setForm({ ...form, maxScore: parseFloat(e.target.value) || 0 })
              }
            />

            <input
              type="number"
              name="coefficient"
              placeholder="Coefficient"
              className="input input-bordered w-full"
              value={form.coefficient ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  coefficient:
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                })
              }
            />

            <Select
              options={moduleOptions}
              value={selectedModule}
              onChange={setSelectedModule}
              placeholder="Sélectionner un module"
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
