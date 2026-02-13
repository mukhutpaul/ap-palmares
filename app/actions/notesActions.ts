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

  const total = notes.reduce((sum, n) => sum + n.note, 0);
  const max = notes.length * 20;
  const pourcentage = (total / max) * 100;

  let mention = "Ajourné";
  if (pourcentage >= 80) mention = "Grande Distinction";
  else if (pourcentage >= 70) mention = "Distinction";
  else if (pourcentage >= 50) mention = "Satisfaction";

  return {
    moyenne: total / notes.length,
    pourcentage,
    mention,
  };
}

// ===============================
// ADD NOTE
// ===============================
export async function addNote(formData: FormData) {
  const matiere = formData.get("matiere")?.toString();
  const note = Number(formData.get("note"));
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const sessionId = Number(formData.get("sessionId"));
  const filiereId = Number(formData.get("filiereId"));
  const createdById = String(formData.get("createdById"));

  if (
    !matiere ||
    isNaN(note) ||
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

  const existing = await prisma.note.findFirst({
    where: {
      matiere,
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
    },
  });

  if (existing) {
    throw new Error("Une note existe déjà pour cette matière, session et filière (pour cet étudiant).");
  }

  const newNote = await prisma.note.create({
    data: {
      matiere,
      note,
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
  const matiere = formData.get("matiere")?.toString();
  const note = Number(formData.get("note"));
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const sessionId = Number(formData.get("sessionId"));
  const filiereId = Number(formData.get("filiereId"));
  const createdById = String(formData.get("createdById"));

  if (
    !id ||
    !matiere ||
    isNaN(note) ||
    !etudiantId ||
    !anneeAcademiqueId ||
    !sessionId ||
    !filiereId ||
    !createdById
  )
    throw new Error("Tous les champs sont obligatoires");

  const existing = await prisma.note.findFirst({
    where: {
      id: { not: id },
      matiere,
      etudiantId,
      anneeAcademiqueId,
      sessionId,
      filiereId,
    },
  });

  if (existing) {
    throw new Error(
      "Une note existe déjà pour cette matière, session et filière (pour cet étudiant)."
    );
  }

  const updated = await prisma.note.update({
    where: { id },
    data: {
      matiere,
      note,
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
// DELETE
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
    orderBy: { matiere: "asc" },
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
// GET ETUDIANTS
// ===============================
export async function getEtudiants() {
  return prisma.etudiant.findMany({
    orderBy: { nom: "asc" },
  });
}

// ===============================
// GET SESSIONS
// ===============================
export async function getSessions() {
  return prisma.session.findMany({
    orderBy: { dateDebut: "desc" },
  });
}

// ===============================
// GET FILIERES
// ===============================
export async function getFilieres() {
  return prisma.filiere.findMany({
    orderBy: { nom: "asc" },
  });
}

// ===============================
// GET ANNEES ACADEMIQUES
// ===============================
export async function getAnneesAcademiques() {
  return prisma.anneeAcademique.findMany({
    orderBy: { annee: "desc" },
  });
}
