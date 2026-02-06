import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ============================
  // Seed Années Académiques
  // ============================
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

  // ============================
  // Seed Super Admin
  // ============================
  const adminEmail = "admin@gmail.com";
  const adminPassword = "12345";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // ne modifie rien s'il existe déjà
    create: {
      name: "admin",
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("Super administrateur créé avec succès ✅");
}

main()
  .catch((e) => {
    console.error("Erreur seed ❌", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
