import { NextRequest, NextResponse } from "next/server";
import { getNotes } from "@/app/actions/notesActions";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const etudiantId = url.searchParams.get("etudiantId");
    const anneeId = url.searchParams.get("anneeId");

    if (!etudiantId || !anneeId) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const notes = await getNotes(); // retourne toutes les notes
    if (!Array.isArray(notes)) {
      return NextResponse.json({ error: "Notes invalides" }, { status: 500 });
    }

    const releve = notes.filter(
      (n) => n.etudiant?.id === Number(etudiantId) && n.anneeAcademique?.id === Number(anneeId)
    );

    return NextResponse.json(releve || []);
  } catch (err) {
    console.error("Erreur API /releve:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
