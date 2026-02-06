"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type SexePieChartProps = {
  hommes: number;
  femmes: number;
  total: number;
};

export default function SexePieChart({ hommes, femmes, total }: SexePieChartProps) {
  const data = total > 0
    ? [
        { name: "Hommes", value: hommes },
        { name: "Femmes", value: femmes },
      ]
    : [
        { name: "Hommes", value: 1 },
        { name: "Femmes", value: 1 },
      ];

  const COLORS = ["#6366F1", "#EC4899"];

  return (
    <div className="w-full h-[300px] flex flex-col items-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 badge badge-primary badge-lg">
        Total : {total}
      </div>
    </div>
  );
}
