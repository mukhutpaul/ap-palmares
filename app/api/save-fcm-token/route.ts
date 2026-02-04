import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { token } = await req.json()

  // 👉 stocke le token en DB (lié à l’utilisateur)
  console.log("FCM Token:", token)

  return NextResponse.json({ success: true })
}
