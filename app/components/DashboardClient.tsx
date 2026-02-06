// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";
import { getAnneesAcademiques } from "@/app/actions/notesActions";
import { getDashboardStats } from "@/app/actions/dashboardActions";

type AnneeAcademique = { id: number; annee: string; active: boolean };
type DashboardStats = {
  totalEtudiants: number;
  hommes: number;
  femmes: number;
  tauxReussite: number;
  tauxEchec: number;
};

export default async function DashboardPage() {
  // Tout côté serveur
  const annees: AnneeAcademique[] = await getAnneesAcademiques();
  const activeAnnee = annees.find((a) => a.active) ?? annees[0];

  const stats: DashboardStats = activeAnnee
    ? await getDashboardStats(activeAnnee.id)
    : { totalEtudiants: 0, hommes: 0, femmes: 0, tauxReussite: 0, tauxEchec: 0 };

  // Passe les données au composant client
  return (
    <DashboardClient
      annees={annees}
      initialAnneeId={activeAnnee?.id ?? null}
      initialStats={stats}
    />
  );
}
