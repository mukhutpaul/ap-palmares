// app/actions/dashboardServerActions.ts
import { prisma } from "@/app/lib/prisma";

export type DashboardStats = {
  totalEtudiants: number;
  hommes: number;
  femmes: number;
  tauxReussite: number;
  tauxEchec: number;
};

export async function getDashboardStatsServer(anneeId: number): Promise<DashboardStats> {
  const etudiants = await prisma.etudiant.findMany({
    where: { notes: { some: { anneeAcademiqueId: anneeId } } },
  });

  const totalEtudiants = etudiants.length;
  const hommes = etudiants.filter((e) => e.sexe === "M").length;
  const femmes = totalEtudiants - hommes;

  const notes = await prisma.note.findMany({
    where: { anneeAcademiqueId: anneeId },
  });

  const tauxReussite =
    notes.length > 0
      ? (notes.filter((n) => n.note >= 50).length / notes.length) * 100
      : 0;

  const tauxEchec = 100 - tauxReussite;

  return { totalEtudiants, hommes, femmes, tauxReussite, tauxEchec };
}
