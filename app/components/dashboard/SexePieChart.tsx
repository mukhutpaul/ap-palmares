"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, PieLabelRenderProps } from "recharts";

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

  const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, index = 0 } = props;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#222"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontWeight: 600, fontSize: 14 }}
      >
        {`${data[index].name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-2xl shadow-xl p-6 flex flex-col items-center justify-between">
      {/* Camembert centré */}
      <div className="w-full flex-1 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={80}
              outerRadius={130}
              paddingAngle={6}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={false}
              cornerRadius={12}
              isAnimationActive={true}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                padding: "8px 12px",
              }}
              formatter={(value?: number) => [`${value ?? 0}`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Légende séparée en dehors du graphique */}
      <div className="w-full flex justify-center mt-4 gap-6">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS[index] }}
            ></span>
            <span className="font-semibold text-gray-700">{item.name}</span>
          </div>
        ))}
      </div>

      {/* Total en bas */}
      <div className="mt-4 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full font-semibold text-lg shadow-sm select-none">
        Total : {total}
      </div>
    </div>
  );
}
