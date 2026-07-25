"use client";

import {
  addEvaluationTheorie,
  deleteEvaluationTheorie,
  updateEvaluationTheorie,
  getEvaluationTheories,
} from "@/app/actions/evaluationTheorieAction";

import { getFilieres } from "@/app/actions/filieresActions";
import { getEtudiants } from "@/app/actions/classesActions";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import Swal from "sweetalert2";
import Select from "react-select";
import EmptyStates from "@/app/components/EmptyStates";
import { TextDecoder } from "node:util";

type Evaluation = {
  id: number;
  score: number;
  etudiant: {
    id: number;
    nom: string;
    postnom: string;
    prenom: string;
    filiere: string;
    session: string | null;
    matricule?: string;
  };
  createdAt: Date;
};

export default function EvaluationTheorieClient() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [list, setList] = useState<Evaluation[]>([]);
  const [filieres, setFilieres] = useState<any[]>([]);
  const [etudiants, setEtudiants] = useState<any[]>([]);

  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);

  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);

  const [selectedFiliere, setSelectedFiliere] = useState<any>(null);
  const [selectedEtudiant, setSelectedEtudiant] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [filiereFilter, setFiliereFilter] = useState("");

  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    getEvaluationTheories().then((data: any[]) =>
      setList(
        data.map((e) => ({
          ...e,
          createdAt: new Date(e.createdAt),
        })),
      ),
    );
  }, []);

  useEffect(() => {
    getFilieres().then(setFilieres);
    getEtudiants().then(setEtudiants);
  }, []);

  /* ---------------- OPTIONS ---------------- */

  const filiereOptions = filieres.map((f) => ({
    value: f.id,
    label: f.nom,
  }));

  const etudiantOptions = etudiants.map((e) => ({
    value: e.id,
    label: `${e.nom} ${e.postnom} ${e.prenom} - ${e.session || "Sans session"} - ${e.filiere || "Sans session"}`,
  }));

  /* ---------------- FILTER ---------------- */

  let filtered = list.filter((e) => {
    const matchesSearch = e.etudiant.nom
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFiliere =
      filiereFilter === "" || e.filiere?.nom === filiereFilter;

    return matchesSearch && matchesFiliere;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ---------------- ACTIONS ---------------- */

  const handleAdd = async (e: any) => {
    e.preventDefault();

    if (!userId || !selectedEtudiant) {
      toast.error("Veuillez sélectionner un étudiant !");
      return;
    }

    const form = new FormData(e.target);

    form.append("userId", userId);
    form.append("etudiantId", selectedEtudiant.value);

    try {
      const res = await addEvaluationTheorie(form);

      setList((prev) => [
        {
          ...res,
          createdAt: new Date(res.createdAt),
        },
        ...prev,
      ]);

      setShowConfetti(true);

      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      toast.success("Évaluation ajoutée !");

      setPopupOpen(false);

      setSelectedEtudiant(null);
      setSelectedFiliere(null);

      e.target.reset();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleUpdate = async (e: any) => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      const updated = await updateEvaluationTheorie(form);

      const normalizedUpdate: Evaluation = {
        ...updated,
        createdAt: new Date(updated.createdAt),
        etudiant: {
          ...updated.etudiant,
          filiere: updated.etudiant.filiere ?? "",
          session: updated.etudiant.session ?? "",
        },
      };

      setList((prev) =>
        prev.map((item) =>
          item.id === normalizedUpdate.id ? normalizedUpdate : item,
        ),
      );

      toast.success("Modifié !");
      setEditPopupOpen(false);
      setSelectedEval(null);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la modification");
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer cette évaluation ?",
      icon: "warning",
      showCancelButton: true,
    });

    if (result.isConfirmed) {
      await deleteEvaluationTheorie(id);
      setList((prev) => prev.filter((i) => i.id !== id));
      toast.success("Supprimé !");
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
        <h1 className="text-3xl font-semibold">Evaluation Théorique</h1>
        <p className="text-gray-500">Gestion des évaluations théoriques</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        {/* Recherche + Filtre */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Recherche */}
          <div className="flex items-center gap-3 px-4 py-3 bg-base-100 border rounded-2xl shadow-sm w-full sm:w-80 focus-within:border-primary transition">
            <LucideSearch size={18} className="text-gray-400" />

            <input
              className="outline-none bg-transparent w-full text-sm"
              placeholder="Rechercher un étudiant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtre filière */}
          <div className="relative">
            <select
              className="
          select select-bordered 
          rounded-2xl 
          w-full sm:w-64
          bg-base-100
          shadow-sm
          focus:outline-none
        "
              value={filiereFilter}
              onChange={(e) => setFiliereFilter(e.target.value)}
            >
              <option value="">Toutes les filières</option>

              {filieres.map((f) => (
                <option key={f.id} value={f.nom}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bouton ajout */}
        <button
          className="
            btn btn-accent
            rounded-2xl
            px-6
            shadow-md
            hover:shadow-lg
            transition
            w-full lg:w-auto
            "
          onClick={() => setPopupOpen(true)}
        >
          <span className="text-lg">+</span>
          Ajouter une évaluation
        </button>
      </div>

      {/* TABLE */}
      {/* TABLE */}
      <div className="bg-base-100 rounded-2xl border shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr className="text-sm uppercase text-gray-600">
                <th>Étudiant</th>
                <th>Filière</th>
                <th className="text-center">Score</th>
                <th>Session</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginated.length > 0 ? (
                paginated.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-base-200/60 transition duration-200"
                  >
                    {/* ETUDIANT */}
                    <td>
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-11 h-11 flex items-center justify-center">
                            <span className="text-sm font-bold uppercase">
                              {e.etudiant.nom?.charAt(0) || ""}
                              {e.etudiant.postnom?.charAt(0) || ""}
                            </span>
                          </div>
                        </div>

                        <div className="leading-tight">
                          <p className="font-semibold">
                            {e.etudiant.nom} {e.etudiant.postnom}
                          </p>

                          <p className="text-sm text-gray-500">
                            {e.etudiant.prenom}
                          </p>

                          {e.etudiant.matricule && (
                            <p className="text-xs text-gray-400 mt-1">
                              Matricule : {e.etudiant.matricule}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* FILIERE */}
                    <td>
                      <span className="badge badge-info badge-outline rounded-full px-4 py-3">
                        {e.etudiant.filiere || "Non définie"}
                      </span>
                    </td>

                    {/* SCORE */}
                    <td className="text-center">
                      <span
                        className={`
                    inline-flex items-center justify-center
                    min-w-20 px-4 py-2 rounded-full
                    text-white font-bold text-sm
                    ${
                      e.score >= 14
                        ? "bg-green-500"
                        : e.score >= 10
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }
                  `}
                      >
                        {e.score.toFixed(2)} / 20
                      </span>
                    </td>

                    {/* SESSION */}
                    <td>
                      {e.etudiant.session ? (
                        <span className="font-medium text-sm">
                          {e.etudiant.session}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Sans session
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="flex justify-center gap-3">
                        <button
                          className="btn btn-sm btn-circle btn-outline btn-warning"
                          title="Modifier"
                          onClick={() => {
                            setSelectedEval(e);
                            setEditPopupOpen(true);
                          }}
                        >
                          <LucideEdit2 size={16} />
                        </button>

                        <button
                          className="btn btn-sm btn-circle btn-outline btn-error"
                          title="Supprimer"
                          onClick={() => handleDelete(e.id)}
                        >
                          <LucideTrash2 size={16} />
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
                        message="Aucune évaluation"
                      />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === currentPage ? "btn-primary" : ""}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ADD POPUP */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleAdd}
          >
            {/* ❌ CROIX FERMETURE */}
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setPopupOpen(false)}
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-center mb-4">
              Nouvelle évaluation
            </h3>

            <Select
              options={etudiantOptions}
              value={selectedEtudiant}
              onChange={setSelectedEtudiant}
              placeholder="Etudiant"
            />

            <input
              name="score"
              className="input input-bordered w-full"
              placeholder="Score"
              required
            />

            <div className="modal-action justify-center mt-6">
              <button className="btn btn-accent w-full text-lg">Ajouter</button>
            </div>
          </form>
        </dialog>
      )}

      {/* EDIT POPUP */}
      {editPopupOpen && selectedEval && (
        <dialog className="modal modal-open">
          <form
            className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
            onSubmit={handleUpdate}
          >
            {/* ❌ CROIX */}
            <button
              type="button"
              className="btn btn-ghost btn-sm absolute right-4 top-4"
              onClick={() => setEditPopupOpen(false)}
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-center mb-4">
              Modifier l'évaluation
            </h3>

            <input type="hidden" name="id" value={selectedEval.id} />

            <input
              name="score"
              defaultValue={selectedEval.score}
              className="input input-bordered w-full"
              required
            />

            <div className="modal-action justify-center mt-6">
              <button className="btn btn-accent w-full text-lg">
                Modifier
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
