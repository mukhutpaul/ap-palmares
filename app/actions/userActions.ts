"use server";
import { getUsersServer, createUserServer, deleteUserServer, updateUserServer, UserItem, Role } from "./userServerActions";

export async function getUsers(): Promise<UserItem[]> {
  return getUsersServer();
}

export async function createUser(user: { name?: string; email: string; password: string; role?: Role }): Promise<UserItem> {
  return createUserServer(user);
}

export async function deleteUser(userId: string) {
  return deleteUserServer(userId);
}

export async function updateUser(userId: string, data: Partial<Omit<UserItem, "id" | "createdAt">>) {
  return updateUserServer(userId, data);
}
