"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";
import { Session } from "@prisma/client";

/**
 * Ajouter une session
 */
export async function addSession(formData: FormData) {
  const designation = formData.get("designation")?.toString();
  const dateDebutStr = formData.get("dateDebut")?.toString();
  const dateFinStr = formData.get("dateFin")?.toString();

  if (!designation || !dateDebutStr || !dateFinStr) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const dateDebut = new Date(dateDebutStr);
  const dateFin = new Date(dateFinStr);

  const session = await prisma.session.create({
    data: {
      designation,
      dateDebut,
      dateFin,
    },
  });

  revalidatePath("/sessions");
  return session;
}

/**
 * Mettre à jour une session
 */
export async function updateSession(formData: FormData) {
  const id = Number(formData.get("id"));
  const designation = formData.get("designation")?.toString();
  const dateDebutStr = formData.get("dateDebut")?.toString();
  const dateFinStr = formData.get("dateFin")?.toString();

  if (!id || !designation || !dateDebutStr || !dateFinStr) {
    throw new Error("Tous les champs sont obligatoires");
  }

  const dateDebut = new Date(dateDebutStr);
  const dateFin = new Date(dateFinStr);

  const updatedSession = await prisma.session.update({
    where: { id },
    data: { designation, dateDebut, dateFin },
  });

  revalidatePath("/sessions");
  return updatedSession;
}

/**
 * Supprimer une session
 */
export async function deleteSession(id: number) {
  if (!id) throw new Error("ID manquant pour la suppression");

  await prisma.session.delete({ where: { id } });
  revalidatePath("/sessions");
}

/**
 * Récupérer toutes les sessions
 */
export async function getSessions(): Promise<Session[]> {
  return await prisma.session.findMany({
    orderBy: { id: "desc" },
  });
}

/**
 * Récupérer une session par ID
 */
export async function getSessionById(id: number): Promise<Session | null> {
  return await prisma.session.findUnique({ where: { id } });
}
