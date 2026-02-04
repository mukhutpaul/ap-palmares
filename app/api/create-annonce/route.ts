import { createAnnonce } from "@/app/actions"
import { pusherServer } from "@/app/server/pusher"
import { NextRequest, NextResponse } from "next/server"


export async function POST(req: NextRequest) {
  try {
    const { title, content, userId } = await req.json()
    // Crée l'annonce dans la base de données
    await createAnnonce(title, content, userId)

    // Notifie tous les clients via Pusher
    await pusherServer.trigger("annonces", "new-annonce", { title, content, userId })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
