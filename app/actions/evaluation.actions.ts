"use server";

import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ================================
// Validation Schema
// ================================

const scoreSchema = z.object({
  competenceId: z.number(),
  score: z.number().min(0)
})

const evaluationSchema = z.object({
  etudiantId: z.number(),
  filiereId: z.number(),
  sessionId: z.number(),
  anneeAcademiqueId: z.number(),
  scores: z.array(scoreSchema),
  userId: z.string()
})


// ================================
// 1️⃣ CREATE EVALUATION
// ================================

export async function createEvaluation(data: unknown) {
  const parsed = evaluationSchema.parse(data);
  const { etudiantId, filiereId, sessionId, anneeAcademiqueId, scores, userId } = parsed;

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const etudiant = await tx.etudiant.findUnique({ where: { id: etudiantId } });
    if (!etudiant) throw new Error("Étudiant inexistant");

    const filiere = await tx.filiere.findUnique({ where: { id: filiereId } });
    if (!filiere) throw new Error("Filière inexistante");

    const session = await tx.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Session inexistante");

    const annee = await tx.anneeAcademique.findUnique({ where: { id: anneeAcademiqueId } });
    if (!annee) throw new Error("Année académique inexistante");

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Utilisateur inexistant");

    const existing = await tx.evaluation.findUnique({
      where: { etudiantId_filiereId_sessionId_anneeAcademiqueId: { etudiantId, filiereId, sessionId, anneeAcademiqueId } }
    });
    if (existing) throw new Error("Cette évaluation existe déjà");

    const competences = await tx.competence.findMany({ where: { filiereId } });
    let total = 0;
    let totalCoef = 0;
    for (const item of scores) {
      const comp = competences.find(c => c.id === item.competenceId);
      if (!comp) continue;
      total += item.score * comp.coefficient;
      totalCoef += comp.coefficient;
    }
    const moyenne = totalCoef > 0 ? total / totalCoef : 0;

    return await tx.evaluation.create({
      data: {
        etudiantId,
        filiereId,
        sessionId,
        anneeAcademiqueId,
        moyenne,
        createdById: userId,
        competences: { create: scores.map(s => ({ competenceId: s.competenceId, score: s.score })) }
      }
    });
  });
}

// ================================
// 2️⃣ GET EVALUATIONS BY FILIERE
// ================================

export async function getEvaluationsByFiliere(filiereId: number) {
  return prisma.evaluation.findMany({
    where: { filiereId },
    include: {
      etudiant: true,
      filiere: true,      // ← ajouté
      session: true,
      anneeAcademique: true,
      competences: { include: { competence: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}

// ================================
// 3️⃣ GET ONE EVALUATION
// ================================

export async function getEvaluationById(id: number) {
  return prisma.evaluation.findUnique({
    where: { id },
    include: {
      etudiant: true,
      filiere: true,       // ← ajouté
      competences: { include: { competence: true } }
    }
  });
}

// ================================
// 4️⃣ UPDATE SCORES
// ================================

export async function updateEvaluation(
  evaluationId: number,
  scores: { competenceId: number; score: number }[]
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of scores) {
      await tx.evaluationCompetence.update({
        where: { evaluationId_competenceId: { evaluationId, competenceId: item.competenceId } },
        data: { score: item.score }
      });
    }

    const evaluation = await tx.evaluation.findUnique({
      where: { id: evaluationId },
      include: { competences: { include: { competence: true } } }
    });
    if (!evaluation) throw new Error("Evaluation introuvable");

    let total = 0;
    let totalCoef = 0;
    for (const item of evaluation.competences) {
      total += item.score * item.competence.coefficient;
      totalCoef += item.competence.coefficient;
    }

    return tx.evaluation.update({ where: { id: evaluationId }, data: { moyenne: totalCoef > 0 ? total / totalCoef : 0 } });
  });
}

// ================================
// 5️⃣ DELETE EVALUATION
// ================================

export async function deleteEvaluation(id: number) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.evaluationCompetence.deleteMany({ where: { evaluationId: id } });
    return tx.evaluation.delete({ where: { id } });
  });
}

// ================================
// 6️⃣ GET EVALUATIONS BY STUDENT
// ================================

export async function getEvaluationsByStudent(etudiantId: number) {
  return prisma.evaluation.findMany({
    where: { etudiantId },
    include: {
      etudiant: true,       // ← ajouté
      filiere: true,        // ← ajouté
      session: true,
      anneeAcademique: true,
      competences: { include: { competence: true } }
    },
    orderBy: { createdAt: "desc" }
  });
}