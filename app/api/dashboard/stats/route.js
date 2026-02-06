import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const anneeId = Number(searchParams.get("anneeId"));

  const totalEtudiants = await prisma.etudiant.count();

  const hommes = await prisma.etudiant.count({
    where: { sexe: "H" },
  });

  const femmes = await prisma.etudiant.count({
    where: { sexe: "F" },
  });

  const notes = await prisma.note.findMany({
    where: { anneeAcademiqueId: anneeId },
    select: { note: true },
  });

  const totalNotes = notes.length;
  const reussite = notes.filter(n => n.note >= 10).length;
  const echec = totalNotes - reussite;

  return Response.json({
    totalEtudiants,
    hommes,
    femmes,
    tauxReussite: totalNotes ? Math.round((reussite / totalNotes) * 100) : 0,
    tauxEchec: totalNotes ? Math.round((echec / totalNotes) * 100) : 0,
  });
}
