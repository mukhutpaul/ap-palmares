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
import { getFilieres } from "@/app/actions/filieresActions";
import EmptyStates from "@/app/components/EmptyStates";

interface Filiere {
    id: number;
    nom: string;
}

interface CompetencePayload {
    nom: string;
    maxScore: number;
    coefficient: number;
    filiereId: number;
}

interface Competence {
    id: number;
    nom: string;
    maxScore: number;
    coefficient: number;
    filiereId: number;
    filiere?: Filiere | null;
    createdAt: Date;
}

interface FormState {
    nom: string;
    maxScore: number;
    coefficient?: number; // optionnel pour permettre champ vide temporaire
}

export default function CompetencesClient() {
    const [competences, setCompetences] = useState<Competence[]>([]);
    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [search, setSearch] = useState("");
    const [popupOpen, setPopupOpen] = useState(false);
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const [selectedCompetence, setSelectedCompetence] = useState<Competence | null>(null);
    const [selectedFiliere, setSelectedFiliere] = useState<SingleValue<{ value: number; label: string }>>(null);
    const [filiereSortAsc, setFiliereSortAsc] = useState<boolean | null>(null);

    const [form, setForm] = useState<FormState>({
        nom: "",
        maxScore: 0,
        coefficient: 1,
    });

    /* ---------------- EFFECTS ---------------- */
    useEffect(() => {
        fetchCompetences();
        fetchFilieres();
    }, []);

    const fetchCompetences = async () => {
        try {
            const data = await getCompetences();
            setCompetences(
                data.map((c: any) => ({
                    ...c,
                    createdAt: new Date(c.createdAt),
                }))
            );
        } catch {
            toast.error("Impossible de charger les compétences");
        }
    };

    const fetchFilieres = async () => {
        try {
            const data = await getFilieres();
            setFilieres(data);
        } catch {
            toast.error("Impossible de charger les filières");
        }
    };

    const filiereOptions = filieres.map((f) => ({
        value: f.id,
        label: f.nom,
    }));

    /* ---------------- FILTER / SORT ---------------- */
    let filteredCompetences = competences.filter((c) =>
        c.nom.toLowerCase().includes(search.toLowerCase())
    );

    if (filiereSortAsc !== null) {
        filteredCompetences = [...filteredCompetences].sort((a, b) =>
            filiereSortAsc
                ? (a.filiere?.nom ?? "").localeCompare(b.filiere?.nom ?? "")
                : (b.filiere?.nom ?? "").localeCompare(a.filiere?.nom ?? "")
        );
    }

    const toggleFiliereSort = () => {
        if (filiereSortAsc === null) setFiliereSortAsc(true);
        else if (filiereSortAsc === true) setFiliereSortAsc(false);
        else setFiliereSortAsc(null);
    };

    /* ---------------- ACTIONS ---------------- */
    const handleAddCompetence = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFiliere || !form.nom || !form.maxScore) {
            toast.error("Remplir tous les champs !");
            return;
        }

        const payload: CompetencePayload = {
            nom: form.nom,
            maxScore: form.maxScore,
            coefficient: form.coefficient ?? 1,
            filiereId: selectedFiliere.value,
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
                ...res.data,
                filiere: { id: selectedFiliere.value, nom: selectedFiliere.label },
                createdAt: new Date(res.data.createdAt),
            } as Competence,
            ...prev,
        ]);

        setPopupOpen(false);
        setForm({ nom: "", maxScore: 0, coefficient: 1 });
        setSelectedFiliere(null);
    };

    const openEditPopup = (c: Competence) => {
        setSelectedCompetence(c);
        setForm({
            nom: c.nom,
            maxScore: c.maxScore,
            coefficient: c.coefficient,
        });
        setSelectedFiliere(c.filiere ? { value: c.filiere.id, label: c.filiere.nom } : null);
        setEditPopupOpen(true);
    };

    const handleUpdateCompetence = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCompetence || !selectedFiliere) return;

        const payload: CompetencePayload = {
            nom: form.nom,
            maxScore: form.maxScore,
            coefficient: form.coefficient ?? 1,
            filiereId: selectedFiliere.value,
        };

        const res = await updateCompetence(selectedCompetence.id, payload);

        if (!res.success) {
            toast.error(res.error);
            return;
        }

        toast.success("Compétence modifiée !");

        if (!res?.data) return;

        // ⚡ Met à jour la compétence avec la filière sélectionnée
        setCompetences((prev) =>
            prev.map((c) =>
                c.id === selectedCompetence.id
                    ? {
                          id: res.data.id,
                          nom: res.data.nom,
                          maxScore: res.data.maxScore,
                          coefficient: res.data.coefficient,
                          filiereId: res.data.filiereId,
                          filiere: { id: selectedFiliere.value, nom: selectedFiliere.label },
                          createdAt: new Date(res.data.createdAt),
                      }
                    : c
            )
        );

        setEditPopupOpen(false);
        setSelectedCompetence(null);
        setSelectedFiliere(null);
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
                <p className="text-gray-500 mt-1">Administration des compétences par filière</p>
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
            <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
                <table className="table w-full">
                    <thead className="bg-base-200 text-sm">
                        <tr>
                            <th>ID</th>
                            <th>Nom</th>
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
                            <th>Score max</th>
                            <th>Coefficient</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCompetences.length ? (
                            filteredCompetences.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.id}</td>
                                    <td>{c.nom}</td>
                                    <td>{c.filiere?.nom ?? "Inconnue"}</td>
                                    <td>{c.maxScore}</td>
                                    <td>{c.coefficient}</td>
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
                                                onClick={() => handleDeleteCompetence(c.id)}
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
                                    <EmptyStates IconComponent={"Inbox"} message="Aucune compétence trouvée" sm={true}/>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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

                        <h3 className="text-2xl font-bold text-center mb-4">Nouvelle compétence</h3>

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
                                        e.target.value === "" ? undefined : parseFloat(e.target.value),
                                })
                            }
                        />

                        <Select
                            options={filiereOptions}
                            value={selectedFiliere}
                            onChange={setSelectedFiliere}
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

                        <h3 className="text-2xl font-bold text-center mb-4">Modifier compétence</h3>

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
                                        e.target.value === "" ? undefined : parseFloat(e.target.value),
                                })
                            }
                        />

                        <Select
                            options={filiereOptions}
                            value={selectedFiliere}
                            onChange={setSelectedFiliere}
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