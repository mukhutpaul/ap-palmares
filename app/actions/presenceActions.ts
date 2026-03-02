"use server"

import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma"



export async function getActiveSession() {
    return await prisma.session.findFirst({
        where: { isactive: true }
    })
}

type GetStudentsResponse =
  | {
      success: true;
      students: {
        id: number;
        nom: string;
        postnom: string;
        prenom: string;
      }[];
      session: { id: number };
      annee: { id: number };
    }
  | {
      success: false;
      error: string;
    };


export async function getStudentsByFiliere(filiereId: number) : Promise<GetStudentsResponse> {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // 🔎 Session active
    const sessionActive = await prisma.session.findFirst({
      where: { isactive: true },
    });

    if (!sessionActive) {
      return { success: false, error: "Aucune session active" };
    }

    // 🔎 Année active
    const anneeActive = await prisma.anneeAcademique.findFirst({
      where: { active: true },
    });

    if (!anneeActive) {
      return { success: false, error: "Aucune année académique active" };
    }

    // 👨‍🎓 Tous les étudiants de la filière
    const students = await prisma.etudiant.findMany({
      where: {
        classes: {
          some: { filiereId }
        }
      },
      orderBy: { nom: "asc" }
    });

    // 📅 Présences déjà enregistrées aujourd'hui
    const presencesToday = await prisma.presence.findMany({
      where: {
        filiereId,
        sessionId: sessionActive.id,
        anneeAcademiqueId: anneeActive.id,
        date: today
      },
      select: {
        etudiantId: true
      }
    });

    const alreadyCalledIds = presencesToday.map(p => p.etudiantId);

    // 🚫 Filtrer les déjà appelés
    const remainingStudents = students.filter(
      student => !alreadyCalledIds.includes(student.id)
    );

    return {
      success: true,
      students: remainingStudents,
      session: sessionActive,
      annee: anneeActive
    };

  } catch (error) {
    console.error(error);
    return { success: false, error: "Erreur serveur" };
  }
}
export async function updatePresenceStatus(id: number, status: "PRESENT" | "ABSENT") {
  return await prisma.presence.update({
    where: { id },
    data: { status },
  });
}

export async function getPresences(filters: {
  search?: string;
  date?: string;
  userId?: string;
}) {
  const { search, date, userId } = filters;

  const where: any = {};

  if (date) {
    const selectedDate = new Date(date);
    selectedDate.setUTCHours(0, 0, 0, 0);
    where.date = selectedDate;
  }

  if (userId) {
    where.createdById = userId;
  }

  if (search) {
    where.etudiant = {
      OR: [
        { nom: { contains: search, mode: "insensitive" } },
        { postnom: { contains: search, mode: "insensitive" } },
        { prenom: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const presences = await prisma.presence.findMany({
    where,
    include: {
      etudiant: true,
      createdBy: true,
    },
    orderBy: { date: "desc" },
  });

  return presences;
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
}: {
  etudiantId: number;
  filiereId: number;
  sessionId: number;
  anneeAcademiqueId: number;
  status: "PRESENT" | "ABSENT";
}) {
  // 🔐 Récupérer l'utilisateur connecté côté serveur
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "Utilisateur non authentifié" };
  }

  const userId = session.user.id;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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
        createdById: userId, // 👈 automatiquement affecté
      },
      create: {
        etudiantId,
        filiereId,
        sessionId,
        anneeAcademiqueId,
        status,
        date: today,
        createdById: userId, // 👈 automatiquement affecté
      },
    });

    return { success: true, data: presence };
  } catch (error) {
    console.error("Erreur Prisma:", error);
    return { success: false, message: "Erreur lors de l’enregistrement" };
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