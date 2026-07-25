/*
  Warnings:

  - You are about to drop the column `filiere` on the `ModuleCotation` table. All the data in the column will be lost.
  - Added the required column `filiereId` to the `ModuleCotation` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ModuleCotation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "intitule" TEXT NOT NULL,
    "max" REAL NOT NULL,
    "filiereId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleCotation_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ModuleCotation" ("createdAt", "id", "intitule", "max") SELECT "createdAt", "id", "intitule", "max" FROM "ModuleCotation";
DROP TABLE "ModuleCotation";
ALTER TABLE "new_ModuleCotation" RENAME TO "ModuleCotation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
