// app/actions/dashboardActions.ts
"use server"; // Next.js server action

import { getDashboardStatsServer, DashboardStats } from "./dashboardServerActions";

export async function getDashboardStats(anneeId: number): Promise<DashboardStats> {
  return getDashboardStatsServer(anneeId);
}
