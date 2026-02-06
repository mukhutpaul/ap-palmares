// app/actions/userServerActions.ts
import { prisma } from "@/app/lib/prisma";

export type Role = "ADMIN" | "ENSEIGNANT" | "USER";

export type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: Date;
};

// Récupérer tous les utilisateurs
export async function getUsersServer(): Promise<UserItem[]> {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Créer un utilisateur
export async function createUserServer(user: {
  name?: string;
  email: string;
  password: string;
  role?: Role;
}): Promise<UserItem> {
  const newUser = await prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      password: user.password, // tu peux ajouter hash si tu veux
      role: user.role ?? "USER",
    },
  });

  return newUser;
}

// Supprimer un utilisateur
export async function deleteUserServer(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

// Mettre à jour un utilisateur
export async function updateUserServer(userId: string, data: Partial<Omit<UserItem, "id" | "createdAt">>) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return updated;
}
