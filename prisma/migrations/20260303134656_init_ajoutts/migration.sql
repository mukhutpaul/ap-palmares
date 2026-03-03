-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Evaluation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "etudiantId" INTEGER NOT NULL,
    "filiereId" INTEGER NOT NULL,
    "moduleId" INTEGER,
    "sessionId" INTEGER NOT NULL,
    "anneeAcademiqueId" INTEGER NOT NULL,
    "moyenne" REAL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evaluation_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ModuleCotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Evaluation" ("anneeAcademiqueId", "createdAt", "createdById", "etudiantId", "filiereId", "id", "moyenne", "sessionId", "updatedAt") SELECT "anneeAcademiqueId", "createdAt", "createdById", "etudiantId", "filiereId", "id", "moyenne", "sessionId", "updatedAt" FROM "Evaluation";
DROP TABLE "Evaluation";
ALTER TABLE "new_Evaluation" RENAME TO "Evaluation";
CREATE UNIQUE INDEX "Evaluation_etudiantId_filiereId_sessionId_anneeAcademiqueId_moduleId_key" ON "Evaluation"("etudiantId", "filiereId", "sessionId", "anneeAcademiqueId", "moduleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
