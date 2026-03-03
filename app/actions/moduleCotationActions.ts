"use server";

import { prisma } from "../lib/prisma";

/* =========================
   GET ALL MODULES
========================= */
export async function getModules() {
  try {
    return await prisma.moduleCotation.findMany({
      include: {
        filiere: true,
        competences: true, // pour avoir la relation avec les compétences
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

/* =========================
   ADD MODULE
========================= */
export async function addModule(formData: FormData) {
  const intitule = formData.get("intitule") as string;
  const max = parseFloat(formData.get("max") as string);
  const filiereId = parseInt(formData.get("filiereId") as string);

  try {
    const module = await prisma.moduleCotation.create({
      data: {
        intitule,
        max,
        filiereId,
      },
      include: {
        filiere: true,
      },
    });
    return { success: true, data: module };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Erreur création module" };
  }
}

/* =========================
   UPDATE MODULE
========================= */
export async function updateModule(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const intitule = formData.get("intitule") as string;
  const max = parseFloat(formData.get("max") as string);
  const filiereId = parseInt(formData.get("filiereId") as string);

  try {
    const module = await prisma.moduleCotation.update({
      where: { id },
      data: {
        intitule,
        max,
        filiereId,
      },
      include: {
        filiere: true,
      },
    });
    return { success: true, data: module };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Erreur modification module" };
  }
}

/* =========================
   DELETE MODULE
========================= */
export async function deleteModule(id: number) {
  try {
    await prisma.moduleCotation.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Erreur suppression module" };
  }
}