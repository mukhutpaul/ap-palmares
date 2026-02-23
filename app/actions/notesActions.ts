"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

// ===============================
// CALCUL MOYENNE + MENTION
// ===============================
async function calculateMoyenne(
  etudiantId: number,
  anneeAcademiqueId: number,
  sessionId: number,
  filiereId: number
) {
  const notes = await prisma.note.findMany({
    where: {
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
    },
  });

  if (!notes.length) return { moyenne: 0, pourcentage: 0, mention: "Ajourné" };

  // Somme de toutes les notes (en ignorant null)
  let total = 0;
  let count = 0;
  for (const n of notes) {
    if (n.noteTheorique != null) { total += n.noteTheorique; count++; }
    if (n.notePratique != null) { total += n.notePratique; count++; }
    if (n.noteJyry != null) { total += n.noteJyry; count++; }
  }

  const max = 100;
  const pourcentage = (total / max) * 100;

  let mention = "Ajourné";
  if (pourcentage >= 80) mention = "Excellent";
  else if (pourcentage >= 70) mention = "Très bien";
  else if (pourcentage >= 60) mention = "Bien";
  else if (pourcentage >= 50) mention = "Assez bien";

  return {
    moyenne: total / 3,
    pourcentage,
    mention,
  };
}

// ===============================
// ADD NOTE
// ===============================
// export async function addNote(formData: FormData) {
//   const noteTheorique = Number(formData.get("noteTheorique") ?? 0);
//   const notePratique = Number(formData.get("notePratique") ?? 0);
//   const noteJyry = Number(formData.get("noteJyry") ?? 0);
//   const etudiantId = Number(formData.get("etudiantId"));
//   const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
//   const sessionId = Number(formData.get("sessionId"));
//   const filiereId = Number(formData.get("filiereId"));
//   const createdById = String(formData.get("createdById"));

//   if (
//     isNaN(noteTheorique) ||
//     isNaN(notePratique) ||
//     isNaN(noteJyry) ||
//     !etudiantId ||
//     !anneeAcademiqueId ||
//     !sessionId ||
//     !filiereId ||
//     !createdById
//   )
//     throw new Error("Tous les champs sont obligatoires");

//   const userExists = await prisma.user.findUnique({ where: { id: createdById } });
//   if (!userExists) throw new Error("Utilisateur introuvable (createdById invalide)");

//   const [etudiant, annee, session, filiere] = await Promise.all([
//     prisma.etudiant.findUnique({ where: { id: etudiantId } }),
//     prisma.anneeAcademique.findUnique({ where: { id: anneeAcademiqueId } }),
//     prisma.session.findUnique({ where: { id: sessionId } }),
//     prisma.filiere.findUnique({ where: { id: filiereId } }),
//   ]);

//   if (!etudiant || !annee || !session || !filiere) {
//     throw new Error("Données invalides : étudiant/année/session/filière introuvable");
//   }

//   const newNote = await prisma.note.create({
//     data: {
//       noteTheorique,
//       notePratique,
//       noteJyry,
//       etudiantId,
//       anneeAcademiqueId,
//       sessionId,
//       filiereId,
//       createdById,
//     },
//     include: {
//       etudiant: true,
//       anneeAcademique: true,
//       session: true,
//       filiere: true,
//     },
//   });

//   await calculateMoyenne(etudiantId, anneeAcademiqueId, sessionId, filiereId);
//   revalidatePath("/notes");
//   return newNote;
// }

