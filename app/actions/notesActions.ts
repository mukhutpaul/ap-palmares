"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

// ===============================
// CALCUL MOYENNE + MENTION
// ===============================
async function calculateMoyenne(
  etudiantId: number,
  session: string,
  filiere: string,
) {
  const notes = await prisma.note.findMany({
    where: {
      etudiantId,
      session,
      filiere,
    },
  });

  if (!notes.length) {
    return {
      moyenne: 0,
      pourcentage: 0,
      mention: "Ajourné",
    };
  }

  let total = 0;
  let count = 0;

  for (const n of notes) {
    if (n.noteTheorique != null) {
      total += n.noteTheorique;
      count++;
    }

    if (n.notePratique != null) {
      total += n.notePratique;
      count++;
    }

    if (n.noteJyry != null) {
      total += n.noteJyry;
      count++;
    }
  }

  const moyenne = count > 0 ? total / count : 0;

  const pourcentage = moyenne;

  let mention = "Ajourné";

  if (pourcentage >= 80) {
    mention = "Excellent";
  } else if (pourcentage >= 70) {
    mention = "Très bien";
  } else if (pourcentage >= 60) {
    mention = "Bien";
  } else if (pourcentage >= 50) {
    mention = "Assez bien";
  }

  return {
    moyenne: Number(moyenne.toFixed(2)),
    pourcentage: Number(pourcentage.toFixed(2)),
    mention,
  };
}

export async function addNote(formData: FormData) {
  const noteJyry = Number(formData.get("noteJyry") ?? 0);

  const etudiantId = Number(formData.get("etudiantId"));
  const session = String(formData.get("session"));
  const filiere = String(formData.get("filiere"));
  const createdById = String(formData.get("createdById"));

  if (isNaN(noteJyry) || !etudiantId || !createdById) {
    throw new Error("Tous les champs sont obligatoires");
  }

  // Vérification utilisateur
  const userExists = await prisma.user.findUnique({
    where: { id: createdById },
  });

  if (!userExists) {
    throw new Error("Utilisateur introuvable");
  }

  // Vérification étudiant
  const etudiant = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
  });

  if (!etudiant) {
    throw new Error("Étudiant introuvable");
  }

  // ==========================
  // NOTE THÉORIQUE (/20)
  // ==========================
  const evalsTheorie = await prisma.evaluationTheorie.findMany({
    where: { etudiantId },
  });

  let noteTheorique = 0;

  if (evalsTheorie.length > 0) {
    const total = evalsTheorie.reduce((acc, e) => acc + e.score, 0);

    noteTheorique = Number(
      ((total / (evalsTheorie.length * 20)) * 20).toFixed(2),
    );
  }

  // ==========================
  // NOTE PRATIQUE (/50)
  // ==========================
  const evaluations = await prisma.evaluation.findMany({
    where: { etudiantId },
    include: {
      competences: {
        include: {
          competence: true,
        },
      },
    },
  });

  let notePratique = 0;

  if (evaluations.length > 0) {
    const score = evaluations.reduce(
      (acc, ev) => acc + ev.competences.reduce((a, c) => a + c.score, 0),
      0,
    );

    const max = evaluations.reduce(
      (acc, ev) =>
        acc +
        ev.competences.reduce((a, c) => a + (c.competence?.maxScore ?? 0), 0),
      0,
    );

    notePratique = max > 0 ? Number(((score / max) * 50).toFixed(2)) : 0;
  }

  // ==========================
  // CRÉATION DE LA NOTE
  // ==========================
  const newNote = await prisma.note.create({
    data: {
      noteTheorique,
      notePratique,
      noteJyry,

      etudiantId,
      createdById,

      // Obligatoires dans ton modèle Note
      filiere: etudiant.filiere,
      session: etudiant.session,
    },
    include: {
      etudiant: true,
      createdBy: true,
    },
  });

  await calculateMoyenne(etudiantId, session,filiere);

  revalidatePath("/notes");

  return newNote;
}

