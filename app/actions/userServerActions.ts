// app/actions/userServerActions.ts
import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";

export type Role = "ADMIN" | "ENSEIGNANT" | "USER";

export type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string; // ← string pour compatibilité avec React
};

// ===============================
// Récupérer tous les utilisateurs
// ===============================
export async function getUsersServer(): Promise<UserItem[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Convertir createdAt en string pour éviter l'erreur TS
  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));
}

// ===============================
// Créer un utilisateur (avec hash du mot de passe)
// ===============================
export async function createUserServer(user: {
  name?: string;
  email: string;
  password: string;
  role?: Role;
}): Promise<UserItem> {
  const hashedPassword = await bcrypt.hash(user.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      password: hashedPassword,
      role: user.role ?? "USER",
    },
  });

  return {
    ...newUser,
    createdAt: newUser.createdAt.toISOString(),
  };
}

// ===============================
// Supprimer un utilisateur
// ===============================
export async function deleteUserServer(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

// ===============================
// Mettre à jour un utilisateur (hash si nouveau mot de passe)
// ===============================
export async function updateUserServer(
  userId: string,
  data: Partial<Omit<UserItem, "id" | "createdAt"> & { password?: string }>
): Promise<UserItem> {
  const updateData: any = { ...data };

  // Hash le mot de passe si fourni
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return {
    ...updated,
    createdAt: updated.createdAt.toISOString(),
  };
}
