import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kencana.basic.box.cloudeka.id",
      },

      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  ...(process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" as const }
    : {}),
  async redirects() {
    return [
      {
        source: "/kiosk",
        destination: "/layar-cuci",
        permanent: true,
      },
      {
        source: "/kiosk/:path*",
        destination: "/layar-cuci",
        permanent: true,
      },
      {
        source: "/panel-cuci",
        destination: "/layar-cuci",
        permanent: true,
      },
      {
        source: "/pos/queue",
        destination: "/pos/antrean",
        permanent: true,
      },
      {
        source: "/pos/new",
        destination: "/pos/daftar-baru",
        permanent: true,
      },
      {
        source: "/pos/checkout/:id",
        destination: "/pos/bayar/:id",
        permanent: true,
      },
      {
        source: "/track/:ticketId",
        destination: "/lacak/:ticketId",
        permanent: true,
      },
      {
        source: "/dashboard/inventory",
        destination: "/dashboard/stok",
        permanent: true,
      },
      {
        source: "/dashboard/analytics/payroll",
        destination: "/dashboard/komisi",
        permanent: true,
      },
      {
        source: "/dashboard/customers",
        destination: "/dashboard/pelanggan",
        permanent: true,
      },
      {
        source: "/dashboard/settings/subscription",
        destination: "/dashboard/pengaturan/langganan",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/logo.webp",
        destination: "/api/storage/file/Logo/logo.webp",
      },
      {
        source: "/Logo/logo.webp",
        destination: "/api/storage/file/Logo/logo.webp",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(), bluetooth=(self)",
          },
        ],
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
