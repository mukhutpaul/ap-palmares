"use server";

import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

// ---------------- ADD ----------------
export async function addEvaluationTheorie(formData: FormData) {
  const userId = formData.get("userId")?.toString();

  const etudiantId = Number(formData.get("etudiantId"));
  const filiereId = Number(formData.get("filiereId"));
  const score = Number(formData.get("score"));

  if (!userId || !etudiantId || !filiereId || isNaN(score)) {
    throw new Error("Données invalides");
  }

  const annee = await prisma.anneeAcademique.findFirst({
    where: { active: true },
  });

  const session = await prisma.session.findFirst({
    where: { isactive: true },
  });

  if (!annee || !session) {
    throw new Error("Année ou session active manquante");
  }

  const data = await prisma.evaluationTheorie.create({
    data: {
      etudiantId,
      filiereId,
      score,
      createdById: userId,
      anneeAcademiqueId: annee.id,
      sessionId: session.id,
    },
    include: {
      etudiant: true,
      filiere: true,
      session: true,
    },
  });

  revalidatePath("/evaluation-theorie");
  return data;
}

// ---------------- UPDATE ----------------
export async function updateEvaluationTheorie(formData: FormData) {
  const id = Number(formData.get("id"));
  const score = Number(formData.get("score"));

  if (!id || isNaN(score)) throw new Error("Erreur");

  const data = await prisma.evaluationTheorie.update({
    where: { id },
    data: { score },
    include: {
      etudiant: true,
      filiere: true,
      session: true,
    },
  });

  revalidatePath("/evaluation-theorie");
  return data;
}

// ---------------- DELETE ----------------
export async function deleteEvaluationTheorie(id: number) {
  await prisma.evaluationTheorie.delete({
    where: { id },
  });

  revalidatePath("/evaluation-theorie");
}

// ---------------- GET ----------------
export async function getEvaluationTheories() {
  return prisma.evaluationTheorie.findMany({
    include: {
      etudiant: true,
      filiere: true,
      session: true,
    },
    orderBy: { id: "desc" },
  });
}