"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
    createEvaluation,
    getEvaluationsByFiliere,
    deleteEvaluation,
    getCompetencesByModule,
    getModulesByFiliere,
    updateEvaluation,
} from "@/app/actions/evaluation.actions";
import { getFilieres } from "@/app/actions/filieresActions";
import { getEtudiants } from "@/app/actions/etudiantsActions";
import { useSession } from "next-auth/react";
import EmptyStates from "@/app/components/EmptyStates";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";

interface Filiere { id: number; nom: string }
interface Etudiant { id: number; prenom: string; nom: string; postnom: string }
interface Module { id: number; intitule: string }
interface CompetenceScore { competenceId: number; competenceNom: string; maxScore: number; score: number }
interface Evaluation {
    id: number;
    etudiant: Etudiant | null;
    filiere: Filiere | null;
    module: Module | null;
    competences: CompetenceScore[];
    moyenne: number;
    createdAt: Date;
}

export default function EvaluationsClient() {
    const { data: session } = useSession();

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [popupOpen, setPopupOpen] = useState(false);
    const [editEvaluation, setEditEvaluation] = useState<Evaluation | null>(null);

    const [selectedFiliere, setSelectedFiliere] = useState<any>(null);
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [selectedEtudiant, setSelectedEtudiant] = useState<any>(null);
    const [formScores, setFormScores] = useState<CompetenceScore[]>([]);
    const [detailEvaluation, setDetailEvaluation] = useState<Evaluation | null>(null);
    const [search, setSearch] = useState("");
    // Pour le popup de modification
    // Nouveau : pour choisir le module dont on veut ajouter les compétences
    const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<any>(null);

    // Nouveau : options des modules pour l’édition (de la filière de l’évaluation)
    const [moduleOptionsForEdit, setModuleOptionsForEdit] = useState<{ value: number; label: string }[]>([]);

    // ---------------- INIT ----------------
    useEffect(() => {
        async function init() {
            try {
                const [filieresData, etudiantsData] = await Promise.all([getFilieres(), getEtudiants()]);
                setFilieres(filieresData);
                setEtudiants(etudiantsData);

                if (filieresData.length > 0) {
                    const defaultFiliere = { value: filieresData[0].id, label: filieresData[0].nom };
                    setSelectedFiliere(defaultFiliere);
                    fetchEvaluations(defaultFiliere.value);
                }
            } catch {
                toast.error("Impossible de charger les données");
            }
        }
        init();
    }, []);

    // ---------------- FILIERE CHANGE ----------------
    useEffect(() => {
        if (!selectedFiliere) return;

        fetchEvaluations(selectedFiliere.value);

        async function fetchModules() {
            try {
                const data = await getModulesByFiliere(selectedFiliere.value);
                setModules(data);

                if (data.length > 0) {
                    const firstModule = { value: data[0].id, label: data[0].intitule };
                    setSelectedModule(firstModule);
                } else {
                    setSelectedModule(null);
                    setFormScores([]);
                }
            } catch {
                toast.error("Impossible de charger les modules");
            }
        }
        fetchModules();
    }, [selectedFiliere]);

    // ---------------- MODULE CHANGE ----------------
    useEffect(() => {
        if (!selectedModule) return;

        async function fetchCompetences() {
            try {
                const data = await getCompetencesByModule(selectedModule.value);
                setFormScores(
                    data.map(c => ({
                        competenceId: c.id,
                        competenceNom: c.nom,
                        maxScore: c.maxScore,
                        score: 0,
                    }))
                );
            } catch {
                toast.error("Impossible de charger les compétences du module");
            }
        }
        fetchCompetences();
    }, [selectedModule]);

    const fetchEvaluations = async (filiereId: number) => {
        try {
            const data = await getEvaluationsByFiliere(filiereId);
            setEvaluations(data.map((e: any) => ({ ...e, createdAt: new Date(e.createdAt) })));
        } catch {
            toast.error("Impossible de charger les évaluations");
        }
    };

    // ---------------- ADD EVALUATION ----------------
    const handleAddEvaluation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFiliere || !selectedModule || !selectedEtudiant) return toast.error("Remplir tous les champs");
        if (!session?.user) return toast.error("Utilisateur non authentifié");

        try {
            await createEvaluation({
                etudiantId: selectedEtudiant.value,
                filiereId: selectedFiliere.value,
                moduleId: selectedModule.value,
                scores: formScores.map(s => ({ competenceId: s.competenceId, score: s.score })),
                userEmail: session.user.email,
            });

            toast.success("Évaluation ajoutée");
            setPopupOpen(false);
            fetchEvaluations(selectedFiliere.value);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const openEditPopup = async (evaluation: Evaluation) => {
        if (!evaluation.module) return; // Vérifie qu'il y a un module

        try {
            // Récupérer les compétences du module de l'évaluation
            const competences = await getCompetencesByModule(evaluation.module.id);

            const competencesWithScores: CompetenceScore[] = competences.map(c => {
                // Vérifie s'il y a déjà une note pour cette compétence
                const existingScore = evaluation.competences.find(ec => ec.competenceId === c.id);
                return {
                    competenceId: c.id,
                    competenceNom: c.nom,
                    coefficient: c.coefficient, // tu peux aussi ajouter maxScore si nécessaire
                    maxScore: c.maxScore,
                    score: existingScore ? existingScore.score : 0,
                };
            });

            // Met à jour l'état pour ouvrir le popup avec les compétences et scores
            setEditEvaluation({ ...evaluation, competences: competencesWithScores });
        } catch {
            toast.error("Impossible de charger les compétences pour l'édition");
        }
    };
    // ---------------- DELETE ----------------
    const handleDeleteEvaluation = async (id: number) => {
        const result = await Swal.fire({ title: "Supprimer cette évaluation ?", icon: "warning", showCancelButton: true });
        if (!result.isConfirmed) return;
        await deleteEvaluation(id);
        setEvaluations(prev => prev.filter(e => e.id !== id));
        toast.success("Évaluation supprimée");
    };

    // ---------------- FILTER ----------------
    const filteredEvaluations = evaluations.filter(e => {
        const query = search.toLowerCase();
        if (!query) return true;
        const student = e.etudiant && `${e.etudiant.nom} ${e.etudiant.postnom} ${e.etudiant.prenom}`.toLowerCase();
        return student?.includes(query) || e.filiere?.nom.toLowerCase().includes(query) || e.module?.intitule.toLowerCase().includes(query);
    });

    // ---------------- OPTIONS ----------------
    const filiereOptions = filieres.map(f => ({ value: f.id, label: f.nom }));
    const moduleOptions = modules.map(m => ({ value: m.id, label: m.intitule }));
    const etudiantOptions = etudiants.map(e => ({ value: e.id, label: `${e.nom} ${e.postnom} ${e.prenom}` }));

    // ---------------- UI ----------------
    return (
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-semibold mb-6">Gestion des évaluations</h1>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border shadow w-full lg:w-80">
                    <LucideSearch size={18} className="text-gray-400" />
                    <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-transparent outline-none" />
                </div>
                <button className="btn btn-accent rounded-xl w-full lg:w-auto" onClick={() => setPopupOpen(true)}>+ Ajouter évaluation</button>
            </div>

            {/* TABLE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvaluations.length ? filteredEvaluations.map(e => (
                    <div key={e.id} className="bg-base-100 border rounded-xl shadow p-5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-bold text-gray-700">ID #{e.id}</span>
                            <span className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${e.moyenne >= 14 ? 'bg-green-500' : e.moyenne >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                {e.moyenne?.toFixed(2)}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <p><span className="font-semibold text-gray-600">Étudiant:</span> {e.etudiant ? `${e.etudiant.nom} ${e.etudiant.postnom} ${e.etudiant.prenom}` : "—"}</p>
                            <p><span className="font-semibold text-gray-600">Filière:</span> {e.filiere?.nom || "—"}</p>
                            <p><span className="font-semibold text-gray-600">Module:</span> {e.module?.intitule || "—"}</p>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button className="btn btn-xs btn-outline btn-info" onClick={() => setDetailEvaluation(e)}>Détails</button>
                            <button className="btn btn-xs btn-outline btn-warning"
                                onClick={() => openEditPopup(e)}
                            ><LucideEdit2 size={14} /></button>
                            <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDeleteEvaluation(e.id)}><LucideTrash2 size={14} /></button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        <EmptyStates IconComponent={"Inbox"} message="Aucune évaluation trouvée" sm={true} />
                    </div>
                )}
            </div>

            {/* ADD EVALUATION MODAL */}
            {popupOpen && (
                <dialog className="modal modal-open">
                    <form className="modal-box max-w-lg w-full p-8 flex flex-col gap-4" onSubmit={handleAddEvaluation}>
                        <button type="button" className="btn btn-ghost btn-sm absolute right-4 top-4" onClick={() => setPopupOpen(false)}>✕</button>
                        <h3 className="text-2xl font-bold text-center">Nouvelle évaluation</h3>

                        <Select options={etudiantOptions} value={selectedEtudiant} onChange={o => setSelectedEtudiant(o as any)} placeholder="Sélectionner un étudiant" />
                        <Select options={filiereOptions} value={selectedFiliere} onChange={o => setSelectedFiliere(o as any)} placeholder="Sélectionner une filière" />
                        <Select options={moduleOptions} value={selectedModule} onChange={o => setSelectedModule(o as any)} placeholder="Sélectionner un module" />

                        {formScores.length === 0 ? (
                            <p className="text-gray-500 text-sm">Sélectionner un module pour voir les compétences</p>
                        ) : formScores.map((c, idx) => (
                            <div key={c.competenceId} className="flex flex-col mb-2">
                                <label className="text-sm font-medium mb-1">{c.competenceNom} (Sur: {c.maxScore})</label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    value={c.score}
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

            {/* DETAIL EVALUATION */}
            {detailEvaluation && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-lg w-full p-6 flex flex-col gap-4">
                        <button type="button" className="btn btn-ghost btn-sm absolute right-4 top-4" onClick={() => setDetailEvaluation(null)}>✕</button>
                        <h3 className="text-xl font-bold text-center">Détails des notes</h3>

                        <p className="text-sm text-gray-500">
                            Étudiant: {detailEvaluation.etudiant?.nom} {detailEvaluation.etudiant?.postnom} {detailEvaluation.etudiant?.prenom}
                        </p>
                        <p className="text-sm text-gray-500">
                            Filière: {detailEvaluation.filiere?.nom}
                        </p>
                        <p className="text-sm text-gray-500">
                            Module: {detailEvaluation.module?.intitule}
                        </p>

                        <div className="mt-4 space-y-2">
                            {detailEvaluation.competences.map(c => (
                                <div key={c.competenceId} className="flex justify-between text-sm">
                                    <span>{c.competenceNom}</span>
                                    <span>{c.score?.toFixed(2) ?? 0} / {c.maxScore}</span>
                                </div>
                            ))}
                        </div>

                        {(() => {
                            const totalScore = detailEvaluation.competences.reduce((sum, c) => sum + (c.score || 0), 0);
                            const totalMax = detailEvaluation.competences.reduce((sum, c) => sum + (c.maxScore || 0), 0);
                            const moyenne = totalMax > 0 ? (totalScore / totalMax) * 20 : 0;
                            return (
                                <>
                                    <div className="mt-4 border-t pt-2 text-sm font-medium flex justify-between">
                                        <span>Somme:</span>
                                        <span>{totalScore.toFixed(2)} / {totalMax}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium">
                                        <span>Moyenne:</span>
                                        <span>{moyenne.toFixed(2)} / 20</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </dialog>
            )}

            {editEvaluation && (
                <dialog className="modal modal-open">
                    <form
                        className="modal-box max-w-lg w-full p-8 flex flex-col gap-4"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (!editEvaluation) return;

                            try {
                                // Mettre à jour les compétences existantes
                                await updateEvaluation(editEvaluation.id, editEvaluation.competences.map((s) => ({
                                    competenceId: s.competenceId,
                                    score: s.score,
                                })));

                                toast.success("Évaluation mise à jour !");
                                setEditEvaluation(null);
                                if (selectedFiliere) fetchEvaluations(selectedFiliere.value);
                            } catch (err: any) {
                                toast.error(err.message || "Erreur lors de la modification");
                            }
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-4 top-4"
                            onClick={() => setEditEvaluation(null)}
                        >
                            ✕
                        </button>

                        <h3 className="text-2xl font-bold text-center">Modifier l'évaluation</h3>

                        <p className="text-sm text-gray-500">
                            Étudiant: {editEvaluation.etudiant?.nom} {editEvaluation.etudiant?.postnom} {editEvaluation.etudiant?.prenom}
                        </p>
                        <p className="text-sm text-gray-500">Filière: {editEvaluation.filiere?.nom}</p>

                        {/* ---------------- Module selection pour ajouter compétences ---------------- */}
                        <Select
                            options={moduleOptionsForEdit}
                            value={selectedModuleForEdit}
                            onChange={async (o) => {
                                setSelectedModuleForEdit(o);
                                if (!o) return;

                                // Charger les compétences du module sélectionné
                                const data = await getCompetencesByModule(o.value);

                                // Filtrer celles qui existent déjà pour éviter doublons
                                const existingIds = editEvaluation.competences.map((c) => c.competenceId);
                                const newCompetences = data
                                    .filter((c) => !existingIds.includes(c.id))
                                    .map((c) => ({
                                        competenceId: c.id,
                                        competenceNom: c.nom,
                                        maxScore: c.maxScore,
                                        score: 0,
                                        coefficient: c.coefficient,
                                    }));

                                setEditEvaluation({
                                    ...editEvaluation,
                                    competences: [...editEvaluation.competences, ...newCompetences],
                                });
                            }}
                            placeholder="Sélectionner un module pour ajouter des compétences"
                        />

                        {/* ---------------- Scores des compétences ---------------- */}
                        {editEvaluation.competences.map((c, idx) => (
                            <div key={c.competenceId} className="flex flex-col mb-2">
                                <label className="text-sm font-medium mb-1">
                                    {c.competenceNom} (Sur: {c.maxScore})
                                </label>
                                <input
                                    type="number"
                                    className="input input-bordered w-full"
                                    value={c.score}
                                    onChange={(e) => {
                                        const newScores = [...editEvaluation.competences];
                                        newScores[idx].score = parseFloat(e.target.value) || 0;
                                        setEditEvaluation({ ...editEvaluation, competences: newScores });
                                    }}
                                />
                            </div>
                        ))}

                        <div className="modal-action justify-center mt-6">
                            <button type="submit" className="btn btn-accent w-full">
                                Modifier
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
        </div>
    );
}