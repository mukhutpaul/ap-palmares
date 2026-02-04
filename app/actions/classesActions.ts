"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Ajouter une classe
 * @param formData FormData contenant { nom, section, filiereId }
 */
export async function addClasse(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  const section = formData.get("section")?.toString();
  const filiereId = Number(formData.get("filiereId"));

  if (!nom || !section || !filiereId) throw new Error("Nom, section et filière sont obligatoires");

  // Crée ou récupère un utilisateur par défaut
  const user = await prisma.user.upsert({
    where: { email: "default@admin.com" },
    update: {},
    create: {
      name: "Admin",
      email: "default@admin.com",
      password: "test123", // ⚠️ hasher en production
      role: "ADMIN",
    },
  });

  // Crée la classe
  const classe = await prisma.classe.create({
    data: {
      nom,
      section,
      filiereId,
      createdById: user.id,
    },
  });

  revalidatePath("/classes");

  return classe;
}

/**
 * Modifier une classe
 * @param formData FormData contenant { id, nom, section, filiereId }
 */
// export async function updateClasse(formData: FormData) {
//   const id = Number(formData.get("id"));
//   const nom = formData.get("nom")?.toString();
//   const section = formData.get("section")?.toString();
//   const filiereId = Number(formData.get("filiereId"));

//   if (!id || !nom || !section || !filiereId) throw new Error("Toutes les informations sont requises");

//   const classe = await prisma.classe.update({
//     where: { id },
//     data: { nom, section, filiereId },
//   });

//   revalidatePath("/classes");

//   return classe;
// }

export async function updateClasse(formData: FormData) {
  const id = Number(formData.get("id"));
  const nom = formData.get("nom")?.toString();
  const section = formData.get("section")?.toString();
  const filiereId = Number(formData.get("filiereId"));

  if (!id || !nom || !section || !filiereId) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const updatedClasse = await prisma.classe.update({
    where: { id },
    data: {
      nom,
      section,
      filiere: { connect: { id: filiereId } }, // Connecte la filière via l'ID
    },
    include: { filiere: true }, // Inclut la filière dans la réponse
  });

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
    include: { filiere: true }, // inclut le nom de la filière
    orderBy: { id: "desc" },
  });
  return classes;
}

