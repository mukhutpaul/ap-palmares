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
import {
    LucideEdit2,
    LucideTrash2,
    LucideSearch,
} from "lucide-react";
import Swal from "sweetalert2";
import Select from "react-select";
import EmptyStates from "@/app/components/EmptyStates";


type Evaluation = {
    id: number;
    score: number;
    etudiant: any;
    filiere: any;
    session: any;
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
                }))
            )
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
        label: `${e.nom} ${e.postnom} ${e.prenom}`,
    }));

    /* ---------------- FILTER ---------------- */

    let filtered = list.filter((e) => {
        const matchesSearch =
            e.etudiant.nom.toLowerCase().includes(search.toLowerCase());

        const matchesFiliere =
            filiereFilter === "" || e.filiere?.nom === filiereFilter;

        return matchesSearch && matchesFiliere;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    /* ---------------- ACTIONS ---------------- */

    const handleAdd = async (e: any) => {
        e.preventDefault();

        if (!userId || !selectedEtudiant || !selectedFiliere) {
            toast.error("Champs requis !");
            return;
        }

        const form = new FormData(e.target);

        form.append("userId", userId);
        form.append("etudiantId", selectedEtudiant.value);
        form.append("filiereId", selectedFiliere.value);

        try {
            const res = await addEvaluationTheorie(form);

            setList((prev) => [res, ...prev]);

            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);

            toast.success("Evaluation ajoutée !");
            setPopupOpen(false);

            setSelectedEtudiant(null);
            setSelectedFiliere(null);
        } catch {
            toast.error("Erreur");
        }
    };

    const handleUpdate = async (e: any) => {
        e.preventDefault();

        const form = new FormData(e.target);

        try {
            const updated = await updateEvaluationTheorie(form);

            setList((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i))
            );

            toast.success("Modifié !");
            setEditPopupOpen(false);
        } catch {
            toast.error("Erreur");
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
                <h1 className="text-3xl font-semibold">
                    Evaluation Théorique
                </h1>
                <p className="text-gray-500">
                    Gestion des évaluations théoriques
                </p>
            </div>

            {/* TOOLBAR */}
            <div className="flex justify-between mb-6">
                <div className="flex gap-3">

                    <div className="flex items-center gap-2 px-4 py-2 border rounded-xl">
                        <LucideSearch size={18} />
                        <input
                            className="outline-none"
                            placeholder="Rechercher étudiant..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="select select-bordered"
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
                    className="btn btn-accent"
                    onClick={() => setPopupOpen(true)}
                >
                    + Ajouter
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-xl border">
                <table className="table w-full">
                    <thead>
                        <tr>
                            <th>Etudiant</th>
                            <th>Filière</th>
                            <th>Score</th>
                            <th>Session</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {paginated.length ? (
                            paginated.map((e) => (
                                <tr key={e.id}>
                                    <td>
                                        {e.etudiant.nom} {e.etudiant.postnom}
                                    </td>
                                    <td>{e.filiere.nom}</td>
                                    <td>{e.score}</td>
                                    <td>
                                        {new Date(e.session.dateDebut).toLocaleDateString()} -{" "}
                                        {new Date(e.session.dateFin).toLocaleDateString()}
                                    </td>

                                    <td>
                                        <button onClick={() => {
                                            setSelectedEval(e);
                                            setEditPopupOpen(true);
                                        }}>
                                            <LucideEdit2 size={16} />
                                        </button>

                                        <button onClick={() => handleDelete(e.id)}>
                                            <LucideTrash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5}>
                                    <EmptyStates IconComponent={"Inbox"} message="Aucune évaluation" />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                            <button
                                key={p}
                                className={`btn btn-sm ${p === currentPage ? "btn-primary" : ""}`}
                                onClick={() => setCurrentPage(p)}
                            >
                                {p}
                            </button>
                        )
                    )}
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

                        <Select
                            options={filiereOptions}
                            value={selectedFiliere}
                            onChange={setSelectedFiliere}
                            placeholder="Filière"
                        />

                        <input
                            name="score"
                            className="input input-bordered w-full"
                            placeholder="Score"
                            required
                        />

                        <div className="modal-action justify-center mt-6">
                            <button className="btn btn-accent w-full text-lg">
                                Ajouter
                            </button>
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