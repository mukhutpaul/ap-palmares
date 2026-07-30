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
  // =========================================================
  // SYLLABES / COMBINAISONS PHONÉTIQUES COURANTES
  // À utiliser de préférence uniquement sur des mots complets
  // =========================================================

  NGA: "Ngaa",
  MWA: "Moua",
  NGO: "Ngo",
  NGE: "Nge",
  MBO: "Mbo",
  MBE: "Mbe",
  NKE: "Nke",
  NDE: "Nde",
  NZO: "Nzo",
  MPA: "Mpa",
  MPE: "Mpe",
  MPI: "Mpi",
  MPO: "Mpo",
  MPU: "Mpu",
  NKA: "Nka",
  NKO: "Nko",
  NZA: "Nza",
  NZE: "Nze",
  NZI: "Nzi",
  NZU: "Nzu",
  TSHI: "Tshi",
  TSHI: "Tshi",
  TSHU: "Tshu",
  KWA: "Koua",
  KWE: "Koué",
  KWI: "Koui",
  KWO: "Kouo",
  KWU: "Kouou",

  // =========================================================
  // NOMS CONGOLAIS - KINSHASA / KONGO CENTRAL
  // =========================================================

  NGOMA: "Ngoma",
  NGONGO: "Ngongo",
  NGANDU: "Ngandu",
  NGALA: "Ngala",
  NGANGULA: "Ngangula",
  NGALULA: "Ngalula",
  NGABO: "Ngabo",
  NGUDI: "Ngudi",
  NGOMA: "Ngoma",

  MWANA: "Mouana",
  MWAMBA: "Mwamba",
  MWILA: "Mwila",
  MWANZA: "Mwanza",
  MWAPE: "Mwape",
  MWENDA: "Mwenda",
  MWILU: "Mwilu",

  MBALA: "Mbala",
  MBONGO: "Mbongo",
  MBOMBO: "Mbombo",
  MBOMBA: "Mbomba",
  MBAYO: "Mbayo",
  MBUNGU: "Mbungu",
  MBUTA: "Mbuta",
  MBOKO: "Mboko",
  MBONGE: "Mbongué",
  MBELI: "Mbeli",
  MBEMBA: "Mbemba",
  MBANGALA: "Mbangala",
  MBALA: "Mbala",
  MBOKO: "Mboko",

  MPASI: "Mpasi",
  MPOKO: "Mpoko",
  MPUTU: "Mputu",
  MPINGA: "Mpinga",
  MPANZU: "Mpanzu",
  MPANDE: "Mpande",
  MPONGO: "Mpongo",
  MPUNGA: "Mpunga",
  MPALA: "Mpala",
  MPOTO: "Mpoto",
  MPETI: "Mpeti",
  MPUNGU: "Mpungu",
  MPANDU: "Mpandu",

  MUTOMBO: "Mutombo",
  MUTUMBO: "Mutumbo",
  MUTUALE: "Mutuale",
  MUTONDO: "Mutondo",
  MUTOKE: "Mutoke",
  MUTEBI: "Mutebi",
  MUTANDA: "Mutanda",
  MUTAMBA: "Mutamba",
  MUTUA: "Mutua",
  MUTSHI: "Mutshi",
  MUTONI: "Mutoni",

  KABONGO: "Kabongo",
  KABILA: "Kabila",
  KABUNDI: "Kabundi",
  KABAYO: "Kabayou",
  KABANGA: "Kabanga",
  KABWILA: "Kabwila",
  KABAMBA: "Kabamba",
  KABASELE: "Kabasele",
  KABUYA: "Kabuya",
  KABWE: "Kabwe",
  KABONGO: "Kabongo",
  KABONGO: "Kabongo",

  KALALA: "Kalala",
  KALAMBAYI: "Kalambayi",
  KALONJI: "Kalondji",
  KALUMBA: "Kalumba",
  KALUME: "Kalume",
  KALENGA: "Kalenga",
  KALAMBA: "Kalamba",
  KALALA: "Kalala",
  KALONDO: "Kalondo",

  KASONGO: "Kasongo",
  KASONGO: "Kasongo",
  KASONGO: "Kasongo",

  KAMBA: "Kamba",
  KAMBALE: "Kambale",
  KAMBAZI: "Kambazi",
  KAMANGA: "Kamanga",
  KAMULETE: "Kamulete",
  KAMDEM: "Kamdem",
  KAMBA: "Kamba",

  MUKOKO: "Mukoko",
  MUKENDI: "Mukendi",
  MUKUNA: "Mukuna",
  MUKADI: "Mukadi",
  MUKAMBA: "Mukamba",
  MUKASA: "Mukasa",
  MUKWEGE: "Mukwege",
  MUKALAYI: "Mukalayi",
  MUKUMBI: "Mukumbi",
  MUKADI: "Mukadi",
  MUKADI: "Mukadi",

  LUMUMBA: "Lumumba",
  LUKUSA: "Lukusa",
  LUKOMBE: "Lukombe",
  LUKONGO: "Lukongo",
  LUKAKU: "Lukaku",
  LUBAKI: "Lubaki",
  LUBAMBA: "Lubamba",
  LUBANZA: "Lubanza",
  LUKUSA: "Lukusa",
  LUKOKI: "Lukoki",

  KIPOKO: "Kipoko",
  KIPASA: "Kipasa",
  KIPULA: "Kipula",
  KIPANGA: "Kipanga",
  KIPENGE: "Kipenge",

  MABIKA: "Mabika",
  MABIALA: "Mabiala",
  MABUNDA: "Mabunda",
  MABELE: "Mabele",
  MABONDO: "Mabondo",
  MABIALA: "Mabiala",

  MAKANDA: "Makanda",
  MAKAMBO: "Makambo",
  MAKENGO: "Makengo",
  MAKIESE: "Makièse",
  MAKILA: "Makila",
  MAKONGA: "Makonga",

  MASAMBA: "Masamba",
  MASENGO: "Masengo",
  MASIALA: "Masiala",
  MASIMANGO: "Masimango",
  MASUDI: "Masudi",

  MATONDO: "Matondo",
  MATATA: "Matata",
  MATUMONA: "Matumona",
  MATAMBA: "Matamba",

  NSIMBA: "Nsimba",
  NSUMBU: "Nsumbu",
  NSENGA: "Nsenga",
  NSUKULA: "Nsukula",
  NSAMBA: "Nsamba",
  NSAKALA: "Nsakala",

  NZITA: "Nzita",
  NZINGA: "Nzinga",
  NZONGO: "Nzongo",
  NZITA: "Nzita",
  NZITA: "Nzita",

  NDOMBE: "Ndombe",
  NDOMASI: "Ndomasi",
  NDALA: "Ndala",
  NDAYA: "Ndaya",
  NDEKE: "Ndeke",
  NDONGA: "Ndonga",
  NDONGO: "Ndongo",

  // =========================================================
  // NOMS KASAÏ / KATANGA
  // =========================================================

  TSHIBANGU: "Tshibangu",
  TSHIBOLA: "Tshibola",
  TSHIMANGA: "Tshimanga",
  TSHISEKEDI: "Tshisekedi",
  TSHILOMBO: "Tshilombo",
  TSHITENGE: "Tshitengue",
  TSHIBANDA: "Tshibanda",
  TSHIAMALA: "Tshiamala",
  TSHIMANGA: "Tshimanga",
  TSHIBANDA: "Tshibanda",
  TSHIBANGU: "Tshibangu",

  KATUMBA: "Katumba",
  KATANGA: "Katanga",
  KATSHI: "Katshi",
  KATENDE: "Katende",
  KATUMBA: "Katumba",

  ILUNGA: "Ilunga",
  KYUNGU: "Kyungu",
  KYAMBA: "Kyamba",
  KANKU: "Kanku",
  KANKONDE: "Kankonde",
  KASONGO: "Kasongo",

  LUBUMBASHI: "Lubumbashi",

  // =========================================================
  // PRÉNOMS MASCULINS
  // =========================================================

  JEAN: "Jean",
  JEANPAUL: "Jean-Paul",
  JEANPIERRE: "Jean-Pierre",
  JEANCLAUDE: "Jean-Claude",
  JEANMARIE: "Jean-Marie",
  JEANLUC: "Jean-Luc",

  PATRICK: "Patrick",
  EMMANUEL: "Emmanuel",
  MICHEL: "Michel",
  DANIEL: "Daniel",
  DAVID: "David",
  PAUL: "Paul",
  PIERRE: "Pierre",
  FRANCOIS: "François",
  FRANÇOIS: "François",
  CHRISTIAN: "Christian",
  CHRISTOPHE: "Christophe",
  BENOIT: "Benoît",
  BERNARD: "Bernard",
  AUGUSTIN: "Augustin",
  AUGUSTE: "Auguste",
  JOSEPH: "Joseph",
  JACQUES: "Jacques",
  GEORGES: "Georges",
  ROGER: "Roger",
  ROBERT: "Robert",
  ANDRE: "André",
  ALEXANDRE: "Alexandre",
  ANTOINE: "Antoine",
  ARMAND: "Armand",
  ALBERT: "Albert",
  GABRIEL: "Gabriel",
  RAPHAEL: "Raphaël",
  SAMUEL: "Samuel",
  SIMON: "Simon",
  STEPHANE: "Stéphane",
  STEPHEN: "Stephen",
  JOEL: "Joël",
  JONATHAN: "Jonathan",
  JEREMIE: "Jérémie",
  ISAAC: "Isaac",
  MOISE: "Moïse",
  MOISES: "Moïse",
  ELIE: "Élie",
  ELIEZER: "Éliézer",
  NOEL: "Noël",

  // =========================================================
  // PRÉNOMS FÉMININS
  // =========================================================

  MARIE: "Marie",
  MARIECLAIRE: "Marie-Claire",
  MARIELOUISE: "Marie-Louise",
  MARIEJEANNE: "Marie-Jeanne",
  MARIEJOSEE: "Marie-Josée",
  MARIEJOSE: "Marie-José",
  JOSEPHINE: "Joséphine",
  ANNE: "Anne",
  "ANNE MARIE": "Anne-Marie",
  ANNE_MARIE: "Anne-Marie",

  CLAIRE: "Claire",
  CLAUDINE: "Claudine",
  CHRISTINE: "Christine",
  CHRISTELLE: "Christelle",
  CHRISTEL: "Christel",
  THERESE: "Thérèse",
  BERNADETTE: "Bernadette",
  BEATRICE: "Béatrice",
  BRIGITTE: "Brigitte",
  CAROLINE: "Caroline",
  CATHERINE: "Catherine",
  CECILE: "Cécile",
  CELINE: "Céline",
  DIANE: "Diane",
  DOMINIQUE: "Dominique",
  ELISABETH: "Élisabeth",
  ELIZABETH: "Elizabeth",
  ESTHER: "Esther",
  EUNICE: "Eunice",
  GRACE: "Grâce",
  HELENE: "Hélène",
  ISABELLE: "Isabelle",
  JACQUELINE: "Jacqueline",
  JEANNETTE: "Jeannette",
  JULIETTE: "Juliette",
  JUSTINE: "Justine",
  LILIANE: "Liliane",
  LUCIE: "Lucie",
  MADELEINE: "Madeleine",
  MARGUERITE: "Marguerite",
  MARTHE: "Marthe",
  MONIQUE: "Monique",
  NADIA: "Nadia",
  NATHALIE: "Nathalie",
  NOELLA: "Noëlla",
  PATRICIA: "Patricia",
  PAULINE: "Pauline",
  REBECCA: "Rebecca",
  RACHEL: "Rachel",
  ROSE: "Rose",
  ROSALIE: "Rosalie",
  SANDRINE: "Sandrine",
  SARAH: "Sarah",
  SOPHIE: "Sophie",
  SUZANNE: "Suzanne",
  SYLVIE: "Sylvie",
  VERONIQUE: "Véronique",
  VICTOIRE: "Victoire",
  YVETTE: "Yvette",
  YVONNE: "Yvonne",

  // =========================================================
  // PRÉNOMS TRÈS COURANTS EN RDC
  // =========================================================

  KELLY: "Kelly",
  KELVIN: "Kelvin",
  KEVIN: "Kevin",
  BRYAN: "Bryan",
  BRIAN: "Brian",
  STEVE: "Steve",
  STEVEN: "Steven",
  WILLY: "Willy",
  WILLIAM: "William",
  WILFRIED: "Wilfried",
  RICHARD: "Richard",
  RODRIGUE: "Rodrigue",
  SERGE: "Serge",
  GUY: "Guy",
  FABIEN: "Fabien",
  FREDERIC: "Frédéric",
  GILBERT: "Gilbert",
  HERVE: "Hervé",
  JOSE: "José",
  LEON: "Léon",
  LEONARD: "Léonard",
  MODESTE: "Modeste",
  PROSPER: "Prosper",
  PACIFIQUE: "Pacifique",
  BIENVENU: "Bienvenu",
  BIENVENUE: "Bienvenue",
  FORTUNE: "Fortuné",
  FELIX: "Félix",
  FELICIEN: "Félicien",
  DESIRE: "Désiré",
  DESIREE: "Désirée",
  DIVIN: "Divin",
  DIVINE: "Divine",
  GRACIEUX: "Gracieux",
  GRACIA: "Gracia",
  DIEUDONNE: "Dieudonné",
  DIEUDONNEE: "Dieudonnée",
  DONATIEN: "Donatien",
  DONA: "Dona",
  EXAUCE: "Exaucé",
  EXAUCEE: "Exaucée",
  ESPERANCE: "Espérance",
  ESPERANT: "Espérant",
  PRECIEUX: "Précieux",
  PRECIEUSE: "Précieuse",
  PROVIDENCE: "Providence",
  VAINQUEUR: "Vainqueur",
  VICTOR: "Victor",
  VICTORIEN: "Victorien",
  VICTORINE: "Victorine",
  JOIE: "Joie",
  BONHEUR: "Bonheur",
  BENEDICTION: "Bénédiction",
  BENI: "Béni",
  BENIE: "Bénie",
  MERVEILLE: "Merveille",
  MERCI: "Merci",
  AMOUR: "Amour",
  LUMIERE: "Lumière",
  KOFFI: "Koffi",
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
  const [selectedSession, setSelectedSession] = useState<UserOption | null>(
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

    // Statistiques présence

    // ===============================
    // FOOTER
    // ===============================

    const drawFooter = (page: number, total: number) => {
      pdf.setFontSize(9);
      pdf.setTextColor(80);

      const dateImpression = new Date().toLocaleDateString("fr-FR");

      pdf.text(`Imprimé le : ${dateImpression}`, margin, pageHeight - 10);

      pdf.text(`Page ${page} / ${total}`, pageWidth / 2, pageHeight - 10, {
        align: "center",
      });

      // Signature uniquement sur la dernière page
      if (page === total) {
        pdf.line(
          pageWidth - 75,
          pageHeight - 30,
          pageWidth - 20,
          pageHeight - 30,
        );

        pdf.text("Responsable", pageWidth - 47, pageHeight - 24, {
          align: "center",
        });
      }
    };

    // ===============================
    // PREMIER ENTETE
    // ===============================

    //drawHeader();

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

    const grouped = filteredPresences.reduce(
      (acc, p) => {
        // Clé de regroupement : YYYY-MM-DD
        const key = new Date(p.date).toISOString().split("T")[0];

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(p);

        return acc;
      },
      {} as Record<string, Presence[]>,
    );

    // Trier les dates du plus ancien au plus récent
    const sortedDates = Object.keys(grouped).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    let startY = 105;

    sortedDates.forEach((dateKey) => {
      const presences = grouped[dateKey];

      // Date affichée
      const date = new Date(dateKey).toLocaleDateString("fr-FR");

      if (startY > 240) {
        pdf.addPage();
        drawHeader();
        startY = 105;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(15, 118, 110);

      pdf.text(`Date : ${date}`, margin, startY);

      startY += 7;

      const totalPresents = presences.filter(
        (p) => p.status === "PRESENT",
      ).length;

      const totalAbsents = presences.filter(
        (p) => p.status === "ABSENT",
      ).length;

      const total = presences.length;

      pdf.setFontSize(10);

      pdf.setTextColor(22, 163, 74);
      pdf.text(`Présents : ${totalPresents}`, margin, startY);

      pdf.setTextColor(220, 38, 38);
      pdf.text(`Absents : ${totalAbsents}`, pageWidth / 2, startY, {
        align: "center",
      });

      pdf.setTextColor(29, 78, 216);
      pdf.text(`Total : ${total}`, pageWidth - margin, startY, {
        align: "right",
      });

      startY += 8;

      autoTable(pdf, {
        startY,

        margin: {
          top: 95, // réserve la place pour l'entête
          left: margin,
          right: margin,
          bottom: 20,
        },

        head: [["N°", "Matricule", "Nom complet", "Présence"]],

        body: presences.map((p, index) => [
          index + 1,
          p.matricule,
          `${p.nom} ${p.postnom} ${p.prenom}`,
          p.status,
        ]),

        theme: "grid",

        styles: {
          fontSize: 8,
          cellPadding: 2.5,
        },

        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
          fontStyle: "bold",
        },

        didParseCell(data) {
          if (data.section === "body" && data.column.index === 3) {
            if (data.cell.raw === "PRESENT") {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = "bold";
            }

            if (data.cell.raw === "ABSENT") {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },

        // IMPORTANT : exécuté sur chaque page créée par autoTable
        didDrawPage: () => {
          drawHeader();
        },
      });

      startY = (pdf as any).lastAutoTable.finalY + 15;
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
      <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
        {/* FAIRE L'APPEL */}
        <button
          className="
      btn btn-accent
      rounded-xl
      px-6
      shadow-sm
      hover:shadow-md
      transition
      w-full sm:w-auto
    "
          onClick={() => setChoosePopup(true)}
        >
          <span className="text-lg">✓</span>
          Faire l'appel
        </button>

        {/* IMPRIMER */}
        <button
          className="
      btn btn-success
      rounded-xl
      px-6
      shadow-sm
      hover:shadow-md
      transition
      w-full sm:w-auto
      flex items-center gap-2
    "
          onClick={handlePrintPresence}
        >
          <FileDown size={18} />
          Imprimer la présence
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
        <div className="bg-base-100 border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              {/* HEADER */}
              <thead className="bg-base-200 text-xs uppercase">
                <tr>
                  <th>ID</th>
                  <th>Étudiant</th>
                  <th className="text-center">Statut</th>
                  <th>Date</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {filteredPresences.length ? (
                  paginatedPresences.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-base-200/50 transition duration-200"
                    >
                      {/* ID */}
                      <td className="font-semibold text-gray-500">#{p.id}</td>

                      {/* MATRICULE */}

                      {/* ETUDIANT */}
                      <td>
                        <div className="flex items-center gap-4 min-w-[260px]">
                          {/* AVATAR */}
                          <div className="avatar placeholder shrink-0">
                            <div
                              className="
          bg-primary 
          text-primary-content
          rounded-full
          w-12 h-12
          flex items-center justify-center
          shadow-sm
        "
                            >
                              <span className="text-sm font-bold">
                                {p.nom?.charAt(0).toUpperCase()}
                                {p.postnom?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* INFORMATIONS */}
                          <div className="flex flex-col leading-tight">
                            <p className="font-semibold text-sm sm:text-base">
                              {p.nom} {p.postnom}
                            </p>

                            <p className="text-xs text-gray-500">{p.prenom}</p>

                            <div className="mt-1">
                              <span
                                className="
                                badge 
                                badge-info 
                                badge-outline
                                rounded-full
                                text-xs
                                px-3 py-2
                              "
                              >
                                {p.matricule}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="text-center">
                        <span
                          className={`
                    badge rounded-full px-4 py-3 font-semibold
                    ${p.status === "PRESENT" ? "badge-success" : "badge-error"}
                  `}
                        >
                          {p.status === "PRESENT" ? "Présent" : "Absent"}
                        </span>
                      </td>

                      {/* DATE */}
                      <td>
                        <span className="text-sm font-medium">
                          {new Date(p.date).toLocaleDateString("fr-FR")}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td>
                        <div className="flex justify-center">
                          <button
                            className="
                      btn btn-sm btn-circle 
                      btn-outline btn-warning
                      hover:scale-105 transition
                    "
                            onClick={() => setSelectedPresence(p)}
                          >
                            <LucideEdit2 size={16} />
                          </button>
                        </div>
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
          </div>

          {/* PAGINATION */}
          <div
            className="
      flex flex-col sm:flex-row 
      justify-center items-center 
      gap-4 py-5 border-t
    "
          >
            <button
              className="btn btn-sm btn-outline rounded-xl"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              ← Précédent
            </button>

            <div
              className="
              px-5 py-2 rounded-xl 
              bg-base-200 font-semibold text-sm
            "
            >
              Page {currentPage} / {totalPages || 1}
            </div>

            <button
              className="btn btn-sm btn-outline rounded-xl"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Suivant →
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
