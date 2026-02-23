"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
    createEvaluation,
    getEvaluationsByFiliere,
    deleteEvaluation,
} from "@/app/actions/evaluation.actions";
import { getFilieres } from "@/app/actions/filieresActions";
import { getEtudiants } from "@/app/actions/etudiantsActions";
import { getSessions } from "@/app/actions/sessionsActions";
import { getAnneesAcademiques } from "@/app/actions/notesActions";
import { getCompetencesByFiliere } from "@/app/actions/competence.actions";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import { useSession } from "next-auth/react";

interface Filiere { id: number; nom: string }
interface Etudiant { id: number; prenom: string; nom: string }
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
    const [selectedFiliere, setSelectedFiliere] = useState<{ value: number; label: string } | null>(null);
    const [selectedEtudiant, setSelectedEtudiant] = useState<{ value: number; label: string } | null>(null);
    const [selectedSession, setSelectedSession] = useState<{ value: number; label: string } | null>(null);
    const [selectedAnnee, setSelectedAnnee] = useState<{ value: number; label: string } | null>(null);
    const [formScores, setFormScores] = useState<CompetenceScore[]>([]);
    const [search, setSearch] = useState("");

    // ---------------- FETCH INITIAL DATA ----------------
    useEffect(() => {
        async function init() {
            try {
                const [filieresData, etudiantsData, sessionsData, anneesData] = await Promise.all([
                    getFilieres(),
                    getEtudiants(),
                    getSessions(),
                    getAnneesAcademiques(),
                ]);
                setFilieres(filieresData);
                setEtudiants(etudiantsData);
                setSessions(sessionsData);
                setAnnees(anneesData);

                // Sélection par défaut de la première filière et fetch des évaluations
                if (filieresData.length > 0) {
                    const defaultFiliere = { value: filieresData[0].id, label: filieresData[0].nom };
                    setSelectedFiliere(defaultFiliere);
                    fetchEvaluations(defaultFiliere.value);
                }
            } catch {
                toast.error("Impossible de charger les données initiales");
            }
        }
        init();
    }, []);

    // ---------------- FETCH EVALUATIONS QUAND FILIERE CHANGE ----------------
    useEffect(() => {
        if (selectedFiliere) {
            fetchEvaluations(selectedFiliere.value);
        }
    }, [selectedFiliere]);

    const fetchEvaluations = async (filiereId: number) => {
        try {
            const data = await getEvaluationsByFiliere(filiereId);
            setEvaluations(data.map((e: any) => ({ ...e, createdAt: new Date(e.createdAt) })));
        } catch {
            toast.error("Impossible de charger les évaluations");
        }
    };

    // ---------------- FETCH COMPETENCES ----------------
    useEffect(() => {
        async function fetchCompetences() {
            if (!selectedFiliere) return;
            try {
                const data = await getCompetencesByFiliere(selectedFiliere.value);
                const initialScores: CompetenceScore[] = data.map(c => ({
                    competenceId: c.id,
                    competenceNom: c.nom,
                    coefficient: c.coefficient,
                    score: 0,
                }));
                setFormScores(initialScores);
            } catch {
                toast.error("Impossible de charger les compétences");
            }
        }
        fetchCompetences();
    }, [selectedFiliere]);

    // ---------------- SELECT OPTIONS ----------------
    const filiereOptions = filieres.map(f => ({ value: f.id, label: f.nom }));
    const etudiantOptions = etudiants.map(e => ({ value: e.id, label: `${e.prenom} ${e.nom}` }));
    const sessionsOptions = sessions.map(s => ({
        value: s.id,
        label: `${new Date(s.dateDebut).toLocaleDateString()} - ${new Date(s.dateFin).toLocaleDateString()}`,
    }));
    const anneeOptions = annees.map(a => ({ value: a.id, label: a.annee }));

    // ---------------- ACTIONS ----------------
    const handleAddEvaluation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFiliere || !selectedEtudiant || !selectedSession || !selectedAnnee || formScores.length === 0) {
            toast.error("Remplir tous les champs !");
            return;
        }

        try {
            await createEvaluation({
                etudiantId: selectedEtudiant.value,
                filiereId: selectedFiliere.value,
                sessionId: selectedSession.value,
                anneeAcademiqueId: selectedAnnee.value,
                scores: formScores.map(s => ({ competenceId: s.competenceId, score: s.score })),
                userId: session?.user?.id || "unknown",
            });

            toast.success("Évaluation ajoutée !");
            setPopupOpen(false);
            setFormScores([]);
            fetchEvaluations(selectedFiliere.value); // 🔥 rafraîchit le tableau
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la création");
        }
    };

    const handleDeleteEvaluation = async (id: number) => {
        const result = await Swal.fire({
            title: "Supprimer cette évaluation ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });
        if (!result.isConfirmed) return;

        try {
            await deleteEvaluation(id);
            setEvaluations(prev => prev.filter(e => e.id !== id));
            toast.success("Évaluation supprimée !");
        } catch {
            toast.error("Impossible de supprimer l'évaluation");
        }
    };

    // ---------------- UI ----------------
    return (
        <div className="relative max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-semibold mb-4">Gestion des évaluations</h1>

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow w-72">
                    <LucideSearch size={18} className="text-gray-400" />
                    <input
                        placeholder="Rechercher..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-transparent outline-none"
                    />
                </div>
                <button className="btn btn-accent rounded-xl px-6" onClick={() => setPopupOpen(true)}>
                    + Ajouter évaluation
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border shadow bg-base-100">
                <table className="table w-full">
                    <thead className="bg-base-200">
                        <tr>
                            <th>ID</th>
                            <th>Étudiant</th>
                            <th>Filière</th>
                            <th>Moyenne</th>
                            <th>Date</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.length ? evaluations.map(e => (
                            <tr key={e.id}>
                                <td>{e.id}</td>
                                <td>{e.etudiant ? `${e.etudiant.prenom} ${e.etudiant.nom}` : "—"}</td>
                                <td>{e.filiere?.nom || "—"}</td>
                                <td>{e.moyenne?.toFixed(2)}</td>
                                <td>{e.createdAt.toLocaleDateString()}</td>
                                <td className="text-center">
                                    <div className="flex justify-center gap-2">
                                        <button className="btn btn-xs btn-outline btn-warning">
                                            <LucideEdit2 size={14} />
                                        </button>
                                        <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDeleteEvaluation(e.id)}>
                                            <LucideTrash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-gray-500">
                                    Aucune évaluation trouvée
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
                            <input
                                key={c.competenceId}
                                type="number"
                                className="input input-bordered w-full"
                                value={isNaN(c.score) ? 0 : c.score}
                                onChange={e => {
                                    const newScores = [...formScores];
                                    newScores[idx].score = parseFloat(e.target.value) || 0;
                                    setFormScores(newScores);
                                }}
                                placeholder={`${c.competenceNom} (Coefficient: ${c.coefficient})`}
                            />
                        ))}

                        <div className="modal-action justify-center mt-6">
                            <button type="submit" className="btn btn-accent w-full">Ajouter</button>
                        </div>
                    </form>
                </dialog>
            )}
        </div>
    );
}