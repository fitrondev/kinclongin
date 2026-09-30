export interface WashOutletSchemaInput {
  name: string;
  address: string;
  phone: string;
  url?: string;
  logoUrl?: string | null;
  openingHours?: string;
}

/**
 * Menghasilkan JSON-LD Schema.org terstruktur bertipe AutoWash / LocalBusiness
 * untuk optimalisasi SEO dan Google Maps rich snippet.
 */
export function generateAutoWashSchema(outlet: WashOutletSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "AutoWash",
    name: outlet.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: outlet.address,
      addressRegion: "Nusa Tenggara Barat",
      addressCountry: "ID",
    },
    telephone: outlet.phone,
    url: outlet.url || "https://kinclongin.com",
    logo: outlet.logoUrl || "https://kinclongin.com/logo.webp",
    priceRange: "Rp 15.000 - Rp 90.000",
  };
}
