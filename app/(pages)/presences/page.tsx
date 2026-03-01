"use client";

import { getStudentsByFiliere, markOrUpdatePresence } from "@/app/actions/presenceActions";
import { getFilieres } from "@/app/actions/filieresActions";
import { Filiere } from "@prisma/client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";

type FiliereOption = {
    value: number;
    label: string;
};

type Student = {
    id: number;
    nom: string;
    postnom: string;
    prenom: string;
};

export default function PresenceClient({ userId }: { userId: string }) {
    const [choosePopup, setChoosePopup] = useState(false);
    const [callPopup, setCallPopup] = useState(false);

    const [filieres, setFilieres] = useState<Filiere[]>([]);
    const [selectedFiliere, setSelectedFiliere] = useState<FiliereOption | null>(null);

    const [students, setStudents] = useState<Student[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [sessionId, setSessionId] = useState<number | null>(null);
    const [anneeId, setAnneeId] = useState<number | null>(null);

    /* ---------------- LOAD FILIERES ---------------- */
    useEffect(() => {
        getFilieres()
            .then((data) => setFilieres(data))
            .catch(() => toast.error("Impossible de charger les filières"));
    }, []);

    const filiereOptions = filieres.map((f) => ({
        value: f.id,
        label: f.nom,
    }));

    /* ---------------- START CALL ---------------- */
    const handleStartCall = async () => {
        if (!selectedFiliere) {
            toast.error("Veuillez choisir une filière");
            return;
        }

        const data = await getStudentsByFiliere(selectedFiliere.value);

        if (!data.success) {
            toast.error(data.error);
            return;
        }

        setStudents(data.students ?? []);
        setSessionId(data.session.id);
        setAnneeId(data.annee.id);

        setChoosePopup(false);
        setCallPopup(true);
        setCurrentIndex(0);
    };

    /* ---------------- MARK PRESENCE ---------------- */
    const handleMark = async (status: "PRESENT" | "ABSENT") => {
        const student = students[currentIndex];
        if (!student) {
            toast.error("Aucun étudiant trouvé pour cette étape de l'appel");
            return;
        }

        if (!selectedFiliere || !sessionId || !anneeId) {
            toast.error("Informations manquantes pour enregistrer la présence");
            return;
        }

        try {
            const result = await markOrUpdatePresence({
                etudiantId: student.id,
                filiereId: selectedFiliere.value,
                sessionId: sessionId,
                anneeAcademiqueId: anneeId,
                status,
                userId,
            });

            // Vérifie si l'action a échoué
            if (!result.success) {
                toast.error(result.message || "Impossible d'enregistrer la présence");
                return;
            }

            // Étudiant suivant ou fin de l'appel
            if (currentIndex + 1 < students.length) {
                setCurrentIndex((prev) => prev + 1);
            } else {
                toast.success("Appel terminé !");
                setCallPopup(false);
                setStudents([]);
                setSelectedFiliere(null);
                setSessionId(null);
                setAnneeId(null);
                setCurrentIndex(0);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors de l'enregistrement de la présence");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* BOUTON PRINCIPAL */}
            <button
                className="btn btn-primary rounded-xl"
                onClick={() => setChoosePopup(true)}
            >
                Faire l'appel
            </button>

            {/* POPUP CHOIX FILIERE */}
            {choosePopup && (
                <dialog className="modal modal-open">
                    <div className="modal-box rounded-3xl p-8 flex flex-col gap-6">
                        <h3 className="text-2xl font-bold text-center">
                            Choisir une filière
                        </h3>

                        <Select
                            options={filiereOptions}
                            value={selectedFiliere}
                            onChange={(opt) => setSelectedFiliere(opt)}
                            placeholder="Sélectionner une filière"
                        />

                        <div className="modal-action justify-center">
                            <button
                                className="btn btn-accent w-full"
                                onClick={handleStartCall}
                            >
                                Commencer l'appel
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* POPUP APPEL ETUDIANT PAR ETUDIANT */}
            {callPopup && students.length > 0 && (
                <dialog className="modal modal-open">
                    <div className="modal-box rounded-3xl p-10 text-center flex flex-col gap-6">

                        <h3 className="text-xl font-semibold">
                            Étudiant {currentIndex + 1} / {students.length}
                        </h3>

                        <div className="text-2xl font-bold">
                            {students[currentIndex].nom}{" "}
                            {students[currentIndex].postnom}{" "}
                            {students[currentIndex].prenom}
                        </div>

                        {/* PHOTO PLACEHOLDER */}
                        <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                            Photo
                        </div>

                        <div className="flex justify-center gap-6 mt-4">
                            <button
                                className="btn btn-success w-32"
                                onClick={() => handleMark("PRESENT")}
                            >
                                PRESENT
                            </button>

                            <button
                                className="btn btn-error w-32"
                                onClick={() => handleMark("ABSENT")}
                            >
                                ABSENT
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    );
}