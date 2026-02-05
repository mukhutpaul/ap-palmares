import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const startYear = 2018;
  const endYear = 2039;

  for (let year = startYear; year <= endYear; year++) {
    const anneeStr = `${year}-${year + 1}`;
    await prisma.anneeAcademique.upsert({
      where: { annee: anneeStr },
      update: {},
      create: {
        annee: anneeStr,
        active: year === new Date().getFullYear(), // active l'année en cours
      },
    });
  }

  console.log("Seed des années académiques 2018-2040 terminé ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