export async function updateNote(formData: FormData) {
  const id = Number(formData.get("id"));
  const noteJyry = Number(formData.get("noteJyry") ?? 0);

  const etudiantId = Number(formData.get("etudiantId"));
  const createdById = String(formData.get("createdById"));

  if (!id || isNaN(noteJyry) || !etudiantId || !createdById) {
    throw new Error("Tous les champs sont obligatoires");
  }

  // ==========================
  // VERIFICATION ETUDIANT
  // ==========================

  const etudiant = await prisma.etudiant.findUnique({
    where: {
      id: etudiantId,
    },
  });

  if (!etudiant) {
    throw new Error("Étudiant introuvable");
  }

  // ==========================
  // NOTE THEORIQUE (/20)
  // ==========================

  const evalsTheorie = await prisma.evaluationTheorie.findMany({
    where: {
      etudiantId,
    },
  });

  let noteTheorique = 0;

  if (evalsTheorie.length > 0) {
    const total = evalsTheorie.reduce((acc, e) => acc + e.score, 0);

    noteTheorique = Number(
      ((total / (evalsTheorie.length * 20)) * 20).toFixed(2),
    );
  }

  // ==========================
  // NOTE PRATIQUE (/50)
  // ==========================

  const evaluations = await prisma.evaluation.findMany({
    where: {
      etudiantId,
    },
    include: {
      competences: {
        include: {
          competence: true,
        },
      },
    },
  });

  let notePratique = 0;

  if (evaluations.length > 0) {
    const score = evaluations.reduce(
      (acc, ev) => acc + ev.competences.reduce((a, c) => a + c.score, 0),
      0,
    );

    const max = evaluations.reduce(
      (acc, ev) =>
        acc +
        ev.competences.reduce((a, c) => a + (c.competence?.maxScore ?? 0), 0),
      0,
    );

    notePratique = max > 0 ? Number(((score / max) * 50).toFixed(2)) : 0;
  }

  // ==========================
  // UPDATE NOTE
  // ==========================

  const updated = await prisma.note.update({
    where: {
      id,
    },

    data: {
      noteTheorique,
      notePratique,
      noteJyry,

      etudiantId,
      createdById,

      // Obligatoire si présent dans ton modèle Note
      filiere: etudiant.filiere ?? "Non définie",
      session: etudiant.session ?? "Non définie",
    },

    include: {
      etudiant: true,
      createdBy: true,
    },
  });

  // recalcul moyenne
  await calculateMoyenne(etudiantId);

  revalidatePath("/notes");

  return updated;
}
// ===============================
// DELETE NOTE
// ===============================
export async function deleteNote(id: number) {
  await prisma.note.delete({
    where: { id },
  });

  revalidatePath("/notes");

  return {
    message: "Supprimé",
  };
}

// ===============================
// GET NOTES
// ===============================
export async function getNotes() {
  return prisma.note.findMany({
    include: {
      etudiant: true,
      createdBy: true,
    },
    orderBy: {
      id: "desc",
    },
  });
}

// ===============================
// GET RELEVE
// ===============================
export async function getReleve(
  etudiantId: number,
  session: string,
  filiere: string,
) {
  const notes = await prisma.note.findMany({
    where: {
      etudiantId,
      session,
      filiere,
    },
    include: {
      etudiant: true,
      createdBy: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  const stats = await calculateMoyenne(etudiantId, session, filiere);

  return {
    notes,
    stats,
  };
}

// ===============================
// GET ETUDIANTS / SESSIONS / FILIERES / ANNEES
// ===============================
export async function getEtudiants() {
  const etudiants = prisma.etudiant.findMany({ orderBy: { nom: "asc" } });
  return etudiants;
}
export async function getSessions() {
  const sessions = prisma.session.findMany({ orderBy: { dateDebut: "desc" } });
  return sessions;
}
export async function getFilieres() {
  const filieres = prisma.filiere.findMany({ orderBy: { nom: "asc" } });
  return filieres;
}
export async function getAnneesAcademiques() {
  const annees = prisma.anneeAcademique.findMany({
    orderBy: { annee: "desc" },
  });
  return annees;
}

// ===============================
// GET DELIBERATION LIST (GROUPED)
// ===============================
export async function getDeliberationList(session: string) {
  if (!session) {
    throw new Error("Session obligatoire");
  }

  // Récupérer les notes des étudiants de cette session
  const notes = await prisma.note.findMany({
    where: {
      etudiant: {
        session,
      },
    },

    include: {
      etudiant: true,
      createdBy: true,
    },

    orderBy: [
      {
        etudiant: {
          nom: "asc",
        },
      },
    ],
  });

  // Grouper par filière + étudiant
  const grouped: Record<string, Record<number, any>> = {};

  for (const note of notes) {
    const etudiant = note.etudiant;

    if (!etudiant) continue;

    const filiereName = etudiant.filiere ?? "Sans filière";
    const etudiantId = etudiant.id;

    if (!grouped[filiereName]) {
      grouped[filiereName] = {};
    }

    if (!grouped[filiereName][etudiantId]) {
      grouped[filiereName][etudiantId] = {
        etudiant,
        notes: [],
      };
    }

    grouped[filiereName][etudiantId].notes.push(note);
  }

  // Transformation finale
  const result = [];

  for (const filiere in grouped) {
    const studentsArray = [];

    for (const etuId in grouped[filiere]) {
      const data = grouped[filiere][etuId];

      let total = 0;

      for (const n of data.notes) {
        total +=
          (n.noteTheorique ?? 0) + (n.notePratique ?? 0) + (n.noteJyry ?? 0);
      }

      const moyenne = Number(total.toFixed(2));

      let mention = "Ajourné";

      if (moyenne >= 85) {
        mention = "Excellent";
      } else if (moyenne >= 70) {
        mention = "Très bien";
      } else if (moyenne >= 60) {
        mention = "Bien";
      } else if (moyenne >= 50) {
        mention = "Assez bien";
      }

      studentsArray.push({
        etudiant: data.etudiant,
        total: moyenne,
        moyenne,
        mention,
      });
    }

    result.push({
      filiere,
      students: studentsArray,
    });
  }

  return result;
}
