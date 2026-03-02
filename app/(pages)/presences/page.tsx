"use client";

import { getPresences, getStudentsByFiliere, markOrUpdatePresence } from "@/app/actions/presenceActions";
import { getFilieres } from "@/app/actions/filieresActions";

import { Filiere } from "@prisma/client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { LucideEdit2, LucideX } from "lucide-react";
import EmptyStates from "@/app/components/EmptyStates";

type FiliereOption = { value: number; label: string };
type Student = { id: number; nom: string; postnom: string; prenom: string };
type UserOption = { value: string; label: string };

// ✅ Ajout filiereId, sessionId, anneeId dans Presence
type Presence = {
  id: number;
  etudiant: Student;
  status: "PRESENT" | "ABSENT";
  date: string;
  filiereId: number;
  sessionId: number;
  anneeId: number;
  createdBy?: { id: string; name: string };
};

// 🔹 Dictionnaire phonétique renforcé pour noms congolais (RDC)
const phoneticDictionary: Record<string, string> = {
  "NGA": "Nga",
  "MWA": "Mwa",
  "NGO": "Ngo",
  "NGOMA": "Ngo-Ma",
  "MBALA": "Mba-La",
  "MBONGO": "Mbon-Go",
  "MUTOMBO": "Mu-Tom-Bo",
  "KABONGO": "Ka-Bon-Go",
  "KABILA": "Ka-Bi-La",
  "KABUNDI": "Ka-Bun-Di",
  "KASONGO": "Ka-Son-Go",
  "KABAYO": "Ka-Ba-Yo",
  "KALALA": "Ka-La-La",
  "MUKOKO": "Mu-Ko-Ko",
  "LUMUMBA": "Lu-Mum-Ba",
  "KAMBA": "Kam-Ba",
  "BALUME": "Ba-Lu-Me",
  "MABIKA": "Ma-Bi-Ka",
  "MPOKO": "M-Po-Ko",
  "KIPOKO": "Ki-Po-Ko",
  "KABANGA": "Ka-Ban-Ga",
  "MBOMBO": "Mbom-Bo",
  "NGANDU": "Ngan-Du",
  "KABWILA": "Ka-Bwi-La",
  "MUTUMBO": "Mu-Tum-Bo",
  "MBONGE": "Mbon-Ge",
  "DJO": "Djo"
};

// 🔹 Fonction pour corriger la prononciation
const phoneticizeName = (name: string) => {
  const upper = name.toUpperCase();
  return phoneticDictionary[upper] || name;
};

