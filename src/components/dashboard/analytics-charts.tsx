"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRupiah } from "@/lib/formatters";

interface TrendData {
  date: string;
  dayLabel: string;
  services: number;
  retail: number;
  total: number;
}

export function RevenueTrendChart({ data }: { data: TrendData[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="servicesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1447E6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#1447E6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="retailGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dayLabel"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `Rp ${value / 1000}k`}
          />
          <Tooltip
            formatter={(value?: unknown, name?: unknown) => [
              formatRupiah(Number(value) || 0),
              name === "services" ? "Jasa Cuci" : "Barang Ritel",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              fontSize: "12px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(val) =>
              val === "services" ? "Jasa Cuci" : "Barang Ritel"
            }
          />
          <Area
            type="monotone"
            dataKey="services"
            stroke="#1447E6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#servicesGradient)"
          />
          <Area
            type="monotone"
            dataKey="retail"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#retailGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PeakHourData {
  hour: string;
  vehicles: number;
}

export function PeakHoursChart({ data }: { data: PeakHourData[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <XAxis
            dataKey="hour"
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value?: unknown) => [
              `${Number(value) || 0} Kendaraan`,
              "Frekuensi",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="vehicles" fill="#1447E6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CompositionData {
  name: string;
  value: number;
  color: string;
}

export function RevenueCompositionChart({ data }: { data: CompositionData[] }) {
  const COLORS = ["#1447E6", "#10b981", "#8b5cf6", "#f59e0b"];

  return (
    <div className="flex h-64 w-full items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value?: unknown) => [
              formatRupiah(Number(value) || 0),
              "Omset",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Legend verticalAlign="bottom" height={36} formatter={(val) => val} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CategoryData {
  name: string;
  count: number;
}

export function VehicleCategoryChart({ data }: { data: CategoryData[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 35, bottom: 0 }}
        >
          <XAxis
            type="number"
            stroke="#888888"
            fontSize={11}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(val?: unknown) => [
              `${Number(val) || 0} Kendaraan`,
              "Jumlah Cuci",
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
