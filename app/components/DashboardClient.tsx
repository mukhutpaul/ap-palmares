// app/dashboard/DashboardClient.tsx
"use client";

import React, { useState, useEffect } from "react";

type AnneeAcademique = { id: number; annee: string; active: boolean };
type DashboardStats = {
  totalEtudiants: number;
  hommes: number;
  femmes: number;
  tauxReussite: number;
  tauxEchec: number;
};

type DashboardClientProps = {
  annees: AnneeAcademique[];
  initialAnneeId: number | null;
  initialStats: DashboardStats;
};

export default function DashboardClient({
  annees,
  initialAnneeId,
  initialStats,
}: DashboardClientProps) {
  const [selectedAnneeId, setSelectedAnneeId] = useState<number | null>(initialAnneeId);
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  // Ici tu peux ajouter useEffect pour recharger les stats si l'année change
  useEffect(() => {
    // Exemple : fetch les stats si selectedAnneeId change
    // fetchStats(selectedAnneeId).then(setStats);
  }, [selectedAnneeId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="mb-4">
        <label htmlFor="annee" className="mr-2 font-semibold">Année académique :</label>
        <select
          id="annee"
          value={selectedAnneeId ?? undefined}
          onChange={(e) => setSelectedAnneeId(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          {annees.map((annee) => (
            <option key={annee.id} value={annee.id}>
              {annee.annee}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>Total étudiants : {stats.totalEtudiants}</div>
        <div>Hommes : {stats.hommes}</div>
        <div>Femmes : {stats.femmes}</div>
        <div>Taux de réussite : {stats.tauxReussite}%</div>
        <div>Taux d’échec : {stats.tauxEchec}%</div>
      </div>
    </div>
  );
}
