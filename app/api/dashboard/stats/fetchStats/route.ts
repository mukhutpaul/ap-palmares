import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/app/actions/dashboardActions";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const anneeId = Number(searchParams.get("anneeId"));

  if (!anneeId) return NextResponse.json({ error: "anneeId manquant" }, { status: 400 });

  const stats = await getDashboardStats(anneeId);
  return NextResponse.json(stats);
}
