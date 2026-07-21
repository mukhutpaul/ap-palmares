"use client";

import {
  getPresences,
  getStudentsByFiliere,
  markOrUpdatePresence,
} from "@/app/actions/presenceActions";
import { getEtudiants } from "@/services/etudiantsService";
import { useState, useEffect } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { LucideEdit2, LucideX } from "lucide-react";
import EmptyStates from "@/app/components/EmptyStates";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { FileDown } from "lucide-react";
import autoTable from "jspdf-autotable";

type FiliereOption = {
  value: string;
  label: string;
};

type Student = {
  id: number;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  genre: "M" | "F";
  telephone: string;
  adresse: string;
  nationalite: string;
  avatar: string | null;
  filiere: string;
  session: string;
  vacation: string;
};

type UserOption = { value: string; label: string };

// ✅ Ajout filiereId, sessionId, anneeId dans Presence
type Presence = {
  id: number;

  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;

  filiere: string;
  session: string;
  vacation?: string;

  status: "PRESENT" | "ABSENT";
  date: string;

  createdBy: string;
};

// 🔹 Dictionnaire phonétique renforcé pour noms congolais (RDC)
const phoneticDictionary: Record<string, string> = {
  NGA: "Ngaa",
  MWA: "Moua",
  NGO: "Ngo",
  NGOMA: "Ngoma",
  MBALA: "Mbala",
  MBONGO: "Mbongo",
  MUTOMBO: "Mutombo",
  KABONGO: "Kabongo",
  KABILA: "Kabila",
  KABUNDI: "Kabundi",
  KASONGO: "Kasongo",
  KABAYO: "Kabayou",
  KALALA: "Kalala",
  MUKOKO: "Mukoko",
  LUMUMBA: "Lumumba",
  KAMBA: "Kamba",
  BALUME: "Baloumé",
  MABIKA: "Mabika",
  MPOKO: "Mpoko",
  KIPOKO: "Kipoko",
  KABANGA: "Kabanga",
  MBOMBO: "Mbombo",
  NGANDU: "Ngandu",
  KABWILA: "Kabwila",
  MUTUMBO: "Mutumbo",
  MBONGE: "Mbongué",
  DJO: "Djo",
};

