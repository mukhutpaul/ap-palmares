"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";

type ReussiteBarChartProps = {
  reussite: number;
  echec: number;
};

export default function ReussiteBarChart({ reussite, echec }: ReussiteBarChartProps) {
  const data = [{ name: "Taux", Réussite: reussite, Échec: echec }];
  const COLORS = ["#10B981", "#EF4444"]; // Vert et Rouge

  return (
    <div className="w-full h-[300px] bg-white rounded-lg shadow-md p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#555", fontSize: 14, fontWeight: 600 }}
            axisLine={{ stroke: "#ccc" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#555", fontSize: 12 }}
            axisLine={{ stroke: "#ccc" }}
            tickLine={false}
            domain={[0, Math.max(reussite, echec) * 1.2]}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "#ddd", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
            cursor={{ fill: "rgba(0,0,0,0.05)" }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconSize={14}
            wrapperStyle={{ fontWeight: 600, fontSize: 14, color: "#333", paddingBottom: 8 }}
          />
          <Bar dataKey="Réussite" fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={70}>
            <LabelList dataKey="Réussite" position="top" style={{ fill: COLORS[0], fontWeight: "bold" }} />
          </Bar>
          <Bar dataKey="Échec" fill={COLORS[1]} radius={[4, 4, 0, 0]} maxBarSize={70}>
            <LabelList dataKey="Échec" position="top" style={{ fill: COLORS[1], fontWeight: "bold" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
