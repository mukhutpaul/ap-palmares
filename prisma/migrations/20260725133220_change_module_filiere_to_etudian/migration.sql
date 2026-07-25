/*
  Warnings:

  - You are about to drop the column `anneeAcademiqueId` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `filiereId` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Evaluation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evaluation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "etudiantId" INTEGER NOT NULL,
    "moduleId" INTEGER,
    "moyenne" REAL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evaluation_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleCotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Evaluation" ("createdAt", "createdById", "etudiantId", "id", "moduleId", "moyenne", "updatedAt") SELECT "createdAt", "createdById", "etudiantId", "id", "moduleId", "moyenne", "updatedAt" FROM "Evaluation";
DROP TABLE "Evaluation";
ALTER TABLE "new_Evaluation" RENAME TO "Evaluation";
CREATE UNIQUE INDEX "Evaluation_etudiantId_moduleId_key" ON "Evaluation"("etudiantId", "moduleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
