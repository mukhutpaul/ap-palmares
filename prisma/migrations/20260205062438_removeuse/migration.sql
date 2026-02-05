/*
  Warnings:

  - You are about to drop the column `createdById` on the `AnneeAcademique` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AnneeAcademique" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "annee" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AnneeAcademique" ("active", "annee", "createdAt", "id") SELECT "active", "annee", "createdAt", "id" FROM "AnneeAcademique";
DROP TABLE "AnneeAcademique";
ALTER TABLE "new_AnneeAcademique" RENAME TO "AnneeAcademique";
CREATE UNIQUE INDEX "AnneeAcademique_annee_key" ON "AnneeAcademique"("annee");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
