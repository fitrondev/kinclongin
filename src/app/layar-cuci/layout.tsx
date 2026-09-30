import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Layar Cuci | Kinclongin POS",
  description:
    "Layar tablet khusus tukang cuci di area hidrolik untuk klaim antrean mobil & motor.",
};

export default function LayarCuciLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen select-none">
      {children}
    </div>
  );
}
