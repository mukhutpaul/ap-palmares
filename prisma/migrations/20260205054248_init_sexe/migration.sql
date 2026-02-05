/*
  Warnings:

  - Added the required column `sexe` to the `Etudiant` table without a default value. This is not possible if the table is not empty.

*/
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
    "classeId" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Etudiant_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Etudiant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Etudiant" ("classeId", "createdAt", "createdById", "email", "id", "nom", "postnom", "prenom") SELECT "classeId", "createdAt", "createdById", "email", "id", "nom", "postnom", "prenom" FROM "Etudiant";
DROP TABLE "Etudiant";
ALTER TABLE "new_Etudiant" RENAME TO "Etudiant";
CREATE UNIQUE INDEX "Etudiant_email_key" ON "Etudiant"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
