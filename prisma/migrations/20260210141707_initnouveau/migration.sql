-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Filiere" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "nombreHp" INTEGER NOT NULL DEFAULT 0,
    "nombreHt" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Filiere_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Filiere" ("createdAt", "createdById", "description", "id", "nom") SELECT "createdAt", "createdById", "description", "id", "nom" FROM "Filiere";
DROP TABLE "Filiere";
ALTER TABLE "new_Filiere" RENAME TO "Filiere";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
