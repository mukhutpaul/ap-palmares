"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Ajouter une filière
 */
export async function addFiliere(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  if (!nom) throw new Error("Le nom de la filière est obligatoire");

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

  const filiere = await prisma.filiere.create({
    data: { nom, createdById: user.id },
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

  if (!id || !nom) throw new Error("ID ou nom de la filière manquant");

  const filiere = await prisma.filiere.update({
    where: { id },
    data: { nom },
  });

  revalidatePath("/filieres");
  return filiere;
}

/**
 * Supprimer une filière
 */
export async function deleteFiliere(id: number) {
  if (!id) throw new Error("ID manquant pour la suppression");

  await prisma.filiere.delete({ where: { id } });
  revalidatePath("/filieres");
}

/**
 * Récupérer toutes les filières
 */
export async function getFilieres() {
  const filieres = await prisma.filiere.findMany({
    orderBy: { id: "desc" }, // afficher les dernières d'abord
  });
  return filieres;
}
