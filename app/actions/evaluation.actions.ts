"use server";

import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const scoreSchema = z.object({
  competenceId: z.number(),
  score: z.number().min(0),
});

const evaluationSchema = z.object({
  etudiantId: z.number(),
  moduleId: z.number(),
  scores: z.array(scoreSchema),
});

// ================================
// CREATE EVALUATION
// ================================

export async function createEvaluation(data: unknown) {
  const parsed = evaluationSchema.parse(data);

  const { etudiantId, moduleId, scores } = parsed;

  return prisma.$transaction(async (tx) => {
    const etudiant = await tx.etudiant.findUnique({
      where: {
        id: etudiantId,
      },
    });

    if (!etudiant) throw new Error("Étudiant inexistant");

    const moduleCotation = await tx.moduleCotation.findUnique({
      where: {
        id: moduleId,
      },
    });

    if (!moduleCotation) throw new Error("Module inexistant");

    const existing = await tx.evaluation.findUnique({
      where: {
        etudiantId_moduleId: {
          etudiantId,
          moduleId,
        },
      },
    });

    if (existing)
      throw new Error(
        "Cet étudiant possède déjà une évaluation pour ce module",
      );

    // utilisateur système
    const user = await tx.user.findFirst();

    if (!user)
      throw new Error("Aucun utilisateur disponible pour créer l'évaluation");

    const competences = await tx.competence.findMany({
      where: {
        moduleCotationId: moduleId,
      },
    });

    let total = 0;
    let totalCoef = 0;

    for (const item of scores) {
      const competence = competences.find((c) => c.id === item.competenceId);

      if (!competence) continue;

      total += item.score * competence.coefficient;

      totalCoef += competence.coefficient;
    }

    const moyenne = totalCoef > 0 ? total / totalCoef : 0;

    return tx.evaluation.create({
      data: {
        etudiantId,

        moduleId,

        moyenne,

        createdById: user.id,

        competences: {
          create: scores.map((score) => ({
            competenceId: score.competenceId,
            score: score.score,
          })),
        },
      },
    });
  });
}

// ================================
// GET EVALUATIONS BY FILIERE
// ================================
export async function getEvaluationsByFiliere(filiereId: number) {
  const filiere = await prisma.filiere.findUnique({
    where: {
      id: filiereId,
    },
  });

  if (!filiere) {
    return [];
  }

  const evaluations = await prisma.evaluation.findMany({
    where: {
      etudiant: {
        filiere: filiere.nom,
      },
    },

    include: {
      etudiant: true,
      module: true,
      competences: {
        include: {
          competence: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return evaluations.map((e) => ({
    id: e.id,

    moyenne: e.moyenne ?? 0,

    createdAt: e.createdAt,

    etudiant: {
      id: e.etudiant.id,
      matricule: e.etudiant.matricule,
      nom: e.etudiant.nom,
      postnom: e.etudiant.postnom,
      prenom: e.etudiant.prenom,
      filiere: e.etudiant.filiere,
      session: e.etudiant.session,
      vacation: e.etudiant.vacation,
    },

    filiere: {
      id: filiere.id,
      nom: e.etudiant.filiere,
    },

    module: e.module
      ? {
          id: e.module.id,
          intitule: e.module.intitule,
        }
      : null,

    competences: e.competences.map((c) => ({
      competenceId: c.competenceId,
      competenceNom: c.competence.nom,
      maxScore: c.competence.maxScore,
      score: c.score,
    })),
  }));
}
// ================================
// GET ONE
// ================================

export async function getModulesByFiliere(filiereId: number) {
  return prisma.moduleCotation.findMany({
    where: {
      filiereId,
    },

    orderBy: {
      intitule: "asc",
    },
  });
}

export async function getEvaluationById(id: number) {
  return prisma.evaluation.findUnique({
    where: {
      id,
    },

    include: {
      etudiant: true,

      module: true,

      competences: {
        include: {
          competence: true,
        },
      },
    },
  });
}

// ================================
// UPDATE
// ================================

export async function updateEvaluation(
  evaluationId: number,
  scores: {
    competenceId: number;
    score: number;
  }[],
) {
  return prisma.$transaction(async (tx) => {
    for (const s of scores) {
      const existing = await tx.evaluationCompetence.findUnique({
        where: {
          evaluationId_competenceId: {
            evaluationId,
            competenceId: s.competenceId,
          },
        },
      });

      if (existing) {
        await tx.evaluationCompetence.update({
          where: {
            evaluationId_competenceId: {
              evaluationId,
              competenceId: s.competenceId,
            },
          },

          data: {
            score: s.score,
          },
        });
      } else {
        await tx.evaluationCompetence.create({
          data: {
            evaluationId,
            competenceId: s.competenceId,
            score: s.score,
          },
        });
      }
    }

    const evaluation = await tx.evaluation.findUnique({
      where: {
        id: evaluationId,
      },

      include: {
        competences: {
          include: {
            competence: true,
          },
        },
      },
    });

    if (!evaluation) throw new Error("Evaluation introuvable");

    let total = 0;
    let coef = 0;

    evaluation.competences.forEach((c) => {
      total += c.score * c.competence.coefficient;

      coef += c.competence.coefficient;
    });

    return tx.evaluation.update({
      where: {
        id: evaluationId,
      },

      data: {
        moyenne: coef > 0 ? total / coef : 0,
      },
    });
  });
}

// ================================
// DELETE
// ================================

export async function deleteEvaluation(id: number) {
  return prisma.$transaction(async (tx) => {
    await tx.evaluationCompetence.deleteMany({
      where: {
        evaluationId: id,
      },
    });

    return tx.evaluation.delete({
      where: {
        id,
      },
    });
  });
}

// ================================
// MODULES
// ================================

// ================================
// COMPETENCES
// ================================

export async function getCompetencesByModule(moduleId: number) {
  return prisma.competence.findMany({
    where: {
      moduleCotationId: moduleId,
    },

    orderBy: {
      nom: "asc",
    },
  });
}
