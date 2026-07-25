"use server";

import { prisma } from "@/app/lib/prisma";
import { getEtudiants } from "@/services/etudiantsService";
import { revalidatePath } from "next/cache";

/**
 * Ajouter une filière
 */
export async function addFiliere(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  const nombreHp = Number(formData.get("nombreHp")) || 0;
  const nombreHt = Number(formData.get("nombreHt")) || 0;
  const description = formData.get("description")?.toString() || null;

  if (!nom) throw new Error("Le nom de la filière est obligatoire");

  // Crée ou récupère un utilisateur par défaut
  const user = await prisma.user.upsert({
    where: { email: "default@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "default@admin.com",
      password: "test123", // ⚠️ À hasher en production
      role: "ADMIN",
    },
  });

  const filiere = await prisma.filiere.create({
    data: {
      nom,
      nombreHp,
      nombreHt,
      description,
      createdById: user.id,
    },
  });

  revalidatePath("/filieres");
  return filiere;
}

/**
 * Modifier une filière
 */
export async function updateFiliere(formData: FormData) {
  const id = Number(formData.get("id"));
  const nom = formData.get("nom")?.toString();
  const nombreHp = Number(formData.get("nombreHp")) || 0;
  const nombreHt = Number(formData.get("nombreHt")) || 0;
  const description = formData.get("description")?.toString() || null;

  if (!id || !nom) throw new Error("ID ou nom manquant");

  const filiere = await prisma.filiere.update({
    where: { id },
    data: {
      nom,
      nombreHp,
      nombreHt,
      description,
    },
  });

  revalidatePath("/filieres");
  return filiere;
}

/**
 * Supprimer une filière
 */
export async function deleteFiliere(id: number) {
  if (!id) throw new Error("ID manquant");

  await prisma.filiere.delete({ where: { id } });
  revalidatePath("/filieres");
}

/**
 * Récupérer toutes les filières
 */
export async function getFilieres() {
  return await prisma.filiere.findMany({
    orderBy: { id: "desc" },
  });
}

// adapte le chemin


export async function syncFilieres() {
  // Utilisateur par défaut
  const user = await prisma.user.upsert({
    where: { email: "default@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "default@admin.com",
      password: "test123",
      role: "ADMIN",
    },
  });

  // Récupération des étudiants
  const data = await getEtudiants();

  // Liste des filières uniques
  const filieresUniques = [...new Set(data.etudiants.map((e) => e.filiere.trim()))];

  let ajoutees = 0;

  for (const nom of filieresUniques) {
    const existe = await prisma.filiere.findFirst({
      where: { nom },
    });

    if (!existe) {
      await prisma.filiere.create({
        data: {
          nom,
          nombreHp: 0,
          nombreHt: 0,
          description: null,
          createdById: user.id,
        },
      });

      ajoutees++;
    }
  }

  revalidatePath("/filieres");

  return {
    success: true,
    ajoutees,
    total: filieresUniques.length,
  };
}
