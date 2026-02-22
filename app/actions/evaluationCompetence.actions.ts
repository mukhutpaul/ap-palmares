"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";


/* =========================
   CREATE
========================= */
export async function createEvaluationCompetence(data: {
  evaluationId: number;
  competenceId: number;
  score: number;
}) {
  try {
    const evaluationCompetence =
      await prisma.evaluationCompetence.create({
        data,
      });

    revalidatePath("/evaluations");

    return { success: true, data: evaluationCompetence };
  } catch (error) {
    return { success: false, error: "Erreur création évaluation compétence" };
  }
}

/* =========================
   UPDATE SCORE
========================= */
export async function updateEvaluationCompetence(
  id: number,
  score: number
) {
  try {
    const updated = await prisma.evaluationCompetence.update({
      where: { id },
      data: { score },
    });

    revalidatePath("/evaluations");

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: "Erreur mise à jour score" };
  }
}

/* =========================
   DELETE
========================= */
export async function deleteEvaluationCompetence(id: number) {
  try {
    await prisma.evaluationCompetence.delete({
      where: { id },
    });

    revalidatePath("/evaluations");

    return { success: true };
  } catch (error) {
    return { success: false, error: "Erreur suppression" };
  }
}

/* =========================
   GET BY EVALUATION
========================= */
export async function getEvaluationCompetences(
  evaluationId: number
) {
  return prisma.evaluationCompetence.findMany({
    where: { evaluationId },
    include: {
      competence: true,
    },
  });
}

export async function createMultipleEvaluationCompetences(
  evaluationId: number,
  competences: { competenceId: number; score: number }[]
) {
  return prisma.$transaction(async (tx) => {
    for (const comp of competences) {
      await tx.evaluationCompetence.create({
        data: {
          evaluationId,
          competenceId: comp.competenceId,
          score: comp.score,
        },
      });
    }
  });
}