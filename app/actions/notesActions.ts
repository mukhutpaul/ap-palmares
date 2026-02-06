"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

// ===============================
// TYPES
// ===============================
interface NoteData {
  matiere: string;
  note: number;
  etudiantId: number;
  anneeAcademiqueId: number;
  createdById: string;
}

// ===============================
// Ajouter une note
// ===============================
export async function addNote(formData: FormData) {
  const matiere = formData.get("matiere")?.toString();
  const note = Number(formData.get("note"));
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const createdById = String(formData.get("createdById"));

  if (!matiere || !note || !etudiantId || !anneeAcademiqueId)
    throw new Error("Tous les champs sont obligatoires");

  const newNote = await prisma.note.create({
    data: {
      matiere,
      note,
      etudiantId,
      anneeAcademiqueId,
      createdById,
    },
    include: {
      etudiant: true,
      anneeAcademique: true,
    },
  });

  revalidatePath("/notes");
  return newNote;
}

// ===============================
// Modifier une note
// ===============================
export async function updateNote(formData: FormData) {
  const id = Number(formData.get("id"));
  const matiere = formData.get("matiere")?.toString();
  const note = Number(formData.get("note"));
  const etudiantId = Number(formData.get("etudiantId"));
  const anneeAcademiqueId = Number(formData.get("anneeAcademiqueId"));
  const createdById = String(formData.get("createdById"));

  if (!id || !matiere || !note || !etudiantId || !anneeAcademiqueId)
    throw new Error("Tous les champs sont obligatoires");

  const updatedNote = await prisma.note.update({
    where: { id },
    data: { matiere, note, etudiantId, anneeAcademiqueId, createdById },
    include: {
      etudiant: true,
      anneeAcademique: true,
    },
  });

  revalidatePath("/notes");
  return updatedNote;
}

// ===============================
// Supprimer une note
// ===============================
export async function deleteNote(id: number) {
  if (!id) throw new Error("ID manquant pour la suppression");
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
  return { message: "Note supprimée avec succès" };
}

// ===============================
// Récupérer toutes les notes
// ===============================
export async function getNotes() {
  const notes = await prisma.note.findMany({
    include: { etudiant: true, anneeAcademique: true },
    orderBy: { id: "desc" },
  });
  return notes;
}

// ===============================
// Récupérer les étudiants et années
// ===============================
export async function getEtudiants() {
  return prisma.etudiant.findMany({ orderBy: { nom: "asc" } });
}

/* export async function getAnneesAcademiques() {
  return prisma.anneeAcademique.findMany({ orderBy: { annee: "desc" } });
} */
// app/actions/notesActions.ts


export async function getAnneesAcademiques() {
  const annees = await prisma.anneeAcademique.findMany({
    orderBy: { annee: "desc" },
  });
  return annees.map((a) => ({
    id: a.id,
    annee: a.annee,
    active: a.active,
  }));
}


// ===============================
// Récupérer le relevé d'un étudiant
// ===============================
// export async function getReleve(etudiantId: number, anneeAcademiqueId?: number) {
//   if (!etudiantId) throw new Error("ID de l'étudiant manquant");

//   // Construction de la condition
//   const where: any = { etudiantId };
//   if (anneeAcademiqueId) where.anneeAcademiqueId = anneeAcademiqueId;

//   const releve = await prisma.note.findMany({
//     where,
//     include: {
//       etudiant: true,
//       anneeAcademique: true,
//     },
//     orderBy: { matiere: "asc" },
//   });

//   return releve;
// }


interface Etudiant { id: number; nom: string; postnom: string; prenom: string; }
interface Annee { id: number; annee: string; }
interface Note { id: number; matiere: string; note: number; etudiant: Etudiant; anneeAcademique: Annee; }

export async function getReleve(etudiantId: number, anneeId: number): Promise<Note[]> {
  const notes = await getNotes();

  // filtre les notes correctement
  const releve = notes.filter(
    (n) => n.etudiant?.id === etudiantId && n.anneeAcademique?.id === anneeId
  );

  // debug : log côté serveur
  console.log("Relevé récupéré :", releve);

  return releve;
}

/* 
export async function getAnneesAcademiques() {
  const annees = await prisma.anneeAcademique.findMany({
    orderBy: { annee: "desc" },
  });
  return annees.map((a) => ({
    id: a.id,
    annee: a.annee,
    active: a.active,
  }));
} */


export async function importNotesFromExcel(file: File) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  for (const row of rows) {
    const { Etudiant, Matiere, Note, Annee, createdById } = row;

    // Parse Etudiant en nom, postnom, prenom
    // Suppose que Etudiant = "Nom Postnom Prenom" ou "Nom Postnom Prenom K" (dernier mot en trop)
    const parts = Etudiant.trim().split(" ");
    const nom = parts[0];
    const postnom = parts[1];
    // Le prénom peut être plusieurs mots, on prend tout après les 2 premiers mots
    const prenom = parts.slice(2).join(" ");

    if (!nom || !postnom || !prenom) {
      console.warn(`Impossible de parser Etudiant: "${Etudiant}"`);
      continue; // passe cette ligne
    }

    // Trouver étudiant
    const etudiant = await prisma.etudiant.findFirst({
      where: { nom, postnom, prenom },
    });
    if (!etudiant) {
      console.warn(`Étudiant non trouvé: ${Etudiant}`);
      continue;
    }

    // Trouver année académique
    const annee = await prisma.anneeAcademique.findFirst({
      where: { annee: Annee },
    });
    if (!annee) {
      console.warn(`Année académique non trouvée: ${Annee}`);
      continue;
    }

    // Créer la note
    try {
      await prisma.note.create({
        data: {
          matiere: Matiere,
          note: Number(Note),
          etudiantId: etudiant.id,
          anneeAcademiqueId: annee.id,
          createdById: createdById,
        },
      });
    } catch (e) {
      console.error("Erreur création note:", e);
    }
  }
}



