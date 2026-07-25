/*
  Warnings:

  - You are about to drop the column `createdById` on the `Etudiant` table. All the data in the column will be lost.
  - Added the required column `filiere` to the `Etudiant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matricule` to the `Etudiant` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Etudiant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "postnom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "telephone" TEXT,
    "adresse" TEXT,
    "nationalite" TEXT,
    "avatar" TEXT,
    "filiere" TEXT NOT NULL,
    "session" TEXT,
    "vacation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Etudiant" ("createdAt", "email", "id", "nom", "postnom", "prenom", "sexe") SELECT "createdAt", "email", "id", "nom", "postnom", "prenom", "sexe" FROM "Etudiant";
DROP TABLE "Etudiant";
ALTER TABLE "new_Etudiant" RENAME TO "Etudiant";
CREATE UNIQUE INDEX "Etudiant_matricule_nom_postnom_prenom_email_filiere_key" ON "Etudiant"("matricule", "nom", "postnom", "prenom", "email", "filiere");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