// 🔹 Fonction pour lire le nom avec pauses entre nom, postnom et prénom
const speakStudentName = (student: Student) => {
  if (!window.speechSynthesis) return;

  const utter = (text: string, delay: number) => {
    setTimeout(() => {
      const msg = new SpeechSynthesisUtterance(phoneticizeName(text));
      msg.lang = "fr-FR";
      window.speechSynthesis.speak(msg);
    }, delay);
  };

  utter(student.nom, 0);
  utter(student.postnom, 600);
  utter(student.prenom, 1200);
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

  const [presences, setPresences] = useState<Presence[]>([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filterUser, setFilterUser] = useState<UserOption | null>(null);
  const [selectedPresence, setSelectedPresence] = useState<Presence | null>(null);

  /* ---------------- LOAD FILIERES ---------------- */
  useEffect(() => {
    getFilieres()
      .then((data) => setFilieres(data))
      .catch(() => toast.error("Impossible de charger les filières"));
  }, []);

  const filiereOptions = filieres.map((f) => ({ value: f.id, label: f.nom }));

  /* ---------------- LOAD HISTORIQUE ---------------- */
  const loadPresences = async () => {
    try {
      const data = await getPresences({});
      const mappedPresences: Presence[] = data.map((p) => ({
        id: p.id,
        etudiant: {
          id: p.etudiant.id,
          nom: p.etudiant.nom,
          postnom: p.etudiant.postnom,
          prenom: p.etudiant.prenom,
        },
        status: p.status,
        date: p.date instanceof Date ? p.date.toISOString() : p.date,
        filiereId: (p as any).filiereId,
        sessionId: (p as any).sessionId,
        anneeId: (p as any).anneeAcademiqueId,
        createdBy: p.createdBy ? { id: p.createdBy.id, name: p.createdBy.name ?? "Utilisateur inconnu" } : undefined,
      }));

      setPresences(mappedPresences);

      const uniqueUsers = Array.from(
        new Map(mappedPresences.map((p) => [p.createdBy?.id, p.createdBy])).values()
      )
        .filter(Boolean)
        .map((u) => ({ value: u!.id, label: u!.name }));

      setUsers(uniqueUsers);
    } catch (error) {
      console.error(error);
      toast.error("Impossible de charger l'historique des présences");
    }
  };

  useEffect(() => {
    loadPresences();
  }, []);

  /* ---------------- START CALL ---------------- */
  const handleStartCall = async () => {
    if (!selectedFiliere) return toast.error("Veuillez choisir une filière");

    const data = await getStudentsByFiliere(selectedFiliere.value);
    if (!data.success) return toast.error(data.error);
    if (data.students.length === 0) return toast.info("Tous les étudiants ont déjà été appelés aujourd'hui.");

    setStudents(data.students);
    setSessionId(data.session.id);
    setAnneeId(data.annee.id);

    setChoosePopup(false);
    setCallPopup(true);
    setCurrentIndex(0);

    // 🔊 Lire le nom du premier étudiant
    if (data.students[0]) speakStudentName(data.students[0]);
  };

  /* ---------------- MARK PRESENCE ---------------- */
  const handleMark = async (status: "PRESENT" | "ABSENT") => {
    const student = students[currentIndex];
    if (!student) return toast.error("Aucun étudiant trouvé pour cette étape de l'appel");
    if (!selectedFiliere || !sessionId || !anneeId) return toast.error("Informations manquantes pour enregistrer la présence");

    try {
      const result = await markOrUpdatePresence({
        etudiantId: student.id,
        filiereId: selectedFiliere.value,
        sessionId,
        anneeAcademiqueId: anneeId,
        status,
      });

      if (!result.success) return toast.error(result.message || "Impossible d'enregistrer la présence");

      if (currentIndex + 1 < students.length) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        // 🔊 Lire le nom du prochain étudiant
        speakStudentName(students[nextIndex]);
      } else {
        toast.success("Appel terminé !");
        setCallPopup(false);
        setStudents([]);
        setSelectedFiliere(null);
        setSessionId(null);
        setAnneeId(null);
        setCurrentIndex(0);
        loadPresences();
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement de la présence");
    }
  };

  /* ---------------- UPDATE PRESENCE ---------------- */
  const handleUpdatePresence = async (status: "PRESENT" | "ABSENT") => {
    if (!selectedPresence) return;

    const filiere = selectedPresence.filiereId;
    const session = selectedPresence.sessionId;
    const annee = selectedPresence.anneeId;

    if (!filiere || !session || !annee)
      return toast.error("Informations manquantes pour cette présence");

    try {
      const result = await markOrUpdatePresence({
        etudiantId: selectedPresence.etudiant.id,
        filiereId: filiere,
        sessionId: session,
        anneeAcademiqueId: annee,
        status,
      });

      if (result.success) {
        toast.success("Présence mise à jour !");
        setSelectedPresence(null);
        loadPresences();
      } else {
        toast.error(result.message || "Impossible de mettre à jour la présence");
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  /* ---------------- FILTRAGE ---------------- */
  const filteredPresences = presences
    .filter((p) =>
      search
        ? `${p.etudiant.nom} ${p.etudiant.postnom} ${p.etudiant.prenom}`.toLowerCase().includes(search.toLowerCase())
        : true
    )
    .filter((p) => (filterDate ? p.date.startsWith(filterDate) : true))
    .filter((p) => (filterUser ? p.createdBy?.id === filterUser.value : true))
    .filter((p) => (selectedFiliere ? p.filiereId === selectedFiliere.value : true));

  const totalPresents = filteredPresences.filter(p => p.status === "PRESENT").length;
  const totalAbsents = filteredPresences.filter(p => p.status === "ABSENT").length;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      {/* BOUTON PRINCIPAL */}
      <button className="btn btn-accent rounded-xl" onClick={() => setChoosePopup(true)}>
        Faire l'appel
      </button>

      {/* TABLE DES PRÉSENCES */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Historique des présences</h2>
        <div className="flex gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Rechercher étudiant..."
            className="input input-bordered w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="input input-bordered"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <div className="w-72">
            <Select
              options={users}
              value={filterUser}
              onChange={(opt) => setFilterUser(opt)}
              placeholder="Filtrer par utilisateur"
              isClearable
            />
          </div>
          <div className="w-72">
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Filtrer par filière"
              isClearable
            />
          </div>
        </div>

        {/* Résumé totaux par filière */}
        {selectedFiliere && (
          <div className="flex gap-4 mb-4 text-sm font-medium">
            <span className="badge badge-success">Présents: {totalPresents}</span>
            <span className="badge badge-error">Absents: {totalAbsents}</span>
            <span className="badge badge-info">Total: {totalAbsents + totalPresents}</span>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border shadow">
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr>
                <th>ID</th>
                <th>Étudiant</th>
                <th>Status</th>
                <th>Date</th>
                <th>Formateur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPresences.length ? (
                filteredPresences.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.etudiant.nom} {p.etudiant.postnom} {p.etudiant.prenom}</td>
                    <td>
                      <span className={`badge ${p.status === "PRESENT" ? "badge-success" : "badge-error"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td>{p.createdBy?.name ?? "Utilisateur inconnu"}</td>
                    <td>
                      <button className="btn btn-xs btn-warning btn-outline" onClick={() => setSelectedPresence(p)}>
                        <LucideEdit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    <EmptyStates IconComponent={"Inbox"} message="Aucune présence trouvée" sm={true}/>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODIFICATION PRESENCE */}
      {selectedPresence && (
        <dialog className="modal modal-open">
          <div className="modal-box p-6 text-center relative">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setSelectedPresence(null)}
            >
              <LucideX size={16} />
            </button>
            <h3 className="font-bold text-lg mb-4">Modifier la présence</h3>
            <div className="flex justify-center gap-4">
              <button className="btn btn-success" onClick={() => handleUpdatePresence("PRESENT")}>PRESENT</button>
              <button className="btn btn-error" onClick={() => handleUpdatePresence("ABSENT")}>ABSENT</button>
            </div>
          </div>
        </dialog>
      )}

      {/* POPUP CHOIX FILIERE */}
      {choosePopup && (
        <dialog className="modal modal-open">
          <div className="modal-box rounded-3xl p-8 flex flex-col gap-6 relative">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setChoosePopup(false)}
            >
              <LucideX size={16} />
            </button>
            <h3 className="text-2xl font-bold text-center">Choisir une filière</h3>
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />
            <div className="modal-action justify-center">
              <button className="btn btn-accent w-full" onClick={handleStartCall}>Commencer l'appel</button>
            </div>
          </div>
        </dialog>
      )}

      {/* POPUP APPEL ETUDIANT */}
      {callPopup && students.length > 0 && (
        <dialog className="modal modal-open">
          <div className="modal-box rounded-3xl p-10 text-center flex flex-col gap-6 relative">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setCallPopup(false)}
            >
              <LucideX size={16} />
            </button>
            <h3 className="text-xl font-semibold">Étudiant {currentIndex + 1} / {students.length}</h3>
            <div className="text-2xl font-bold">
              {students[currentIndex].nom} {students[currentIndex].postnom} {students[currentIndex].prenom}
            </div>
            <div className="w-32 h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center">Photo</div>
            <div className="flex justify-center gap-6 mt-4">
              <button className="btn btn-success w-32" onClick={() => handleMark("PRESENT")}>PRESENT</button>
              <button className="btn btn-error w-32" onClick={() => handleMark("ABSENT")}>ABSENT</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}