// 🔹 Fonction pour corriger la prononciation
const phoneticizeName = (name: string) => {
  if (!name) return "";

  const upper = name.trim().toUpperCase();

  if (phoneticDictionary[upper]) {
    return phoneticDictionary[upper];
  }

  // Toujours éviter les MAJUSCULES
  const lower = upper.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const formatStudentName = (student: Student) => {
  return [student.nom, student.postnom, student.prenom]
    .filter(Boolean)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .join(" ");
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
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [sessionLibelle, setSessionLibelle] = useState<string | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<FiliereOption | null>(
    null,
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [anneeId, setAnneeId] = useState<number | null>(null);

  const [presences, setPresences] = useState<Presence[]>([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filterUser, setFilterUser] = useState<UserOption | null>(null);
  const [selectedPresence, setSelectedPresence] = useState<Presence | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  /* ---------------- LOAD FILIERES ---------------- */
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await getEtudiants();

        const cleanStudents = data.etudiants.map((s) => ({
          ...s,
          filiere: s.filiere.trim().toUpperCase(),
        }));

        setStudentsList(cleanStudents);
        setSessionLibelle(data.session.libelle);
      } catch (error: any) {
        toast.error(error.message);
      }
    };

    loadStudents();
  }, []);

  const filiereOptions: FiliereOption[] = Array.from(
    new Set(studentsList.map((s) => s.filiere.trim().toUpperCase())),
  ).map((filiere) => ({
    value: filiere,
    label: filiere,
  }));

  const handlePrintPresence = async () => {
    if (!selectedFiliere) {
      toast.error("Veuillez sélectionner une filière");
      return;
    }

    if (filteredPresences.length === 0) {
      toast.info("Aucune présence trouvée");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 12;

    // ===============================
    // CHARGEMENT LOGO
    // ===============================

    const logo = new Image();

    logo.src = "/logo-leon.png";

    await new Promise((resolve) => {
      logo.onload = resolve;
    });

    // ===============================
    // FILIGRANE
    // ===============================

    const drawWatermark = () => {
      pdf.saveGraphicsState();

      pdf.setGState(
        new pdf.GState({
          opacity: 0.06,
        }),
      );

      pdf.addImage(
        logo,
        "PNG",
        pageWidth / 2 - 60,
        pageHeight / 2 - 60,
        120,
        120,
      );

      pdf.restoreGraphicsState();
    };

    // ===============================
    // ENTETE
    // ===============================

    const drawHeader = () => {
      // Logo
      pdf.addImage(logo, "PNG", pageWidth / 2 - 13, 8, 26, 26);

      // Centre
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(15, 118, 110);

      pdf.text(
        "CENTRE DE FORMATION PROFESSIONNELLE ET MÉTIERS",
        pageWidth / 2,
        39,
        {
          align: "center",
        },
      );

      // Academy
      pdf.setFontSize(18);
      pdf.setTextColor(29, 78, 216);

      pdf.text("« LEON ACADEMY »", pageWidth / 2, 48, {
        align: "center",
      });

      // Numéro
      pdf.setFontSize(10);
      pdf.setTextColor(70, 70, 70);

      pdf.text(
        "N°028/CABMIN/MI-FPM/AKK/KM/MAF/2023 DU 21/01/2023",
        pageWidth / 2,
        56,
        {
          align: "center",
        },
      );

      // séparation

      pdf.setDrawColor(15, 118, 110);

      pdf.setLineWidth(0.8);

      pdf.line(margin, 65, pageWidth - margin, 65);

      // Titre

      pdf.setFontSize(16);

      pdf.setTextColor(15, 118, 110);

      pdf.text("LISTE DE PRÉSENCE", pageWidth / 2, 76, {
        align: "center",
      });

      // Informations

      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);

      pdf.text(`Filière : ${selectedFiliere.label}`, margin, 87);

      pdf.text(
        filterDate
          ? `Date : ${new Date(filterDate).toLocaleDateString("fr-FR")}`
          : "Date : Toutes les dates",
        pageWidth - margin,
        87,
        {
          align: "right",
        },
      );
    };

    // ===============================
    // FOOTER
    // ===============================

    const drawFooter = (page: number, total: number) => {
      pdf.setFontSize(9);

      pdf.setTextColor(80);

      // Date d'impression
      const dateImpression = new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      pdf.text(`Imprimé le : ${dateImpression}`, margin, pageHeight - 10);

      // Signature responsable
      pdf.line(
        pageWidth - 75,
        pageHeight - 35,
        pageWidth - 20,
        pageHeight - 35,
      );

      pdf.text("Responsable", pageWidth - 47, pageHeight - 28, {
        align: "center",
      });

      // Pagination
      pdf.text(`Page ${page} / ${total}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });
    };

    // ===============================
    // PREMIER ENTETE
    // ===============================

    drawHeader();

    const rows = filteredPresences.map((p, index) => [
      index + 1,
      p.matricule,
      `${p.nom} ${p.postnom} ${p.prenom}`,
      p.status,
      new Date(p.date).toLocaleDateString("fr-FR"),
    ]);

    // ===============================
    // TABLEAU
    // ===============================

    autoTable(pdf, {
      startY: 95,

      head: [["N°", "Matricule", "Nom complet", "Présence", "Date"]],

      body: rows,

      margin: {
        left: margin,
        right: margin,
        top: 95,
        bottom: 45,
      },

      theme: "grid",

      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: "middle",
      },

      headStyles: {
        fillColor: [15, 118, 110],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },

      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },

      columnStyles: {
        0: {
          cellWidth: 12,
          halign: "center",
        },

        1: {
          cellWidth: 35,
          halign: "center",
        },

        2: {
          halign: "left",
        },

        3: {
          cellWidth: 30,
          halign: "center",
        },

        4: {
          cellWidth: 30,
          halign: "center",
        },
      },

      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawHeader();
        }
      },
    });

    // ===============================
    // PAGES + FILIGRANE + RESPONSABLE
    // ===============================

    const totalPages = pdf.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      drawWatermark();

      drawFooter(i, totalPages);
    }

    pdf.save(
      `Presence-${selectedFiliere.value}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
    );
  };
  /* ---------------- LOAD HISTORIQUE ---------------- */
  const loadPresences = async () => {
    try {
      const data = await getPresences({});

      const mappedPresences: Presence[] = data.map((p) => ({
        id: p.id,

        matricule: p.matricule,

        nom: p.nom,
        postnom: p.postnom,
        prenom: p.prenom,

        filiere: p.filiere,
        session: p.session,
        // vacation: p.vacation,

        status: p.status,

        date: p.date instanceof Date ? p.date.toISOString() : p.date,

        createdBy: p.createdBy,
      }));

      setPresences(mappedPresences);
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
    if (!selectedFiliere) {
      toast.error("Veuillez choisir une filière");
      return;
    }

    if (!sessionLibelle) {
      toast.error("Session non trouvée");
      return;
    }

    try {
      const filiere = selectedFiliere.value.trim().toUpperCase();

      // Tous les étudiants de cette filière
      const listeFiliere = studentsList.filter(
        (s) => s.filiere.trim().toUpperCase() === filiere,
      );

      if (listeFiliere.length === 0) {
        toast.info("Aucun étudiant trouvé dans cette filière.");
        return;
      }

      // Date du jour (00h00 -> 23h59)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Récupérer uniquement les appels de cette filière aujourd'hui
      const presencesDuJour = await getPresences({
        filiere,
        session: sessionLibelle,
        dateStart: today,
        dateEnd: tomorrow,
      });

      /**
       * Important :
       * On retire tous les étudiants déjà enregistrés aujourd'hui,
       * peu importe le statut PRESENT ou ABSENT.
       */
      const dejaAppeles = new Set(presencesDuJour.map((p) => p.matricule));

      const reste = listeFiliere.filter(
        (student) => !dejaAppeles.has(student.matricule),
      );

      if (reste.length === 0) {
        toast.info(
          "Tous les étudiants de cette filière ont déjà été appelés aujourd'hui.",
        );
        return;
      }

      setStudents(reste);
      setCurrentIndex(0);

      setChoosePopup(false);
      setCallPopup(true);

      speakStudentName(reste[0]);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du démarrage de l'appel");
    }
  };

  /* ---------------- MARK PRESENCE ---------------- */
  const handleMark = async (status: "PRESENT" | "ABSENT") => {
    const student = students[currentIndex];

    if (!student) {
      toast.error("Aucun étudiant trouvé");
      return;
    }

    if (!sessionLibelle) {
      toast.error("Session inconnue");
      return;
    }

    try {
      const result = await markOrUpdatePresence({
        matricule: student.matricule,

        nom: student.nom,

        postnom: student.postnom,

        prenom: student.prenom,

        filiere: student.filiere,

        session: sessionLibelle,

        status,
      });

      if (!result.success) {
        toast.error(result.message || "Erreur enregistrement");

        return;
      }

      toast.success(`${student.nom} ${student.postnom} enregistré`);

      // passer au suivant

      if (currentIndex + 1 < students.length) {
        const next = currentIndex + 1;

        setCurrentIndex(next);

        speakStudentName(students[next]);
      } else {
        toast.success("Appel terminé !");

        setCallPopup(false);

        setStudents([]);

        setCurrentIndex(0);

        await loadPresences();
      }
    } catch (error) {
      console.error(error);

      toast.error("Erreur lors de l'enregistrement");
    }
  };

  /* ---------------- UPDATE PRESENCE ---------------- */
  const handleUpdatePresence = async (status: "PRESENT" | "ABSENT") => {
    if (!selectedPresence) return;

    try {
      const result = await markOrUpdatePresence({
        matricule: selectedPresence.matricule,

        nom: selectedPresence.nom,

        postnom: selectedPresence.postnom,

        prenom: selectedPresence.prenom,

        filiere: selectedPresence.filiere,

        session: selectedPresence.session,

        vacation: selectedPresence.vacation,

        status,
      });

      if (result.success) {
        toast.success("Présence mise à jour !");

        setSelectedPresence(null);

        loadPresences();
      } else {
        toast.error(result.message || "Impossible de modifier");
      }
    } catch (error) {
      console.error(error);

      toast.error("Erreur modification");
    }
  };

  /* ---------------- FILTRAGE ---------------- */
  const filteredPresences = presences
    .filter((p) =>
      search
        ? `${p.nom} ${p.postnom} ${p.prenom}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    )
    .filter((p) => (filterDate ? p.date.startsWith(filterDate) : true))
    // .filter((p) => (filterUser ? p.createdBy?.id === filterUser.value : true))
    .filter((p) =>
      selectedFiliere ? p.filiere === selectedFiliere.value : true,
    );

  const totalPresents = filteredPresences.filter(
    (p) => p.status === "PRESENT",
  ).length;
  const totalAbsents = filteredPresences.filter(
    (p) => p.status === "ABSENT",
  ).length;

  const totalPages = Math.ceil(filteredPresences.length / itemsPerPage);

  const paginatedPresences = filteredPresences.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      {/* BOUTON PRINCIPAL */}
      <div className="flex gap-3 justify-center sm:justify-start flex-wrap">
        <button
          className="btn btn-accent rounded-xl w-full sm:w-auto"
          onClick={() => setChoosePopup(true)}
        >
          Faire l'appel
        </button>
        <button
          className="btn btn-success rounded-xl"
          onClick={handlePrintPresence}
        >
          <FileDown size={18} />
          Imprimer
        </button>
      </div>

      {/* TABLE DES PRÉSENCES */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center sm:text-left">
          Historique des présences
        </h2>

        {/* FILTRES RESPONSIVE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="Rechercher étudiant..."
            className="input input-bordered w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="date"
            className="input input-bordered w-full"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />

          <Select
            options={users}
            value={filterUser}
            onChange={(opt) => setFilterUser(opt)}
            placeholder="Filtrer par formateur"
            isClearable
          />

          <Select
            options={filiereOptions}
            value={selectedFiliere}
            onChange={(opt) => setSelectedFiliere(opt)}
            placeholder="Filtrer par filière"
            isClearable
          />
        </div>

        {/* Résumé */}
        {selectedFiliere && (
          <div className="flex flex-wrap gap-3 mb-4 text-sm font-medium justify-center sm:justify-start">
            <span className="badge badge-success px-4 py-3">
              Présents: {totalPresents}
            </span>
            <span className="badge badge-error px-4 py-3">
              Absents: {totalAbsents}
            </span>
            <span className="badge badge-info px-4 py-3">
              Total: {totalAbsents + totalPresents}
            </span>
          </div>
        )}

        {/* TABLE RESPONSIVE */}
        <div className="overflow-x-auto rounded-xl border shadow bg-base-100">
          <table className="table table-zebra w-full text-sm sm:text-base">
            <thead className="bg-base-200 text-xs sm:text-sm">
              <tr>
                <th>ID</th>
                <th>Matricule</th>
                <th>Étudiant</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPresences.length ? (
                paginatedPresences.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{p.id}</td>

                    <td className="whitespace-nowrap font-medium">
                      {p.matricule}
                    </td>

                    <td className="whitespace-nowrap">
                      {p.nom} {p.postnom} {p.prenom}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          p.status === "PRESENT"
                            ? "badge-success"
                            : "badge-error"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString()}
                    </td>

                    <td>
                      <button
                        className="btn btn-xs sm:btn-sm btn-warning btn-outline"
                        onClick={() => setSelectedPresence(p)}
                      >
                        <LucideEdit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <EmptyStates
                      IconComponent={"Inbox"}
                      message="Aucune présence trouvée"
                      sm={true}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-center items-center gap-3 my-5">
            <button
              className="btn btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Précédent
            </button>

            <span className="font-semibold">
              Page {currentPage} / {totalPages || 1}
            </span>

            <button
              className="btn btn-sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {choosePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-base-100 w-11/12 max-w-md rounded-2xl p-6 relative shadow-xl">
            {/* Bouton fermer */}
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setChoosePopup(false)}
            >
              <LucideX size={16} />
            </button>

            <h3 className="text-xl font-bold text-center mb-6">
              Choisir une filière
            </h3>

            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(opt) => setSelectedFiliere(opt)}
              placeholder="Sélectionner une filière"
            />

            <button
              className="btn btn-accent w-full mt-6"
              onClick={handleStartCall}
            >
              Commencer l'appel
            </button>
          </div>
        </div>
      )}

      {selectedPresence && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-base-100 w-11/12 max-w-md rounded-2xl p-6 text-center relative shadow-2xl">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
              onClick={() => setSelectedPresence(null)}
            >
              <LucideX size={16} />
            </button>

            <h3 className="font-bold text-lg mb-6">Modifier la présence</h3>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="btn btn-success flex-1"
                onClick={() => handleUpdatePresence("PRESENT")}
              >
                PRESENT
              </button>

              <button
                className="btn btn-error flex-1"
                onClick={() => handleUpdatePresence("ABSENT")}
              >
                ABSENT
              </button>
            </div>
          </div>
        </div>
      )}
      {callPopup && students.length > 0 && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-lg rounded-3xl p-6 sm:p-10 text-center flex flex-col gap-6 relative">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setCallPopup(false)}
            >
              <LucideX size={16} />
            </button>

            <h3 className="text-lg sm:text-xl font-semibold">
              Étudiant {currentIndex + 1} / {students.length}
            </h3>

            <div className="text-xl sm:text-2xl font-bold break-words leading-relaxed">
              {formatStudentName(students[currentIndex])}
            </div>

            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gray-200 flex items-center justify-center text-sm">
              Photo
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mt-4">
              <button
                className="btn btn-success w-full sm:w-32"
                onClick={() => handleMark("PRESENT")}
              >
                PRESENT
              </button>
              <button
                className="btn btn-error w-full sm:w-32"
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
