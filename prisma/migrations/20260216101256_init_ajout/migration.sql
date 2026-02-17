/*
  Warnings:

  - You are about to drop the column `matiere` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `Note` table. All the data in the column will be lost.

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
    "anneeAcademiqueId" INTEGER,
    "filiereId" INTEGER,
    "sessionId" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Note_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Note_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Note" ("anneeAcademiqueId", "createdAt", "createdById", "etudiantId", "filiereId", "id", "sessionId", "updatedAt") SELECT "anneeAcademiqueId", "createdAt", "createdById", "etudiantId", "filiereId", "id", "sessionId", "updatedAt" FROM "Note";
DROP TABLE "Note";
ALTER TABLE "new_Note" RENAME TO "Note";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
