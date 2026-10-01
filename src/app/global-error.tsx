"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Fatal Global Error]:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 font-sans text-zinc-100">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-zinc-900/80 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            ⚠️
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Kesalahan Kritis Antarmuka
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Terjadi kendala pada sistem tata letak utama Kinclongin POS. Silakan
            segarkan aplikasi untuk melanjutkan.
          </p>

          <button
            onClick={() => reset()}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
