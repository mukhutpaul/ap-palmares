"use server"

import { prisma } from "../lib/prisma"



export async function getActiveSession() {
    return await prisma.session.findFirst({
        where: { isactive: true }
    })
}

export async function getStudentsByFiliere(
  filiereId: number
): Promise<PresenceCallResponse> {

  const sessionActive = await prisma.session.findFirst({
    where: { isactive: true }
  });

  if (!sessionActive) {
    return { success: false, error: "Aucune session active." };
  }

  const anneeActive = await prisma.anneeAcademique.findFirst({
    where: { active: true }
  });

  if (!anneeActive) {
    return { success: false, error: "Aucune année active." };
  }

  const students = await prisma.etudiant.findMany({
    where: {
      classes: {
        some: {
          filiereId,
          sessionId: sessionActive.id
        }
      }
    }
  });

  return {
    success: true,
    students,
    session: { id: sessionActive.id },
    annee: { id: anneeActive.id }
  };
}



export async function markPresence({
    etudiantId,
    filiereId,
    sessionId,
    anneeAcademiqueId,
    status,
    userId
}: {
    etudiantId: number
    filiereId: number
    sessionId: number
    anneeAcademiqueId: number
    status: "PRESENT" | "ABSENT"
    userId: string
}) {

    // 🔹 Normaliser la date (très important)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
        const presence = await prisma.presence.create({
            data: {
                etudiantId,
                filiereId,
                sessionId,
                anneeAcademiqueId,
                status,
                date: today,
                createdById: userId
            }
        })

        return { success: true, data: presence }

    } catch (error: any) {

        // 🔥 Gestion du doublon (contrainte unique)
        if (error.code === "P2002") {
            return { success: false, message: "Présence déjà enregistrée aujourd’hui." }
        }

        return { success: false, message: "Erreur serveur." }
    }
}

export async function checkIfCallAlreadyDone(
    filiereId: number,
    sessionId: number,
    anneeAcademiqueId: number
) {

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const count = await prisma.presence.count({
        where: {
            filiereId,
            sessionId,
            anneeAcademiqueId,
            date: today
        }
    })

    return count > 0
}


export async function markOrUpdatePresence({
    etudiantId,
    filiereId,
    sessionId,
    anneeAcademiqueId,
    status,
    userId
}: {
    etudiantId: number;
    filiereId: number;
    sessionId: number;
    anneeAcademiqueId: number;
    status: "PRESENT" | "ABSENT";
    userId: string;
}) {
    // Normaliser la date à 00:00:00 pour ne garder que la date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const presence = await prisma.presence.upsert({
            where: {
                etudiantId_filiereId_sessionId_anneeAcademiqueId_date: {
                    etudiantId,
                    filiereId,
                    sessionId,
                    anneeAcademiqueId,
                    date: today,
                },
            },
            update: {
                status,
                createdById: userId, // pour suivre qui a modifié
            },
            create: {
                etudiantId,
                filiereId,
                sessionId,
                anneeAcademiqueId,
                status,
                date: today,
                createdById: userId,
            },
        });

        return { success: true, data: presence };
    } catch (error) {
        console.error("Erreur Prisma upsert presence:", error);
        return { success: false, message: "Erreur lors de l’enregistrement de la présence." };
    }
}

export type PresenceCallResponse =
    | {
        success: true;
        students: any[];
        session: { id: number };
        annee: { id: number };
    }
    | {
        success: false;
        error: string;
    };