export async function addNote(formData: FormData) {
  const noteTheorique = Number(formData.get("noteTheorique") ?? 0);
  const noteJyry = Number(formData.get("noteJyry") ?? 0);

  let notePratique = 0;

  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const sessionId = Number(formData.get("sessionId"));
  const filiereId = Number(formData.get("filiereId"));
  const createdById = String(formData.get("createdById"));

  if (
    isNaN(noteTheorique) ||
    isNaN(noteJyry) ||
    !etudiantId ||
    !anneeAcademiqueId ||
    !sessionId ||
    !filiereId ||
    !createdById
  )
    throw new Error("Tous les champs sont obligatoires");

  const userExists = await prisma.user.findUnique({
    where: { id: createdById },
  });
  if (!userExists)
    throw new Error("Utilisateur introuvable (createdById invalide)");

  const [etudiant, annee, session, filiere] = await Promise.all([
    prisma.etudiant.findUnique({ where: { id: etudiantId } }),
    prisma.anneeAcademique.findUnique({ where: { id: anneeAcademiqueId } }),
    prisma.session.findUnique({ where: { id: sessionId } }),
    prisma.filiere.findUnique({ where: { id: filiereId } }),
  ]);

  if (!etudiant || !annee || !session || !filiere) {
    throw new Error(
      "Données invalides : étudiant/année/session/filière introuvable"
    );
  }

  // 🔥 Récupérer l'évaluation
  const evaluation = await prisma.evaluation.findUnique({
    where: {
      etudiantId_filiereId_sessionId_anneeAcademiqueId: {
        etudiantId,
        filiereId,
        sessionId,
        anneeAcademiqueId,
      },
    },
    include: {
      competences: true,
    },
  });

  if (evaluation && evaluation.competences.length > 0) {
    const totalScore = evaluation.competences.reduce(
      (acc, comp) => acc + comp.score,
      0
    );

    // ✅ chaque compétence max = 5
    const maxPossible = evaluation.competences.length * 5;

    // ✅ ramener sur 50
    notePratique = (totalScore / maxPossible) * 50;

    // ✅ arrondir à 2 décimales
    notePratique = Number(notePratique.toFixed(2));
  } else {
    notePratique = 0;
  }

  const newNote = await prisma.note.create({
    data: {
      noteTheorique,
      notePratique,
      noteJyry,
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
      createdById,
    },
    include: {
      etudiant: true,
      anneeAcademique: true,
      session: true,
      filiere: true,
    },
  });

  await calculateMoyenne(
    etudiantId,
    anneeAcademiqueId,
    sessionId,
    filiereId
  );

  revalidatePath("/notes");

  return newNote;
}
// ===============================
// UPDATE NOTE
// ===============================
export async function updateNote(formData: FormData) {
  const id = Number(formData.get("id"));
  const noteTheorique = Number(formData.get("noteTheorique") ?? 0);
  const notePratique = Number(formData.get("notePratique") ?? 0);
  const noteJyry = Number(formData.get("noteJyry") ?? 0);
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const sessionId = Number(formData.get("sessionId"));
  const filiereId = Number(formData.get("filiereId"));
  const createdById = String(formData.get("createdById"));

  if (
    !id ||
    isNaN(noteTheorique) ||
    isNaN(notePratique) ||
    isNaN(noteJyry) ||
    !etudiantId ||
    !anneeAcademiqueId ||
    !sessionId ||
    !filiereId ||
    !createdById
  )
    throw new Error("Tous les champs sont obligatoires");

  const updated = await prisma.note.update({
    where: { id },
    data: {
      noteTheorique,
      notePratique,
      noteJyry,
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
      createdById,
    },
    include: {
      etudiant: true,
      anneeAcademique: true,
      session: true,
      filiere: true,
    },
  });

  await calculateMoyenne(etudiantId, anneeAcademiqueId, sessionId, filiereId);
  revalidatePath("/notes");
  return updated;
}

// ===============================
// DELETE NOTE
// ===============================
export async function deleteNote(id: number) {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
  return { message: "Supprimé" };
}

// ===============================
// GET NOTES
// ===============================
export async function getNotes() {
  return prisma.note.findMany({
    include: {
      etudiant: true,
      anneeAcademique: true,
      session: true,
      filiere: true,
    },
    orderBy: { id: "desc" },
  });
}

// ===============================
// GET RELEVE
// ===============================
export async function getReleve(
  etudiantId: number,
  anneeAcademiqueId: number,
  sessionId: number,
  filiereId: number
) {
  const notes = await prisma.note.findMany({
    where: {
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
    },
    include: {
      etudiant: true,
      anneeAcademique: true,
      session: true,
      filiere: true,
    },
    orderBy: { id: "asc" },
  });

  const stats = await calculateMoyenne(
    etudiantId,
    anneeAcademiqueId,
    sessionId,
    filiereId
  );

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
  const annees = prisma.anneeAcademique.findMany({ orderBy: { annee: "desc" } });
  return annees;
}

// ===============================
// GET DELIBERATION LIST (GROUPED)
// ===============================
export async function getDeliberationList(
  anneeAcademiqueId: number,
  sessionId: number
) {
  if (!anneeAcademiqueId || !sessionId) {
    throw new Error("Année académique et session obligatoires");
  }

  // Récupérer toutes les notes avec relations
  const notes = await prisma.note.findMany({
    where: {
      anneeAcademiqueId,
      sessionId,
    },
    include: {
      etudiant: true,
      filiere: true,
      anneeAcademique: true,
      session: true,
    },
    orderBy: [
      { filiere: { nom: "asc" } },
      { etudiant: { nom: "asc" } },
    ],
  });

  // Grouper par filière + étudiant
  const grouped: any = {};

  for (const note of notes) {
    if (!note.filiere || !note.etudiant) continue; // ✅ protection TS
    const filiereName = note.filiere.nom;
    const etudiantId = note.etudiant.id;

    if (!grouped[filiereName]) {
      grouped[filiereName] = {};
    }

    if (!grouped[filiereName][etudiantId]) {
      grouped[filiereName][etudiantId] = {
        etudiant: note.etudiant,
        notes: [],
      };
    }

    grouped[filiereName][etudiantId].notes.push(note);
  }

  // Transformer en tableau final avec moyenne + mention
  const result = [];

  for (const filiere in grouped) {
    const studentsArray = [];

    for (const etuId in grouped[filiere]) {
      const data = grouped[filiere][etuId];

      let total = 0;
      for (const n of data.notes) {
        total +=
          (n.noteTheorique ?? 0) +
          (n.notePratique ?? 0) +
          (n.noteJyry ?? 0);
      }

      const pourcentage = total;
      let mention = "Ajourné";

      if (pourcentage >= 80) mention = "Excellent";
      else if (pourcentage >= 70) mention = "Très bien";
      else if (pourcentage >= 60) mention = "Bien";
      else if (pourcentage >= 50) mention = "Assez bien";

      studentsArray.push({
        etudiant: data.etudiant,
        total,
        pourcentage,
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

