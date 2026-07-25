/*
  Warnings:

  - You are about to drop the column `anneeAcademiqueId` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `filiereId` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Note` table. All the data in the column will be lost.
  - Added the required column `filiere` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `session` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "noteTheorique" REAL DEFAULT 0,
    "notePratique" REAL DEFAULT 0,
    "noteJyry" REAL DEFAULT 0,
    "etudiantId" INTEGER,
    "filiere" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("createdAt", "createdById", "etudiantId", "id", "noteJyry", "notePratique", "noteTheorique", "updatedAt") SELECT "createdAt", "createdById", "etudiantId", "id", "noteJyry", "notePratique", "noteTheorique", "updatedAt" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
