import { Bike, Car, Truck } from "lucide-react";

import { VehicleCategory } from "@/generated/prisma/enums";

export const CATEGORY_INFO: Record<
  VehicleCategory,
  { label: string; sub: string; icon: typeof Car; color: string }
> = {
  MOTOR_KECIL: {
    label: "Motor Kecil",
    sub: "Beat, Mio, Vario 125",
    icon: Bike,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  MOTOR_BESAR: {
    label: "Motor Besar",
    sub: "NMax, PCX, Vespa, 150-250cc",
    icon: Bike,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  MOTOR_MOGE: {
    label: "Motor Moge",
    sub: "250cc+, Harley, Trail",
    icon: Bike,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  MOBIL_KECIL: {
    label: "Mobil Kecil",
    sub: "Brio, Agya, Yaris, Hatchback",
    icon: Car,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  MOBIL_SEDANG: {
    label: "Mobil Sedang",
    sub: "Avanza, Xpander, HR-V, Sedan",
    icon: Car,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  MOBIL_BESAR: {
    label: "Mobil Besar",
    sub: "Pajero, Fortuner, Alphard",
    icon: Car,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  KENDARAAN_LAIN: {
    label: "Kendaraan Lain",
    sub: "Pick-up, Truk Engkel, Box",
    icon: Truck,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  },
};
