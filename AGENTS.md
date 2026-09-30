<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KERJANTB — AI AGENT CONSTITUTION & CODING GUIDELINES

> **KerjaNTB** adalah platform job portal terpercaya khusus wilayah **Nusa Tenggara Barat (NTB)**, menghubungkan pencari kerja lokal dengan perusahaan terverifikasi di 10 Kabupaten/Kota se-NTB.

---

## 1. Core Technology Stack

| Komponen         | Spesifikasi & Versi                | Catatan                                                       |
| :--------------- | :--------------------------------- | :------------------------------------------------------------ |
| **Framework**    | Next.js 16 (App Router, Turbopack) | Server Components default, async params/searchParams          |
| **UI & Runtime** | React 19 + Bun 1.3+                | Fast package management, JSX compiler modern                  |
| **Bahasa**       | TypeScript 5 (Strict Mode)         | **Zero `any` policy**, strongly typed end-to-end              |
| **UI Library**   | shadcn/ui (`radix-nova` preset)    | Radix UI primitives, Sonner, Tooltips, Sidebar                |
| **Styling**      | Tailwind CSS v4 + OKLCH Tokens     | `--primary: oklch(0.488 0.243 264.376)`, `--chart-1: emerald` |
| **Database**     | MySQL di SumoPod + Prisma ORM      | Connection pooling terkelola, referential integrity           |
| **Storage**      | SumoPod Object Storage (S3 API)    | Presigned URLs via `@aws-sdk/client-s3`                       |
| **Auth**         | Clerk Authentication               | OAuth Google, Email OTP, Webhook sync ke MySQL                |
| **Formatting**   | Prettier + Tailwind Plugin         | `@trivago/prettier-plugin-sort-imports`                       |

---

## 2. Aturan Mutlak Pengembangan (Golden Rules)

### 2.1 TypeScript & Kualitas Kode

- **DILARANG MENGGUNAKAN `any`**: Seluruh variabel, fungsi, props, dan return types wajib bertipe data eksplisit.
- Jalankan `bun run format:check` dan `bun run build` sebelum menyelesaikan setiap sprint.

### 2.2 Konvensi Next.js 16 Asynchronous

- `params` dan `searchParams` pada Halaman (`page.tsx`) dan Layout (`layout.tsx`) adalah `Promise`:
  ```tsx
  // BENAR di Next.js 16:
  export default async function JobPage({
    params,
    searchParams,
  }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }) {
    const { slug } = await params;
    const query = await searchParams;
  }
  ```
- `cookies()` dan `headers()` dari `next/headers` bersifat asynchronous:
  ```tsx
  const cookieStore = await cookies();
  const headersList = await headers();
  ```

### 2.3 Server Components vs Client Components

- **Server Components (Default)**: Digunakan untuk seluruh fetching data, SEO rendering, dan halaman statis/dinamis.
- **Client Components (`"use client"`)**: Hanya digunakan jika memerlukan interaktivitas browser (state `useState`, event handler `onClick`, custom hooks browser).
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

- Setiap Server Action wajib memvalidasi sesi Clerk (`auth()`) dan memeriksa role pengguna di database.
- Data input wajib divalidasi dengan schema **Zod**.

### 2.5 Penanganan Berkas & Object Storage

- **JANGAN SIMPAN BINARY DI DATABASE**: File CV/resume, logo perusahaan, dokumen legalitas NIB, dan avatar disimpan di SumoPod Object Storage melalui direct presigned URL.

---

## 3. Design System & Styling (Tailwind v4 & shadcn)

- **DILARANG MENGGUNAKAN HARDCODED HEX**: Hindari arbitrary class seperti `bg-[#1447E6]`. Gunakan token semantik:
  - Tombol Utama / Brand CTA: `bg-primary text-primary-foreground hover:bg-primary/90`
  - Badge Verifikasi NTB / Trust: `bg-chart-1/10 text-chart-1 border-chart-1/20`
  - Container / Kartu: `bg-card text-card-foreground border-border`
  - Muted Text / Subtitle: `text-muted-foreground`
  - Warning / Danger: `text-destructive` atau `bg-destructive/10`
  - Sidebar: `bg-sidebar text-sidebar-foreground border-sidebar-border`
- **Global Providers**:
  - `Providers` di `src/components/providers.tsx` membungkus aplikasi dengan:
    - `<ThemeProvider>` (`next-themes`)
    - `<TooltipProvider delayDuration={150}>`
    - `<Toaster richColors position="top-right">` (`sonner`)

---

## 4. Struktur Direktori Proyek

```
d:/kerja-ntb/
├── .agents/skills/        # AI Agent Skills (Antigravity)
├── .claude/skills/        # AI Agent Skills (Claude Code)
├── docs/                  # Spesifikasi sistem (PRD, Arsitektur, Skema DB)
├── prisma/                # Prisma schema & seed script
├── public/                # Favicon & aset gambar statis
├── src/
│   ├── app/
│   │   ├── (auth)/        # Clerk sign-in / sign-up
│   │   ├── (dashboard)/   # Dashboard dengan AppSidebar & layout terpadu
│   │   ├── (root)/        # Homepage publik & eksplorasi loker
│   │   ├── api/           # Webhook sync Clerk, presigned upload URLs
│   │   ├── globals.css    # Tailwind v4 & OKLCH variables
│   │   └── layout.tsx     # Root layout dengan Font Inter & Providers
│   ├── components/
│   │   ├── dashboard/     # Komponen AppSidebar, Header, dsb.
│   │   ├── ui/            # Komponen shadcn/ui
│   │   ├── providers.tsx  # ThemeProvider, TooltipProvider, Sonner Toaster
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── db/            # Prisma singleton client
│   │   ├── storage/       # S3 Client untuk SumoPod Storage
│   │   └── utils.ts       # Utility cn()
│   └── actions/           # Server Actions mutasi data
├── package.json           # Dependensi & skrip proyek
└── tsconfig.json          # Strict TypeScript config
```

---

## 5. Cakupan Wilayah NTB (10 Daerah Resmi)

1. Kota Mataram
2. Kabupaten Lombok Barat
3. Kabupaten Lombok Tengah
4. Kabupaten Lombok Timur
5. Kabupaten Lombok Utara
6. Kabupaten Sumbawa
7. Kabupaten Sumbawa Barat
8. Kabupaten Dompu
9. Kabupaten Bima
10. Kota Bima

---

## 6. Perintah Kerja Standar (Commands)

```bash
# Menjalankan development server
bun run dev

# Menjalankan type-check & build produksi
bun run build

# Menjalankan formatting kode otomatis
bun run format

# Memeriksa kerapian format
bun run format:check

# Menjalankan linter
bun run lint

# Migrasi & update skema database Prisma
bunx prisma db push
bunx prisma generate
```
