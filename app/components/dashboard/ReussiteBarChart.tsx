"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type ReussiteBarChartProps = {
  reussite: number;
  echec: number;
};

export default function ReussiteBarChart({ reussite, echec }: ReussiteBarChartProps) {
  const data = [{ name: "Taux", Réussite: reussite, Échec: echec }];
  const COLORS = ["#10B981", "#EF4444"];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Réussite" fill={COLORS[0]} />
          <Bar dataKey="Échec" fill={COLORS[1]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
