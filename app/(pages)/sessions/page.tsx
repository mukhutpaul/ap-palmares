"use client";

import {
    addSession,
    updateSession,
    deleteSession,
    getSessions,
} from "@/app/actions/sessionsActions";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import Swal from "sweetalert2";

type Session = {
    id: number;
    designation: string;
    dateDebut: Date;
    dateFin: Date;
};

export default function SessionsClient() {
    const [popupOpen, setPopupOpen] = useState(false);
    const [editPopupOpen, setEditPopupOpen] = useState(false);

    const [sessionList, setSessionList] = useState<Session[]>([]);
    const [search, setSearch] = useState("");
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    /* ---------------- EFFECTS ---------------- */
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const sessions = await getSessions();
            setSessionList(
                sessions.map((s) => ({
                    ...s,
                    dateDebut: new Date(s.dateDebut),
                    dateFin: new Date(s.dateFin),
                }))
            );
        } catch {
            toast.error("Impossible de charger les sessions");
        }
    };

    /* ---------------- ACTIONS ---------------- */
    const handleAddSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        setIsAdding(true);
        try {
            const newSession = await addSession(formData);
            setSessionList((prev) => [newSession, ...prev]);
            toast.success("Session ajoutée !");
            setPopupOpen(false);
            form.reset();
        } catch {
            toast.error("Erreur lors de l'ajout de la session");
        } finally {
            setIsAdding(false);
        }
    };

    const openEditPopup = (session: Session) => {
        setSelectedSession(session);
        setEditPopupOpen(true);
    };

    const handleUpdateSession = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedSession) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        formData.append("id", selectedSession.id.toString());

        try {
            const updated = await updateSession(formData);
            setSessionList((prev) =>
                prev.map((s) => (s.id === updated.id ? updated : s))
            );
            toast.success("Session modifiée !");
            setEditPopupOpen(false);
            setSelectedSession(null);
        } catch {
            toast.error("Erreur lors de la modification");
        }
    };

    const handleDeleteSession = async (id: number) => {
        const result = await Swal.fire({
            title: "Supprimer cette session ?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Supprimer",
            cancelButtonText: "Annuler",
        });

        if (result.isConfirmed) {
            await deleteSession(id);
            setSessionList((prev) => prev.filter((s) => s.id !== id));
            toast.success("Session supprimée !");
        }
    };

    /* ---------------- UI ---------------- */
    const filteredSessions = sessionList.filter((s) =>
        s.designation.toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const paginatedSessions = filteredSessions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="relative max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">Gestion des sessions</h1>
                <p className="text-gray-500 mt-1">Administration et organisation des sessions</p>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
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

                <button
                    className={`btn btn-accent rounded-xl px-6 ${isAdding ? "loading" : ""}`}
                    onClick={() => setPopupOpen(true)}
                >
                    + Ajouter une session
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
                <table className="table w-full">
                    <thead className="bg-base-200 text-sm">
                        <tr>
                            <th>ID</th>
                            <th>Désignation</th>
                            <th>Date Début</th>
                            <th>Date Fin</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedSessions.length ? (
                            paginatedSessions.map((s) => (
                                <tr key={s.id}>
                                    <td>{s.id}</td>
                                    <td>{s.designation}</td>
                                    <td>{s.dateDebut.toLocaleDateString()}</td>
                                    <td>{s.dateFin.toLocaleDateString()}</td>
                                    <td className="text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                className="btn btn-xs btn-outline btn-warning"
                                                onClick={() => openEditPopup(s)}
                                            >
                                                <LucideEdit2 size={14} />
                                            </button>
                                            <button
                                                className="btn btn-xs btn-outline btn-error"
                                                onClick={() => handleDeleteSession(s.id)}
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
                                    Aucune session trouvée
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

            {/* POPUP AJOUT */}
            {popupOpen && (
                <dialog className="modal modal-open">
                    <form
                        className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
                        onSubmit={handleAddSession}
                    >
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-4 top-4"
                            onClick={() => setPopupOpen(false)}
                        >
                            ✕
                        </button>

                        <h3 className="text-2xl font-bold text-center mb-4">Ajouter une session</h3>

                        <input name="designation" className="input input-bordered w-full" placeholder="Désignation" required />
                        <input type="date" name="dateDebut" className="input input-bordered w-full" required />
                        <input type="date" name="dateFin" className="input input-bordered w-full" required />

                        <div className="modal-action justify-center mt-6">
                            <button type="submit" className="btn btn-accent w-full text-lg">Ajouter</button>
                        </div>
                    </form>
                </dialog>
            )}

            {/* POPUP MODIFIER */}
            {editPopupOpen && selectedSession && (
                <dialog className="modal modal-open">
                    <form
                        className="modal-box rounded-3xl max-w-lg w-full p-8 flex flex-col gap-5 relative"
                        onSubmit={handleUpdateSession}
                    >
                        {/* Bouton fermer en X */}
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-4 top-4"
                            onClick={() => setEditPopupOpen(false)}
                        >
                            ✕
                        </button>

                        {/* Titre */}
                        <h3 className="text-2xl font-bold text-center mb-4">Modifier la session</h3>

                        {/* Champs */}
                        <input type="hidden" name="id" value={selectedSession.id} />

                        <input
                            name="designation"
                            defaultValue={selectedSession.designation}
                            className="input input-bordered w-full"
                            placeholder="Désignation"
                            required
                        />
                        <input
                            type="date"
                            name="dateDebut"
                            defaultValue={selectedSession.dateDebut.toISOString().split("T")[0]}
                            className="input input-bordered w-full"
                            required
                        />
                        <input
                            type="date"
                            name="dateFin"
                            defaultValue={selectedSession.dateFin.toISOString().split("T")[0]}
                            className="input input-bordered w-full"
                            required
                        />

                        {/* Bouton Modifier */}
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
