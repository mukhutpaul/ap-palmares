-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Competence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "maxScore" REAL NOT NULL,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "moduleCotationId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Competence_moduleCotationId_fkey" FOREIGN KEY ("moduleCotationId") REFERENCES "ModuleCotation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Competence" ("coefficient", "createdAt", "id", "maxScore", "moduleCotationId", "nom") SELECT "coefficient", "createdAt", "id", "maxScore", "moduleCotationId", "nom" FROM "Competence";
DROP TABLE "Competence";
ALTER TABLE "new_Competence" RENAME TO "Competence";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
