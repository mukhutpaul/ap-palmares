/*
  Warnings:

  - You are about to drop the column `filiereId` on the `Competence` table. All the data in the column will be lost.
  - Added the required column `moduleCotationId` to the `Competence` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ModuleCotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intitule" TEXT NOT NULL,
    "max" REAL NOT NULL,
    "filiereId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleCotation_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Competence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "maxScore" REAL NOT NULL,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "moduleCotationId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competence_moduleCotationId_fkey" FOREIGN KEY ("moduleCotationId") REFERENCES "ModuleCotation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Competence" ("coefficient", "createdAt", "id", "maxScore", "nom") SELECT "coefficient", "createdAt", "id", "maxScore", "nom" FROM "Competence";
DROP TABLE "Competence";
ALTER TABLE "new_Competence" RENAME TO "Competence";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
