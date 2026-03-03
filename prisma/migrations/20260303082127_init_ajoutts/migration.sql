-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Etudiant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "postnom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Etudiant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Etudiant" ("createdAt", "createdById", "email", "id", "nom", "postnom", "prenom", "sexe") SELECT "createdAt", "createdById", "email", "id", "nom", "postnom", "prenom", "sexe" FROM "Etudiant";
DROP TABLE "Etudiant";
ALTER TABLE "new_Etudiant" RENAME TO "Etudiant";
CREATE UNIQUE INDEX "Etudiant_email_key" ON "Etudiant"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
