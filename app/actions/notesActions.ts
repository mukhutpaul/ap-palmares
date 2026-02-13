"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

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
    !filiereId
  )
    throw new Error("Tous les champs sont obligatoires");

  // 🔥 Empêcher doublon
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
    throw new Error(
      "Une note existe déjà pour cette matière, session et filière."
    );
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

  // 🔥 Calcul à la volée (sans update en base)
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
    !filiereId
  )
    throw new Error("Tous les champs sont obligatoires");

  // 🔥 Empêcher doublon (sauf la note actuelle)
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
      "Une note existe déjà pour cette matière, session et filière."
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

  // 🔥 Calcul à la volée (sans update en base)
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
