"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Ajouter une classe
 * @param formData FormData contenant { nom, section, filiereId, sessionId }
 */
export async function addClasse(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  const filiereId = Number(formData.get("filiereId"));
  const sessionId = Number(formData.get("sessionId"));

  if (!nom || !filiereId || !sessionId) {
    throw new Error("Nom, section, filière et session sont obligatoires");
  }

  // Crée ou récupère un utilisateur par défaut
  const user = await prisma.user.upsert({
    where: { email: "default@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "default@admin.com",
      password: "test123", // ⚠️ à hasher en production
      role: "ADMIN",
    },
  });

  // Crée la classe
  const classe = await prisma.classe.create({
    data: {
      nom,
      filiere: { connect: { id: filiereId } },
      session: { connect: { id: sessionId } },
      createdBy: { connect: { email: "default@admin.com" } }
    },
    include: { filiere: true, session: true },
  });

  revalidatePath("/classes");

  return classe;
}

/**
 * Modifier une classe
 * @param formData FormData contenant { id, nom, section, filiereId, sessionId }
 */
export async function updateClasse(formData: FormData) {
  const id = Number(formData.get("id"));
  const nom = formData.get("nom")?.toString();
  const section = formData.get("section")?.toString();
  const filiereId = Number(formData.get("filiereId"));
  const sessionId = Number(formData.get("sessionId"));

  if (!id || !nom || !section || !filiereId || !sessionId) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const updatedClasse = await prisma.classe.update({
    where: { id },
    data: {
      nom,
      filiere: { connect: { id: filiereId } },
      session: { connect: { id: sessionId } },
    },
    include: { filiere: true, session: true },
  });

  revalidatePath("/classes");

  return updatedClasse;
}

/**
 * Supprimer une classe
 * @param id number
 */
export async function deleteClasse(id: number) {
  if (!id) throw new Error("ID manquant pour la suppression");

  await prisma.classe.delete({
    where: { id },
  });

  revalidatePath("/classes");
}

/**
 * Récupérer toutes les classes
 */
export async function getClasses() {
  const classes = await prisma.classe.findMany({
    include: { filiere: true, session: true },
    orderBy: { id: "desc" },
  });
  return classes;
}

export async function getSessions() {
  const sessions = await prisma.session.findMany({
    orderBy: { id: "desc" },
  });
  return sessions;
}

export async function getEtudiants() {
  const etudiants = await prisma.etudiant.findMany({
    orderBy: { id: "asc" },
  });

  return etudiants;
}
