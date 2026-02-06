"use client";

import { useState, useEffect } from "react";
import ReussiteBarChart from "@/app/components/dashboard/ReussiteBarChart";
import SexePieChart from "@/app/components/dashboard/SexePieChart";
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

export default function DashboardPage() {
  const [annees, setAnnees] = useState<AnneeAcademique[]>([]);
  const [anneeId, setAnneeId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load annees and initial stats
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const anneesData = await getAnneesAcademiques();
        setAnnees(anneesData);

        const active = anneesData.find((a) => a.active) ?? anneesData[0];
        if (!active) return;

        setAnneeId(active.id);
        const statsData = await getDashboardStats(active.id); // server action
        setStats(statsData);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Handle year change
  const handleChangeAnnee = async (id: number) => {
    setLoading(true);
    setAnneeId(id);
    try {
      const statsData = await getDashboardStats(id); // server action
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-[5%] py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <select
          className="select select-bordered w-full md:w-64"
          value={anneeId ?? undefined}
          onChange={(e) => handleChangeAnnee(Number(e.target.value))}
        >
          {annees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.annee}
            </option>
          ))}
        </select>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card bg-base-100 shadow-xl min-h-[350px]">
          <div className="card-body">
            <h2 className="card-title">Répartition des apprenants</h2>
            {loading || !stats ? (
              <div className="h-[300px] flex justify-center items-center">
                Chargement...
              </div>
            ) : (
              <SexePieChart
                hommes={stats.hommes}
                femmes={stats.femmes}
                total={stats.totalEtudiants}
              />
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl min-h-[350px]">
          <div className="card-body">
            <h2 className="card-title">Taux de réussite / échec</h2>
            {loading || !stats ? (
              <div className="h-[300px] flex justify-center items-center">
                Chargement...
              </div>
            ) : (
              <ReussiteBarChart
                reussite={stats.tauxReussite}
                echec={stats.tauxEchec}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
