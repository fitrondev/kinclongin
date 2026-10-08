<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KINCLONGIN — AI AGENT CONSTITUTION & CODING GUIDELINES

> **Kinclongin** adalah platform Point of Sale (POS) dan manajemen operasional modern terpadu khusus untuk bisnis cuci mobil, motor, dan auto-detailing multi-cabang dengan dukungan **Multi-Tenant B2B (Manual Outlet/Branch Model)**, autentikasi **Auth.js v5 (NextAuth)**, antrean Kanban visual, perhitungan komisi pekerja otomatis berbasis PIN, dan ketahanan **Offline-First PWA** di area semi-outdoor.

---

## 1. Core Technology Stack

| Komponen           | Spesifikasi & Versi                | Peran & Catatan Implementasi                                                                                           |
| :----------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | Next.js 16 (App Router, Turbopack) | Server Components default, async params/headers, performa rendering tinggi                                             |
| **UI & Runtime**   | React 19 + Bun 1.3+                | Fast package management, modern JSX compiler, zero-latency execution                                                   |
| **Bahasa**         | TypeScript 5 (Strict Mode)         | **Zero `any` policy**, strongly typed end-to-end dari database hingga UI                                               |
| **UI Library**     | shadcn/ui (`radix-nova` preset)    | 60+ komponen Radix primitives, Sonner, Tooltips, Dialog, Sheet, Sidebar                                                |
| **Styling**        | Tailwind CSS v4 + OKLCH Tokens     | `--primary: oklch(...)`, semantic color tokens, high-contrast dark/light mode                                          |
| **Database & ORM** | MySQL di SumoPod + Prisma ORM v7   | `@prisma/adapter-mariadb`, connection pooling terkelola, referential integrity                                         |
| **Auth & Tenancy** | Auth.js v5 (NextAuth) + Manual Org | Multi-tenant B2B berbasis Outlet & Owner, role-scoped routing, `<OutletSwitcher />`, pendaftaran langsung (`bcryptjs`) |
| **Storage**        | SumoPod Object Storage (S3 API)    | Presigned direct upload via `@aws-sdk/client-s3` untuk foto inspeksi & bukti bayar                                     |
| **Offline-First**  | PWA Service Worker + Dexie.js      | IndexedDB cache lokal, offline mutation queue, automatic background sync                                               |
| **Integrasi**      | Webhook WhatsApp + ESC/POS Printer | Notifikasi status cuci/struk digital & cetak struk thermal Bluetooth/USB                                               |
| **Formatting**     | Prettier + Tailwind Plugin         | `@trivago/prettier-plugin-sort-imports`, format konsisten di seluruh berkas                                            |

---

## 2. Aturan Mutlak Pengembangan (Golden Rules)

### 2.1 TypeScript & Kualitas Kode

- **DILARANG MENGGUNAKAN `any`**: Seluruh variabel, fungsi, props, dan return types wajib bertipe data eksplisit. Gunakan `unknown` dengan type-narrowing (Zod) jika tipe belum pasti.
- Jalankan `bun run format:check` dan `bun run build` sebelum menyelesaikan setiap sprint atau interaksi.

### 2.2 Konvensi Next.js 16 Asynchronous

- `params` dan `searchParams` pada Halaman (`page.tsx`) dan Layout (`layout.tsx`) adalah `Promise`:
  ```tsx
  // BENAR di Next.js 16:
  export default async function CheckoutPage({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
    const { id } = await params;
    const query = await searchParams;
  }
  ```
- `cookies()` dan `headers()` dari `next/headers` bersifat asynchronous:
  ```tsx
  const cookieStore = await cookies();
  const headersList = await headers();
  ```

### 2.3 Server Components vs Client Components

- **Server Components (Default)**: Digunakan untuk seluruh fetching data, verifikasi auth/tenant, dan halaman statis/dinamis.
- **Client Components (`"use client"`)**: Hanya digunakan jika memerlukan interaktivitas browser (state `useState`, event handler `onClick`, kamera inspeksi, numpad PIN sentuh, Bluetooth ESC/POS).
- **TIDAK ADA QUERY DATABASE DI CLIENT**: Prisma Client HANYA boleh dipanggil di Server Components atau Server Actions.

