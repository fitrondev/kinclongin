import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PermissionIcon } from "./users-constants";

const MATRIX_DATA = [
  {
    feature: "Ringkasan Finansial & Omzet Cabang",
    desc: "Grafik pendapatan harian, laba rugi, dan tren omzet",
    owner: true,
    manager: true,
    cashier: false,
    washer: false,
  },
  {
    feature: "Buka Multi-Cabang (Outlet Switcher)",
    desc: "Beralih antar cabang outlet secara instan",
    owner: true,
    manager: false,
    cashier: false,
    washer: false,
  },
  {
    feature: "Manajemen Akun & Role Pengguna",
    desc: "Buat akun staf, ganti password, atur hak akses",
    owner: true,
    manager: true,
    cashier: false,
    washer: false,
  },
  {
    feature: "Gaji & Rekap Komisi Pekerja Cuci",
    desc: "Hitung komisi per cuci, rincian bagi hasil & pelunasan",
    owner: true,
    manager: true,
    cashier: false,
    washer: false,
  },
  {
    feature: "Manajemen Stok & Restok Bahan",
    desc: "Inventori sampo, semir ban, ritel, & opname fisik",
    owner: true,
    manager: true,
    cashier: false,
    washer: false,
  },
  {
    feature: "Front-Desk Kasir & Pembayaran POS",
    desc: "Proses transaksi QRIS, Tunai, cetak struk thermal",
    owner: true,
    manager: true,
    cashier: true,
    washer: false,
  },
  {
    feature: "Papan Antrean & Pendaftaran Cuci",
    desc: "Input kendaraan masuk, pilih paket layanan, status cuci",
    owner: true,
    manager: true,
    cashier: true,
    washer: false,
  },
  {
    feature: "Pendaftaran Member & Poin Loyalitas",
    desc: "Daftar pelanggan tetap, tukar kupon cuci gratis 10x",
    owner: true,
    manager: true,
    cashier: true,
    washer: false,
  },
  {
    feature: "Layar Cuci Tablet Kiosk (Area Hidrolik)",
    desc: "Klaim tiket cuci via PIN 4 digit & konfirmasi selesai",
    owner: true,
    manager: true,
    cashier: true,
    washer: true,
  },
  {
    feature: "Integrasi WhatsApp Gateway & Struk Digital",
    desc: "Kirim notifikasi otomatis saat kendaraan siap diambil",
    owner: true,
    manager: true,
    cashier: true,
    washer: false,
  },
];

export function RolePermissionsMatrix() {
  return (
    <Card className="border-border/80 overflow-hidden shadow-2xs">
      <CardHeader className="bg-muted/30 border-b p-4 pb-3 sm:p-5 sm:pb-4">
        <CardTitle className="text-sm font-black uppercase sm:text-base">
          Matriks Hak Akses & Kewenangan Peran (Role Matrix)
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Perbandingan lengkap izin modul sistem Kinclongin POS untuk Owner,
          Manajer, Kasir, dan Tukang Cuci.
        </CardDescription>
      </CardHeader>
      <div className="overflow-x-auto">
        <Table className="min-w-160">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-80 text-xs font-bold whitespace-nowrap uppercase">
                Modul / Fitur Sistem
              </TableHead>
              <TableHead className="text-center text-xs font-bold whitespace-nowrap text-amber-600 uppercase">
                Owner (Pemilik)
              </TableHead>
              <TableHead className="text-center text-xs font-bold whitespace-nowrap text-blue-600 uppercase">
                Manajer Cabang
              </TableHead>
              <TableHead className="text-center text-xs font-bold whitespace-nowrap text-emerald-600 uppercase">
                Kasir (POS)
              </TableHead>
              <TableHead className="text-center text-xs font-bold whitespace-nowrap text-cyan-600 uppercase">
                Tukang Cuci (Washer)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRIX_DATA.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-foreground text-xs font-bold">
                      {row.feature}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {row.desc}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon allowed={row.owner} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon allowed={row.manager} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon allowed={row.cashier} />
                </TableCell>
                <TableCell className="text-center">
                  <PermissionIcon allowed={row.washer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
