"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

/* =========================
   CREATE
========================= */
export async function createCompetence(data: {
  nom: string;
  maxScore: number;
  coefficient?: number;
  filiereId: number;
}) {
  try {
    const competence = await prisma.competence.create({
      data: {
        nom: data.nom,
        maxScore: data.maxScore,
        coefficient: data.coefficient ?? 1,
        filiereId: data.filiereId,
      },
    });

    revalidatePath("/competences");

    return { success: true, data: competence };
  } catch (error) {
    return { success: false, error: "Erreur création compétence" };
  }
}

/* =========================
   UPDATE
========================= */
export async function updateCompetence(
  id: number,
  data: {
    nom?: string;
    maxScore?: number;
    coefficient?: number;
  }
) {
  try {
    const competence = await prisma.competence.update({
      where: { id },
      data,
    });

    revalidatePath("/competences");

    return { success: true, data: competence };
  } catch (error) {
    return { success: false, error: "Erreur modification compétence" };
  }
}

/* =========================
   DELETE
========================= */
export async function deleteCompetence(id: number) {
  try {
    await prisma.competence.delete({
      where: { id },
    });

    revalidatePath("/competences");

    return { success: true };
  } catch (error) {
    return { success: false, error: "Erreur suppression compétence" };
  }
}

/* =========================
   GET ALL
========================= */
export async function getCompetences() {
  return prisma.competence.findMany({
    include: {
      filiere: true,
      evaluations: true,
    },
    orderBy: { createdAt: "desc" },
  });
}