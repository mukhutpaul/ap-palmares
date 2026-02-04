"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import getServerSession from "next-auth";  // Assurez-vous que getServerSession fonctionne correctement
  // Assurez-vous que authOptions est correctement exporté et configuré

// ===============================
// Définition du type personnalisé de la session
// ===============================

// Ce type est basé sur les données de session qui devraient être présentes avec NextAuth
interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "USER" | "ENSEIGNANT";
}

// Le type de la session avec l'utilisateur
interface SessionWithUser {
  user: SessionUser;
}

export async function getClasses() {
  const classes = await prisma.classe.findMany({
    include: { filiere: true }, // Inclure la filière associée à la classe
    orderBy: { nom: "asc" }, // Optionnel : trier les classes par nom (ou tout autre critère)
  });
  return classes;
}

// ===============================
// Ajouter un étudiant
// ===============================

/**
 * Ajouter un étudiant
 * @param formData FormData contenant { nom, postnom, prenom, email, classeId }
 */
export async function addEtudiant(formData: FormData) {
  const nom = formData.get("nom")?.toString();
  const postnom = formData.get("postnom")?.toString();
  const prenom = formData.get("prenom")?.toString();
  const email = formData.get("email")?.toString();
  const classeId = Number(formData.get("classeId"));
  const createdById = String(formData.get("createdById"));
  

  if (!nom || !postnom || !prenom || !email || !classeId)
    throw new Error("Tous les champs sont obligatoires");

  // Récupère la session avec typage sécurisé
  

  // Créer l'étudiant avec les données soumises
  const etudiant = await prisma.etudiant.create({
    data: {
      nom,
      postnom,
      prenom,
      email,
      classeId,
      createdById,
    },
    include: { classe: { include: { filiere: true } } },  // Inclure la classe avec sa filière
  });

  revalidatePath("/etudiants");

  return etudiant;  // Le résultat inclura désormais la propriété 'classe' dans l'objet 'etudiant'
}



// Récupérer les filières
export async function getFilieres() {
  const filieres = await prisma.filiere.findMany({
    orderBy: { nom: "asc" }, // Exemple : trier par nom
  });
  return filieres;
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
  const classeId = Number(formData.get("classeId"));

  if (!id || !nom || !postnom || !prenom || !email || !classeId)
    throw new Error("Tous les champs sont obligatoires");

  const etudiant = await prisma.etudiant.update({
    where: { id },
    data: { nom, postnom, prenom, email, classeId },
    include: { classe: { include: { filiere: true } } },  // Inclure la classe avec sa filière
  });

  revalidatePath("/etudiants");

  return etudiant;
}

// ===============================
// Supprimer un étudiant
// ===============================

export async function deleteEtudiant(id: number) {
  if (!id) throw new Error("ID manquant pour la suppression");

  await prisma.etudiant.delete({ where: { id } });

  revalidatePath("/etudiants");

  return { message: "Étudiant supprimé avec succès" };
}

// ===============================
// Récupérer tous les étudiants
// ===============================

export async function getEtudiants() {
  const etudiants = await prisma.etudiant.findMany({
    include: { classe: { include: { filiere: true } } },  // Inclure les classes et leurs filières
    orderBy: { id: "desc" },
  });
  return etudiants;
}

// ===============================
// Récupérer un étudiant par ID
// ===============================

export async function getEtudiantById(id: number) {
  if (!id) throw new Error("ID manquant");

  const etudiant = await prisma.etudiant.findUnique({
    where: { id },
    include: { classe: { include: { filiere: true } } },  // Inclure la classe avec sa filière
  });

  if (!etudiant) throw new Error("Étudiant non trouvé");

  return etudiant;
}
