/*
  Warnings:

  - You are about to drop the column `anneeAcademiqueId` on the `EvaluationTheorie` table. All the data in the column will be lost.
  - You are about to drop the column `filiereId` on the `EvaluationTheorie` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `EvaluationTheorie` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EvaluationTheorie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "etudiantId" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationTheorie_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationTheorie_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_EvaluationTheorie" ("createdAt", "createdById", "date", "etudiantId", "id", "score") SELECT "createdAt", "createdById", "date", "etudiantId", "id", "score" FROM "EvaluationTheorie";
DROP TABLE "EvaluationTheorie";
ALTER TABLE "new_EvaluationTheorie" RENAME TO "EvaluationTheorie";
CREATE UNIQUE INDEX "EvaluationTheorie_etudiantId_date_key" ON "EvaluationTheorie"("etudiantId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
