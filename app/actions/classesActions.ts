"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Ajouter une classe
 * @param formData FormData contenant { nom, section, filiereId, sessionId }
 */
/**
 * Ajouter une classe
 * @param formData FormData contenant { nom, filiereId, sessionId, etudiantId }
 */
export async function addClasse(formData: FormData) {
  // Récupère les données du formulaire
  const nom = formData.get("nom")?.toString().trim();
  const filiereId = Number(formData.get("filiereId"));
  const sessionId = Number(formData.get("sessionId"));
  const etudiantId = Number(formData.get("etudiantId"));

  // Vérifie que tous les champs sont valides
  if (!nom || !filiereId || !sessionId || !etudiantId || isNaN(filiereId) || isNaN(sessionId) || isNaN(etudiantId)) {
    throw new Error("Nom, étudiant, filière et session sont obligatoires et doivent être valides.");
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

  // Vérifie que l'étudiant existe
  const etudiantExists = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
  });

  if (!etudiantExists) {
    throw new Error("L'étudiant spécifié n'existe pas !");
  }

  // Crée la classe
  const classe = await prisma.classe.create({
    data: {
      nom,
      filiere: { connect: { id: filiereId } },
      session: { connect: { id: sessionId } },
      etudiant: { connect: { id: etudiantId } },
      createdBy: { connect: { email: "default@admin.com" } },
    },
    include: { filiere: true, session: true, etudiant: true },
  });

  // Revalide le cache
  revalidatePath("/classes");

  return classe;
}

/**
 * Modifier une classe
 * @param formData FormData contenant { id, nom, filiereId, sessionId, etudiantId }
 */
export async function updateClasse(formData: FormData) {
  const id = Number(formData.get("id"));
  const nom = formData.get("nom")?.toString().trim();
  const filiereId = Number(formData.get("filiereId"));
  const sessionId = Number(formData.get("sessionId"));
  const etudiantId = Number(formData.get("etudiantId"));

  // Vérification
  if (!id || !nom || !filiereId || !sessionId || !etudiantId || isNaN(id) || isNaN(filiereId) || isNaN(sessionId) || isNaN(etudiantId)) {
    throw new Error("Tous les champs sont obligatoires et doivent être valides.");
  }

  // Vérifie que l'étudiant existe
  const etudiantExists = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
  });

  if (!etudiantExists) {
    throw new Error("L'étudiant spécifié n'existe pas !");
  }

  // Met à jour la classe
  const updatedClasse = await prisma.classe.update({
    where: { id },
    data: {
      nom,
      filiere: { connect: { id: filiereId } },
      session: { connect: { id: sessionId } },
      etudiant: { connect: { id: etudiantId } },
    },
    include: { filiere: true, session: true, etudiant: true },
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
    include: { filiere: true, session: true, etudiant: true },
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

/**
 * Récupérer un étudiant par son ID
 * @param id number
 */
export async function getEtudiantById(id: number) {
  if (!id) throw new Error("ID étudiant manquant");

  const etudiant = await prisma.etudiant.findUnique({
    where: { id },
  });

  return etudiant; // renvoie null si non trouvé
}