### 2.4 Standar Server Action (`"use server"`)

Seluruh mutasi data wajib mengembalikan format terstandarisasi:

```typescript
export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};
```

- Setiap Server Action wajib memvalidasi sesi autentikasi (`getCurrentUser()` / `auth()`), memastikan keberadaan `outletId` aktif, dan memeriksa otoritas peran pengguna.
- Seluruh input data wajib divalidasi dengan skema **Zod**.

### 2.5 Multi-Tenancy & Isolasi Data Cabang (Manual Multi-Outlet)

- Setiap cabang operasional cuci dipetakan ke model **Outlet** (`outletId`).
- Pemilik cabang (Owner) dapat memiliki satu atau lebih Outlet (`ownerId`) dan beralih cabang via `<OutletSwitcher />`.
- **DILARANG QUERY LINTAS TENANT TANPA SCOPING**: Seluruh kueri mutasi dan pembacaan tiket cuci, inventaris, dan komisi wajib menyertakan filter `outletId`.
- Gunakan helper `requireOrgAuth()` untuk mengunci halaman dan aksi hanya bagi anggota organisasi yang sah.

### 2.6 Penanganan Berkas & Object Storage

- **JANGAN SIMPAN BINARY DI DATABASE**: Foto inspeksi kondisi kendaraan sebelum cuci, bukti transfer pembayaran, logo cabang, dan gambar produk ritel disimpan di SumoPod Object Storage melalui direct presigned URL.

### 2.7 Sistem Langganan Lisensi Flat (Manual Transfer / QRIS)

- **TARIF FLAT TUNGGAL**: Rp 50.000 / bulan per cabang outlet (Full Features).
- Seluruh pembayaran diproses secara lokal melalui **Transfer Bank Manual** atau **QRIS Usaha**.
- **Alur Verifikasi Bukti Bayar**: Pengguna mengunggah bukti transfer ke S3 (`TenantSubscriptionPayment`), kemudian Superadmin memverifikasi (approve) secara manual untuk memperpanjang masa aktif `Outlet.subscriptionExpiresAt` (+30 hari per bulan).
- **Grace Period**: Sistem memberikan masa tenggang 3 hari sebelum membatasi akses input tiket baru jika masa langganan berakhir.

---

## 3. Design System & Styling (Tailwind v4 & shadcn)

- **DILARANG MENGGUNAKAN HARDCODED HEX**: Hindari arbitrary class seperti `bg-[#1447E6]`. Gunakan token semantik:
  - Tombol Utama / Brand CTA: `bg-primary text-primary-foreground hover:bg-primary/90`
  - Status Antrean Menunggu (`QUEUED`): `bg-amber-500/10 text-amber-600 border-amber-500/20`
  - Status Sedang Dicuci (`WASHING`): `bg-blue-500/10 text-blue-600 border-blue-500/20`
  - Status Siap Diambil (`READY`): `bg-emerald-500/10 text-emerald-600 border-emerald-500/20`
  - Warning / Danger / Dibatalkan: `text-destructive` atau `bg-destructive/10`
  - Container / Kartu: `bg-card text-card-foreground border-border`
  - Muted Text / Subtitle: `text-muted-foreground`
- **Ergonomi Area Cuci (Wet & Outdoor Environment)**:
  - Tombol pada Tablet Kiosk memiliki tinggi minimal `h-14` (56px) atau `h-16` (64px) dengan font tebal (`font-bold`).
  - Numpad PIN berukuran besar `h-20 w-20` agar mudah disentuh tangan basah tanpa selip.
- **Global Providers**:
  - `Providers` di `src/components/providers.tsx` membungkus aplikasi dengan:
    - `<ThemeProvider>` (`next-themes`)
    - `<TooltipProvider delayDuration={150}>`
    - `<Toaster richColors position="top-right">` (`sonner`)

---

## 4. Struktur Direktori Proyek

