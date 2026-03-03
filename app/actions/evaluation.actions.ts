"use server";

import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ================================
// Validation Schema
// ================================

const scoreSchema = z.object({
  competenceId: z.number(),
  score: z.number().min(0),
});

const evaluationSchema = z.object({
  etudiantId: z.number(),
  filiereId: z.number(),
  moduleId: z.number(),
  scores: z.array(scoreSchema),
  userEmail: z.string(),
});

// ================================
// CREATE EVALUATION
// ================================

export async function createEvaluation(data: unknown) {
  const parsed = evaluationSchema.parse(data);
  const { etudiantId, filiereId, moduleId, scores, userEmail } = parsed;

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const etudiant = await tx.etudiant.findUnique({ where: { id: etudiantId } });
    if (!etudiant) throw new Error("Étudiant inexistant");

    const filiere = await tx.filiere.findUnique({ where: { id: filiereId } });
    if (!filiere) throw new Error("Filière inexistante");

    const module = await tx.moduleCotation.findUnique({ where: { id: moduleId } });
    if (!module) throw new Error("Module inexistant");

    const session = await tx.session.findFirst({ where: { isactive: true } });
    if (!session) throw new Error("Aucune session active trouvée");

    const annee = await tx.anneeAcademique.findFirst({ where: { active: true } });
    if (!annee) throw new Error("Aucune année académique active trouvée");

    const user = await tx.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new Error("Utilisateur inexistant");

    // Vérification si une évaluation pour ce module existe déjà
    const existing = await tx.evaluation.findUnique({
      where: {
        etudiantId_filiereId_sessionId_anneeAcademiqueId_moduleId: {
          etudiantId,
          filiereId,
          sessionId: session.id,
          anneeAcademiqueId: annee.id,
          moduleId,
        },
      },
    });
    if (existing) throw new Error("Cette évaluation pour ce module existe déjà");

    const competences = await tx.competence.findMany({
      where: { moduleCotationId: moduleId },
      orderBy: { nom: "asc" },
    });

    let total = 0;
    let totalCoef = 0;
    for (const item of scores) {
      const comp = competences.find((c) => c.id === item.competenceId);
      if (!comp) continue;
      total += item.score * comp.coefficient;
      totalCoef += comp.coefficient;
    }
    const moyenne = totalCoef > 0 ? total / totalCoef : 0;

    return await tx.evaluation.create({
      data: {
        etudiantId,
        filiereId,
        moduleId,
        sessionId: session.id,
        anneeAcademiqueId: annee.id,
        moyenne,
        createdById: user.id,
        competences: { create: scores.map((s) => ({ competenceId: s.competenceId, score: s.score })) },
      },
    });
  });
}

// ================================
// GET EVALUATIONS BY FILIERE
// ================================

export async function getEvaluationsByFiliere(filiereId: number) {
  const evaluations = await prisma.evaluation.findMany({
    where: { filiereId },
    include: {
      etudiant: true,
      filiere: true,
      competences: {
        include: {
          competence: {
            include: { moduleCotation: true },
          },
        },
      },
    },
  });

  return evaluations.map(e => {
    const modules = Array.from(
      new Set(
        e.competences
          .map(c => c.competence.moduleCotation)
          .filter(m => m !== null)
          .map(m => m!.id)
      )
    );

    const module = modules.length === 1
      ? e.competences.find(c => c.competence.moduleCotation)?.competence.moduleCotation
      : null;

    return {
      id: e.id,
      moyenne: e.moyenne,
      createdAt: e.createdAt,
      etudiant: e.etudiant,
      filiere: e.filiere,
      module: module ? { id: module.id, intitule: module.intitule } : null,
      competences: e.competences.map(c => ({
        competenceId: c.competenceId,
        competenceNom: c.competence.nom,
        maxScore: c.competence.maxScore,
        score: c.score,
      })),
    };
  });
}

// ================================
// GET ONE EVALUATION
// ================================

export async function getEvaluationById(id: number) {
  return prisma.evaluation.findUnique({
    where: { id },
    include: {
      etudiant: true,
      filiere: true,
      competences: { include: { competence: { include: { moduleCotation: true } } } },
    },
  });
}

// ================================
// UPDATE SCORES
// ================================

export async function updateEvaluation(
  evaluationId: number,
  scores: { competenceId: number; score: number }[]
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const s of scores) {
      // Vérifier si le score existe déjà pour cette compétence
      const existing = await tx.evaluationCompetence.findUnique({
        where: { evaluationId_competenceId: { evaluationId, competenceId: s.competenceId } },
      });

      if (existing) {
        // Mettre à jour
        await tx.evaluationCompetence.update({
          where: { evaluationId_competenceId: { evaluationId, competenceId: s.competenceId } },
          data: { score: s.score },
        });
      } else {
        // Créer si elle n'existe pas encore
        await tx.evaluationCompetence.create({
          data: { evaluationId, competenceId: s.competenceId, score: s.score },
        });
      }
    }

    // Recalcul de la moyenne pondérée
    const evaluation = await tx.evaluation.findUnique({
      where: { id: evaluationId },
      include: { competences: { include: { competence: true } } },
    });
    if (!evaluation) throw new Error("Évaluation introuvable");

    let total = 0;
    let totalCoef = 0;
    for (const c of evaluation.competences) {
      total += c.score * c.competence.coefficient;
      totalCoef += c.competence.coefficient;
    }

    return tx.evaluation.update({
      where: { id: evaluationId },
      data: { moyenne: totalCoef > 0 ? total / totalCoef : 0 },
    });
  });
}

// ================================
// DELETE EVALUATION
// ================================

export async function deleteEvaluation(id: number) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.evaluationCompetence.deleteMany({ where: { evaluationId: id } });
    return tx.evaluation.delete({ where: { id } });
  });
}

// ================================
// GET EVALUATIONS BY STUDENT
// ================================

export async function getEvaluationsByStudent(etudiantId: number) {
  return prisma.evaluation.findMany({
    where: { etudiantId },
    include: {
      etudiant: true,
      filiere: true,
      session: true,
      anneeAcademique: true,
      competences: { include: { competence: { include: { moduleCotation: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ================================
// MODULES & COMPETENCES
// ================================

export async function getModulesByFiliere(filiereId: number) {
  return prisma.moduleCotation.findMany({
    where: { filiereId },
    orderBy: { intitule: "asc" },
  });
}

export async function getCompetencesByModule(moduleId: number) {
  return prisma.competence.findMany({
    where: { moduleCotationId: moduleId },
    orderBy: { nom: "asc" },
  });
}