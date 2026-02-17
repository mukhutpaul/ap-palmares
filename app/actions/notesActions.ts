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

  const max = count * 20;
  const pourcentage = (total / max) * 100;

  let mention = "Ajourné";
  if (pourcentage >= 80) mention = "Grande Distinction";
  else if (pourcentage >= 70) mention = "Distinction";
  else if (pourcentage >= 50) mention = "Satisfaction";

  return {
    moyenne: total / count,
    pourcentage,
    mention,
  };
}

// ===============================
// ADD NOTE
// ===============================
export async function addNote(formData: FormData) {
  const noteTheorique = Number(formData.get("noteTheorique") ?? 0);
  const notePratique = Number(formData.get("notePratique") ?? 0);
  const noteJyry = Number(formData.get("noteJyry") ?? 0);
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const sessionId = Number(formData.get("sessionId"));
  const filiereId = Number(formData.get("filiereId"));
  const createdById = String(formData.get("createdById"));

  if (
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

  const userExists = await prisma.user.findUnique({ where: { id: createdById } });
  if (!userExists) throw new Error("Utilisateur introuvable (createdById invalide)");

  const [etudiant, annee, session, filiere] = await Promise.all([
    prisma.etudiant.findUnique({ where: { id: etudiantId } }),
    prisma.anneeAcademique.findUnique({ where: { id: anneeAcademiqueId } }),
    prisma.session.findUnique({ where: { id: sessionId } }),
    prisma.filiere.findUnique({ where: { id: filiereId } }),
  ]);

  if (!etudiant || !annee || !session || !filiere) {
    throw new Error("Données invalides : étudiant/année/session/filière introuvable");
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

  await calculateMoyenne(etudiantId, anneeAcademiqueId, sessionId, filiereId);
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
export async function getEtudiants () {
  const etudiants = prisma.etudiant.findMany({ orderBy: { nom: "asc" } });
  return etudiants;
}
export async function getSessions (){
 const sessions = prisma.session.findMany({ orderBy: { dateDebut: "desc" } });
 return sessions;
} 
export async function getFilieres(){
  const filieres = prisma.filiere.findMany({ orderBy: { nom: "asc" } });
  return filieres;

} 
export async function getAnneesAcademiques(){
  const annees = prisma.anneeAcademique.findMany({ orderBy: { annee: "desc" } });
  return annees;
} 