```
d:/kinclongin/
├── docs/
│   ├── PRD.md                       # Dokumen PRD Utama (Kinclongin)
│   ├── TIMELINE.md                  # Roadmap ringkas pengerjaan proyek
│   └── vibecoding/                  # Panduan Context Lengkap untuk AI Coding Agents
│       ├── 00-INDEX.md              # Indeks panduan vibecoding
│       ├── 01-ARCHITECTURE-STACK.md # Standar arsitektur & Next.js 16 conventions
│       ├── 02-DATABASE-SCHEMA.md    # Skema Prisma lengkap Kinclongin
│       ├── 03-CORE-MODULES-SPEC.md  # Spesifikasi teknis setiap modul
│       ├── 04-OFFLINE-PWA-ENGINE.md # Arsitektur Dexie.js & Offline Sync
│       ├── 05-API-SERVER-ACTIONS.md # Spesifikasi Server Actions & Zod Contracts
│       ├── 06-VIBECODING-PROMPTS.md # Template prompt siap pakai per sprint
│       └── 07-TIMELINE-SPRINTS.md   # Rincian Sprint 1 - 7 & Milestone
├── prisma/
│   ├── schema.prisma                # Skema database MySQL (Model Kinclongin)
│   └── seed.ts                      # Seeding master data cabang, layanan & karyawan
├── public/                          # Favicon, PWA manifest, dan ikon statis
├── src/
│   ├── actions/                     # Server Actions terisolasi (pos, kiosk, inventory, loyalty, org)
│   ├── app/
│   │   ├── (auth)/                  # Auth.js sign-in & sign-up
│   │   ├── (dashboard)/             # Dasbor analitik Owner & Manager (Multi-outlet, Payroll, Stok)
│   │   ├── (kiosk)/                 # Tablet Kiosk tukang cuci (Numpad PIN, klaim tiket cuci)
│   │   ├── (pos)/                   # Front-desk POS Kasir (Antrean Kanban, input walk-in, checkout)
│   │   ├── track/[ticketId]/        # Halaman publik pelacak status cuci pelanggan
│   │   ├── api/                     # Route handlers (auth.js, whatsapp, offline sync, presign)
│   │   ├── globals.css              # Tailwind v4 & OKLCH variables
│   │   └── layout.tsx               # Root layout dengan Font Inter & Providers
│   ├── components/
│   │   ├── auth/                    # SignInForm, SignUpForm, UserButton, OutletSwitcher
│   │   ├── dashboard/               # Komponen chart Recharts, tabel analitik, switcher
│   │   ├── kiosk/                   # Numpad besar, modal PIN washer, kartu antrean basah
│   │   ├── pos/                     # Kartu Kanban antrean, modal pembayaran, kamera inspeksi
│   │   ├── receipt/                 # Desain struk thermal 58mm/80mm & preview nota
│   │   ├── ui/                      # 60+ komponen shadcn/ui
│   │   ├── providers.tsx            # ThemeProvider, TooltipProvider, Sonner Toaster
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── auth/                    # Auth.js session, RBAC & org-guard helper (`requireOrgAuth`)
│   │   ├── db/                      # Prisma singleton client terkelola
│   │   ├── offline/                 # Dexie.js database client & background syncer
│   │   ├── printer/                 # ESC/POS command builder & Web Bluetooth bridge
│   │   ├── storage/                 # S3 Client untuk SumoPod Storage
│   │   ├── whatsapp/                # HTTP client pengirim pesan WhatsApp Gateway
│   │   ├── formatters.ts            # Formatter Rupiah, tanggal lokal, plat nomor
│   │   └── utils.ts                 # Utility cn()
│   └── types/
│       ├── database.ts              # Ekstensi tipe dari Prisma Client
│       ├── globals.d.ts             # NextAuth v5 session & JWT type augmentations
│       └── pos.ts                   # Tipe state transaksi & tiket
├── package.json                     # Dependensi & skrip proyek
└── tsconfig.json                    # Strict TypeScript config
```

---

## 5. Perintah Kerja Standar (Commands)

```bash
# Menjalankan development server lokal dengan Turbopack
bun run dev

# Menjalankan type-check & build produksi
bun run build

# Menjalankan formatting kode otomatis
bun run format

# Memeriksa kerapian format
bun run format:check

# Menjalankan linter ESLint
bun run lint

# Migrasi & sinkronisasi skema database Prisma ke MySQL
bunx prisma db push
bunx prisma generate

# Menjalankan seeding data master Kinclongin
bun run db:seed
```
