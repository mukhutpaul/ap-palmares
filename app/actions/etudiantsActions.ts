"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

// ===============================
// Récupérer les classes
// ===============================
export async function getClasses() {
  return prisma.classe.findMany({
    include: { filiere: true },
    orderBy: { nom: "asc" },
  });
}

// ===============================
// Ajouter un étudiant
// ===============================
export async function addEtudiant(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  const postnom = formData.get("postnom")?.toString();
  const prenom = formData.get("prenom")?.toString();
  const email = formData.get("email")?.toString();
  const sexe = formData.get("sexe")?.toString();
  const createdById = String(formData.get("createdById"));

  if (!nom || !postnom || !prenom || !email || !sexe) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const etudiant = await prisma.etudiant.create({
    data: {
      nom,
      postnom,
      prenom,
      email,
      sexe,
      createdById,
    },
  });

  revalidatePath("/etudiants");
  return etudiant;
}

// ===============================
// Récupérer les filières
// ===============================
export async function getFilieres() {
  return prisma.filiere.findMany({
    orderBy: { nom: "asc" },
  });
}

// ===============================
// Modifier un étudiant
// ===============================
export async function updateEtudiant(formData: FormData) {
  const id = Number(formData.get("id"));
  const nom = formData.get("nom")?.toString();
  const postnom = formData.get("postnom")?.toString();
  const prenom = formData.get("prenom")?.toString();
  const email = formData.get("email")?.toString();
  const sexe = formData.get("sexe")?.toString();
  const createdById = String(formData.get("createdById"));

  if (!id || !nom || !postnom || !prenom || !email || !sexe) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const etudiant = await prisma.etudiant.update({
    where: { id },
    data: {
      nom,
      postnom,
      prenom,
      email,
      sexe,
      createdById,
    },
  });

  revalidatePath("/etudiants");
  return etudiant;
}

// ===============================
// Supprimer un étudiant
// ===============================
export async function deleteEtudiant(id: number) {
  if (!id) throw new Error("ID manquant");

  await prisma.etudiant.delete({ where: { id } });
  revalidatePath("/etudiants");

  return { message: "Étudiant supprimé" };
}

// ===============================
// Récupérer tous les étudiants
// ===============================
export async function getEtudiants() {
  return prisma.etudiant.findMany({
    // include: { classe: { include: { filiere: true } } },
    orderBy: { id: "desc" },
  });
}

// ===============================
// Récupérer un étudiant par ID
// ===============================
export async function getEtudiantById(id: number) {
  if (!id) throw new Error("ID manquant");

  const etudiant = await prisma.etudiant.findUnique({
    where: { id }
  });

  if (!etudiant) throw new Error("Étudiant non trouvé");
  return etudiant;
}
