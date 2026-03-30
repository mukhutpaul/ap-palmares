-- CreateTable
CREATE TABLE "EvaluationTheorie" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "etudiantId" INTEGER NOT NULL,
    "filiereId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "anneeAcademiqueId" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationTheorie_etudiantId_fkey" FOREIGN KEY ("etudiantId") REFERENCES "Etudiant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationTheorie_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationTheorie_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationTheorie_anneeAcademiqueId_fkey" FOREIGN KEY ("anneeAcademiqueId") REFERENCES "AnneeAcademique" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvaluationTheorie_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTheorie_etudiantId_filiereId_sessionId_anneeAcademiqueId_date_key" ON "EvaluationTheorie"("etudiantId", "filiereId", "sessionId", "anneeAcademiqueId", "date");
