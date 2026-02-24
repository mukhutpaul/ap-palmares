"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
    createEvaluation,
    getEvaluationsByFiliere,
    deleteEvaluation,
    updateEvaluation,
} from "@/app/actions/evaluation.actions";
import { getFilieres } from "@/app/actions/filieresActions";
import { getEtudiants } from "@/app/actions/etudiantsActions";
import { getSessions } from "@/app/actions/sessionsActions";
import { getAnneesAcademiques } from "@/app/actions/notesActions";
import { getCompetencesByFiliere } from "@/app/actions/competence.actions";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import { useSession } from "next-auth/react";
import EmptyStates from "@/app/components/EmptyStates";

interface Filiere { id: number; nom: string }
interface Etudiant { id: number; prenom: string; nom: string; postnom: string }
interface CompetenceScore { competenceId: number; competenceNom: string; coefficient: number; score: number }
interface Evaluation {
    id: number;
    etudiant: Etudiant | null;
    filiere: Filiere | null;
    session: { id: number; dateDebut: string; dateFin: string } | null;
    anneeAcademique: { id: number; annee: string } | null;
    competences: CompetenceScore[];
    moyenne: number;
    createdAt: Date;
}

export default function EvaluationsClient() {
    const { data: session } = useSession();

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [annees, setAnnees] = useState<any[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);
    const [selectedFiliere, setSelectedFiliere] = useState<any>(null);
    const [selectedEtudiant, setSelectedEtudiant] = useState<any>(null);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [selectedAnnee, setSelectedAnnee] = useState<any>(null);
    const [formScores, setFormScores] = useState<CompetenceScore[]>([]);
    const [editEvaluation, setEditEvaluation] = useState<Evaluation | null>(null);
    const [detailEvaluation, setDetailEvaluation] = useState<Evaluation | null>(null);
    const [search, setSearch] = useState("");

    // ---------------- INIT ----------------
    useEffect(() => {
        async function init() {
            try {
                const [filieresData, etudiantsData, sessionsData, anneesData] =
                    await Promise.all([
                        getFilieres(),
                        getEtudiants(),
                        getSessions(),
                        getAnneesAcademiques(),
                    ]);

                setFilieres(filieresData);
                setEtudiants(etudiantsData);
                setSessions(sessionsData);
                setAnnees(anneesData);

                if (filieresData.length > 0) {
                    const defaultFiliere = {
                        value: filieresData[0].id,
                        label: filieresData[0].nom,
                    };
                    setSelectedFiliere(defaultFiliere);
                    fetchEvaluations(defaultFiliere.value);
                }
            } catch {
                toast.error("Impossible de charger les données");
            }
        }
        init();
    }, []);

    useEffect(() => {
        if (selectedFiliere) fetchEvaluations(selectedFiliere.value);
    }, [selectedFiliere]);

    const fetchEvaluations = async (filiereId: number) => {
        try {
            const data = await getEvaluationsByFiliere(filiereId);
            setEvaluations(
                data.map((e: any) => ({
                    ...e,
                    createdAt: new Date(e.createdAt),
                }))
            );
        } catch {
            toast.error("Impossible de charger les évaluations");
        }
    };

    const openEditPopup = async (evaluation: Evaluation) => {
        if (!evaluation.filiere) return;

        try {
            const competences = await getCompetencesByFiliere(evaluation.filiere.id);

            const competencesWithScores: CompetenceScore[] = competences.map(c => {
                const existingScore = evaluation.competences.find(ec => ec.competenceId === c.id);
                return {
                    competenceId: c.id,
                    competenceNom: c.nom,
                    coefficient: c.coefficient,
                    score: existingScore ? existingScore.score : 0,
                };
            });

            setEditEvaluation({ ...evaluation, competences: competencesWithScores });
        } catch {
            toast.error("Impossible de charger les compétences pour l'édition");
        }
    };

    const handleOpenDetail = async (evaluation: Evaluation) => {
        if (!evaluation.filiere) return;

        try {
            // Récupérer toutes les compétences de la filière
            const competences = await getCompetencesByFiliere(evaluation.filiere.id);

            // Créer la liste complète avec score et coefficient
            const competencesWithScores: CompetenceScore[] = competences.map(c => {
                const existing = evaluation.competences.find(ec => ec.competenceId === c.id);
                return {
                    competenceId: c.id,
                    competenceNom: c.nom || "Compétence inconnue",
                    coefficient: c.coefficient,  // ⚠️ ajoute le coefficient ici
                    score: existing ? existing.score : 0
                };
            });

            setDetailEvaluation({ ...evaluation, competences: competencesWithScores });
        } catch {
            toast.error("Impossible de charger les détails des compétences");
        }
    };
    // ---------------- COMPETENCES ----------------
    useEffect(() => {
        async function fetchCompetences() {
            if (!selectedFiliere) return;
            try {
                const data = await getCompetencesByFiliere(
                    selectedFiliere.value
                );
                setFormScores(
                    data.map((c) => ({
                        competenceId: c.id,
                        competenceNom: c.nom,
                        coefficient: c.coefficient,
                        score: 0,
                    }))
                );
            } catch {
                toast.error("Impossible de charger les compétences");
            }
        }
        fetchCompetences();
    }, [selectedFiliere]);

    // ---------------- OPTIONS ----------------
    const filiereOptions = filieres.map((f) => ({
        value: f.id,
        label: f.nom,
    }));

    const etudiantOptions = etudiants.map((e) => ({
        value: e.id,
        label: `${e.nom} ${e.postnom} ${e.prenom}`,
    }));

    const sessionsOptions = sessions.map((s) => ({
        value: s.id,
        label: `${new Date(s.dateDebut).toLocaleDateString("fr-FR")} - ${new Date(
            s.dateFin
        ).toLocaleDateString("fr-FR")}`,
    }));

    const anneeOptions = annees.map((a) => ({
        value: a.id,
        label: a.annee,
    }));

    // ---------------- ADD ----------------
    const handleAddEvaluation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFiliere || !selectedEtudiant || !selectedSession || !selectedAnnee)
            return toast.error("Remplir tous les champs");

        try {
            await createEvaluation({
                etudiantId: selectedEtudiant.value,
                filiereId: selectedFiliere.value,
                sessionId: selectedSession.value,
                anneeAcademiqueId: selectedAnnee.value,
                scores: formScores.map((s) => ({
                    competenceId: s.competenceId,
                    score: s.score,
                })),
                userId: session?.user?.id || "unknown",
            });

            toast.success("Évaluation ajoutée");
            setPopupOpen(false);
            fetchEvaluations(selectedFiliere.value);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // ---------------- DELETE ----------------
    const handleDeleteEvaluation = async (id: number) => {
        const result = await Swal.fire({
            title: "Supprimer cette évaluation ?",
            icon: "warning",
            showCancelButton: true,
        });
        if (!result.isConfirmed) return;

        await deleteEvaluation(id);
        setEvaluations((prev) => prev.filter((e) => e.id !== id));
        toast.success("Évaluation supprimée");
    };

    // ---------------- FILTER ----------------
    const filteredEvaluations = evaluations.filter((e) => {
        const query = search.toLowerCase();
        if (!query) return true;

        const student =
            e.etudiant &&
            `${e.etudiant.nom} ${e.etudiant.postnom} ${e.etudiant.prenom}`.toLowerCase();

        return student?.includes(query) || e.filiere?.nom.toLowerCase().includes(query);
    });

    // ---------------- UI ----------------
    return (
        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-6">
                Gestion des évaluations
            </h1>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow w-full lg:w-80">
                    <LucideSearch size={18} className="text-gray-400" />
                    <input
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent outline-none"
                    />
                </div>

                <button
                    className="btn btn-accent rounded-xl w-full lg:w-auto"
                    onClick={() => setPopupOpen(true)}
                >
                    + Ajouter évaluation
                </button>
            </div>

            {/* TABLE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvaluations.length ? filteredEvaluations.map(e => (
                    <div
                        key={e.id}
                        className="bg-base-100 border rounded-xl shadow hover:shadow-lg transition-shadow duration-300 p-5 flex flex-col justify-between"
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-gray-700">ID #{e.id}</span>
                            <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold
                    ${e.moyenne >= 14 ? 'bg-green-500' : e.moyenne >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                {e.moyenne?.toFixed(2)}
                            </span>
                        </div>

                        {/* CONTENT */}
                        <div className="space-y-2 text-sm sm:text-base">
                            <div>
                                <span className="font-semibold text-gray-600">Étudiant:</span>
                                <p className="text-gray-800">{e.etudiant ? `${e.etudiant.nom} ${e.etudiant.postnom} ${e.etudiant.prenom}` : "—"}</p>
                            </div>

                            <div>
                                <span className="font-semibold text-gray-600">Filière:</span>
                                <p className="text-gray-800">{e.filiere?.nom || "—"}</p>
                            </div>

                            <div>
                                <span className="font-semibold text-gray-600">Session:</span>
                                <p className="text-gray-800">
                                    {e.session?.dateDebut && e.session?.dateFin
                                        ? `${new Date(e.session.dateDebut).toLocaleDateString("fr-FR")} - ${new Date(
                                            e.session.dateFin
                                        ).toLocaleDateString("fr-FR")}`
                                        : "—"}
                                </p>
                            </div>

                            <div>
                                <span className="font-semibold text-gray-600">Année:</span>
                                <p className="text-gray-800">{e.anneeAcademique?.annee || "—"}</p>
                            </div>

                            <div>
                                <span className="font-semibold text-gray-600">Date:</span>
                                <p className="text-gray-800">{e.createdAt.toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="btn btn-xs btn-outline btn-info hover:bg-blue-500 hover:text-white transition-colors"
                                 onClick={() => handleOpenDetail(e)}
                            >
                                Détails
                            </button>
                            <button
                                className="btn btn-xs btn-outline btn-warning hover:bg-yellow-500 hover:text-white transition-colors"
                                onClick={() => openEditPopup(e)}
                            >
                                <LucideEdit2 size={14} />
                            </button>

                            <button
                                className="btn btn-xs btn-outline btn-error hover:bg-red-500 hover:text-white transition-colors"
                                onClick={() => handleDeleteEvaluation(e.id)}
                            >
                                <LucideTrash2 size={14} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        <EmptyStates IconComponent={"Inbox"} message="Aucune évaluation trouvée" sm={true}/>
                    </div>
                )}
            </div>


            {/* Add Evaluation Modal */}
            {popupOpen && (
                <dialog className="modal modal-open">
                    <form className="modal-box max-w-lg w-full p-8 flex flex-col gap-4" onSubmit={handleAddEvaluation}>
                        <button type="button" className="btn btn-ghost btn-sm absolute right-4 top-4" onClick={() => setPopupOpen(false)}>✕</button>
                        <h3 className="text-2xl font-bold text-center">Nouvelle évaluation</h3>

                        <Select options={etudiantOptions} value={selectedEtudiant} onChange={o => setSelectedEtudiant(o as any)} placeholder="Sélectionner un étudiant" />
                        <Select options={filiereOptions} value={selectedFiliere} onChange={o => setSelectedFiliere(o as any)} placeholder="Sélectionner une filière" />
                        <Select options={sessionsOptions} value={selectedSession} onChange={o => setSelectedSession(o as any)} placeholder="Sélectionner une session" />
                        <Select options={anneeOptions} value={selectedAnnee} onChange={o => setSelectedAnnee(o as any)} placeholder="Sélectionner l'année académique" />

                        {formScores.length === 0 ? (
                            <p className="text-gray-500 text-sm">Sélectionner une filière pour voir les compétences</p>
                        ) : formScores.map((c, idx) => (
                            <div key={c.competenceId} className="flex flex-col mb-2">
                                <label className="text-sm font-medium mb-1">{c.competenceNom} (Coefficient: {c.coefficient})</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    value={isNaN(c.score) ? 0 : c.score}
                                    onChange={e => {
                                        const newScores = [...formScores];
                                        newScores[idx].score = parseFloat(e.target.value) || 0;
                                        setFormScores(newScores);
                                    }}
                                />
                            </div>
                        ))}

                        <div className="modal-action justify-center mt-6">
                            <button type="submit" className="btn btn-accent w-full">Ajouter</button>
                        </div>
                    </form>
                </dialog>
            )}

            {/* Détail Evaluation Modal */}
            {/* Détail Evaluation Modal */}
            {detailEvaluation && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-lg w-full p-6 flex flex-col gap-4">
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-4 top-4"
                            onClick={() => setDetailEvaluation(null)}
                        >
                            ✕
                        </button>
                        <h3 className="text-xl font-bold text-center">Détails des notes</h3>

                        <p className="text-sm text-gray-500">
                            Étudiant: {detailEvaluation.etudiant?.nom} {detailEvaluation.etudiant?.postnom} {detailEvaluation.etudiant?.prenom}
                        </p>
                        <p className="text-sm text-gray-500">
                            Filière: {detailEvaluation.filiere?.nom}
                        </p>

                        <div className="mt-4 space-y-2">
                            {detailEvaluation.competences.map((c) => (
                                <div key={c.competenceId} className="flex justify-between text-sm">
                                    <span>{c.competenceNom || "Compétence inconnue"}</span>
                                    <span>{c.score?.toFixed(2) || 0} / 5</span>
                                </div>
                            ))}
                        </div>

                        {/* Somme et moyenne */}
                        <div className="mt-4 border-t pt-2 text-sm font-medium flex justify-between">
                            <span>Somme:</span>
                            <span>
                                {detailEvaluation.competences.reduce((sum, c) => sum + (c.score || 0), 0).toFixed(2)} / {detailEvaluation.competences.length * 5}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span>Moyenne:</span>
                            <span>
                                {(
                                    detailEvaluation.competences.reduce((sum, c) => sum + (c.score || 0), 0) /
                                    detailEvaluation.competences.length
                                ).toFixed(2)} / 5
                            </span>
                        </div>
                    </div>
                </dialog>
            )}




            {/* Edit Evaluation Modal */}



            {editEvaluation && (
                <dialog className="modal modal-open">
                    <form
                        className="modal-box max-w-lg w-full p-8 flex flex-col gap-4"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editEvaluation) return;

                            try {
                                await updateEvaluation(editEvaluation.id, editEvaluation.competences.map(s => ({ competenceId: s.competenceId, score: s.score })));
                                toast.success("Évaluation mise à jour !");
                                setEditEvaluation(null);
                                if (selectedFiliere) fetchEvaluations(selectedFiliere.value);
                            } catch (err: any) {
                                toast.error(err.message || "Erreur lors de la modification");
                            }
                        }}
                    >
                        <button type="button" className="btn btn-ghost btn-sm absolute right-4 top-4" onClick={() => setEditEvaluation(null)}>✕</button>
                        <h3 className="text-2xl font-bold text-center">Modifier l'évaluation</h3>

                        <p className="text-sm text-gray-500">Étudiant: {editEvaluation.etudiant?.nom} {editEvaluation.etudiant?.postnom} {editEvaluation.etudiant?.prenom}</p>
                        <p className="text-sm text-gray-500">Filière: {editEvaluation.filiere?.nom}</p>

                        {editEvaluation.competences.map((c, idx) => (
                            <div key={c.competenceId} className="flex flex-col mb-2">
                                <label className="text-sm font-medium mb-1">{c.competenceNom} (Coefficient: {c.coefficient})</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    value={c.score}
                                    onChange={e => {
                                        const newScores = [...editEvaluation.competences];
                                        newScores[idx].score = parseFloat(e.target.value) || 0;
                                        setEditEvaluation({ ...editEvaluation, competences: newScores });
                                    }}
                                />
                            </div>
                        ))}

                        <div className="modal-action justify-center mt-6">
                            <button type="submit" className="btn btn-accent w-full">Modifier</button>
                        </div>
                    </form>
                </dialog>
            )}
        </div>
    );
}
