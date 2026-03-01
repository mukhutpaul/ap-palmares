-- CreateTable
CREATE TABLE "Presence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "etudiantId" INTEGER NOT NULL,
    "filiereId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "anneeAcademiqueId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Presence_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Presence_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Presence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Presence_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Presence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "designation" TEXT NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Session" ("createdAt", "dateDebut", "dateFin", "designation", "id") SELECT "createdAt", "dateDebut", "dateFin", "designation", "id" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Presence_etudiantId_filiereId_sessionId_anneeAcademiqueId_date_key" ON "Presence"("etudiantId", "filiereId", "sessionId", "anneeAcademiqueId", "date");
