export interface JobSchemaInput {
  id: string;
  title: string;
  slug: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string | null;
  type: string;
  workplace: string;
  education: string;
  experience: string;
  isSalaryDisclosed: boolean;
  salaryMin: number | null | { toNumber?: () => number };
  salaryMax: number | null | { toNumber?: () => number };
  createdAt: Date | string;
  deadline: Date | string | null;
  applicationMethod: string;
  company: {
    name: string;
    website?: string | null;
    logoUrl?: string | null;
  } | null;
  location: {
    name: string;
    province?: string;
  };
}

/**
 * Memetakan tipe pekerjaan enum Prisma ke kosakata standar Schema.org Google Jobs
 */
function mapEmploymentType(type: string): string {
  switch (type) {
    case "FULL_TIME":
      return "FULL_TIME";
    case "PART_TIME":
      return "PART_TIME";
    case "CONTRACT":
      return "CONTRACTOR";
    case "INTERNSHIP":
      return "INTERN";
    case "FREELANCE":
      return "OTHER";
    default:
      return "FULL_TIME";
  }
}

/**
 * Memetakan tingkat pendidikan ke kategori kredensial Schema.org
 */
function mapEducationCredential(education: string): string | undefined {
  switch (education) {
    case "SMA_SMK":
      return "SMA / SMK Sederajat";
    case "D1":
      return "Diploma 1 (D1)";
    case "D2":
      return "Diploma 2 (D2)";
    case "D3":
      return "Diploma 3 (D3)";
    case "D4_S1":
      return "Sarjana / Diploma 4 (S1 / D4)";
    case "S2":
      return "Magister (S2)";
    case "S3":
      return "Doktor (S3)";
    default:
      return undefined;
  }
}

/**
 * Memetakan pengalaman kerja ke perkiraan durasi bulan untuk Google Jobs
 */
function mapExperienceMonths(experience: string): number {
  switch (experience) {
    case "FRESH_GRADUATE":
      return 0;
    case "LESS_THAN_1_YEAR":
      return 6;
    case "ONE_TO_THREE_YEARS":
      return 12;
    case "THREE_TO_FIVE_YEARS":
      return 36;
    case "FIVE_PLUS_YEARS":
      return 60;
    default:
      return 0;
  }
}

/**
 * Mengonversi teks plain menjadi paragraf dan bullet point HTML terstruktur
 * agar Google Jobs dapat mengekstrak bagian tugas dan persyaratan dengan rapi.
 */
function buildHtmlDescription(job: JobSchemaInput): string {
  const sanitize = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const toParagraphs = (text: string) =>
    text
      .split("\n\n")
      .map((p) => `<p>${sanitize(p.trim()).replace(/\n/g, "<br/>")}</p>`)
      .join("");

  let html = `<div>${toParagraphs(job.description)}</div>`;

  if (job.responsibilities && job.responsibilities.trim()) {
    html += `<h3>Tanggung Jawab Pekerjaan:</h3><div>${toParagraphs(job.responsibilities)}</div>`;
  }

  if (job.requirements && job.requirements.trim()) {
    html += `<h3>Kualifikasi &amp; Persyaratan:</h3><div>${toParagraphs(job.requirements)}</div>`;
  }

  if (job.benefits && job.benefits.trim()) {
    html += `<h3>Benefit &amp; Fasilitas:</h3><div>${toParagraphs(job.benefits)}</div>`;
  }

  return html;
}

/**
 * Menghasilkan JSON-LD Schema.org/JobPosting yang 100% patuh spesifikasi Google for Jobs
 */
export function generateJobPostingJsonLd(
  job: JobSchemaInput,
  appBaseUrl = "https://kerjantb.com"
): Record<string, unknown> {
  const companyName = job.company?.name || "Perusahaan di NTB";
  const datePosted =
    job.createdAt instanceof Date
      ? job.createdAt.toISOString()
      : new Date(job.createdAt).toISOString();

  const validThrough = job.deadline
    ? job.deadline instanceof Date
      ? job.deadline.toISOString()
      : new Date(job.deadline).toISOString()
    : undefined;

  // Resolusi logo URL absolut
  let companyLogo: string | undefined = undefined;
  if (job.company?.logoUrl) {
    if (job.company.logoUrl.startsWith("http")) {
      companyLogo = job.company.logoUrl;
    } else {
      companyLogo = `${appBaseUrl}${job.company.logoUrl.startsWith("/") ? "" : "/"}${job.company.logoUrl}`;
    }
  }

  // Resolusi gaji numerik
  let minSalary: number | undefined = undefined;
  let maxSalary: number | undefined = undefined;

  if (job.salaryMin) {
    minSalary =
      typeof job.salaryMin === "object" &&
      typeof job.salaryMin.toNumber === "function"
        ? job.salaryMin.toNumber()
        : Number(job.salaryMin);
  }

  if (job.salaryMax) {
    maxSalary =
      typeof job.salaryMax === "object" &&
      typeof job.salaryMax.toNumber === "function"
        ? job.salaryMax.toNumber()
        : Number(job.salaryMax);
  }

  const isRemote = job.workplace === "REMOTE";
  const credentialCategory = mapEducationCredential(job.education);
  const monthsOfExperience = mapExperienceMonths(job.experience);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: buildHtmlDescription(job),
    datePosted,
    validThrough,
    employmentType: [mapEmploymentType(job.type)],
    hiringOrganization: {
      "@type": "Organization",
      name: companyName,
      sameAs: job.company?.website || undefined,
      logo: companyLogo,
    },
    identifier: {
      "@type": "PropertyValue",
      name: companyName,
      value: job.id,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.name,
        addressRegion: "Nusa Tenggara Barat",
        addressCountry: "ID",
      },
    },
    directApply: job.applicationMethod === "KERJANTB",
  };

  // Konfigurasi khusus WFH / Remote
  if (isRemote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: "ID",
    };
  }

  // Konfigurasi gaji jika dipublikasikan
  if (job.isSalaryDisclosed && minSalary && minSalary > 0) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "IDR",
      value: {
        "@type": "QuantitativeValue",
        minValue: minSalary,
        maxValue: maxSalary && maxSalary > minSalary ? maxSalary : undefined,
        value: !maxSalary || maxSalary === minSalary ? minSalary : undefined,
        unitText: "MONTH",
      },
    };
  }

  // Persyaratan Pendidikan
  if (credentialCategory) {
    jsonLd.educationRequirements = {
      "@type": "EducationalOccupationalCredential",
      credentialCategory,
    };
  }

  // Persyaratan Pengalaman
  if (monthsOfExperience > 0) {
    jsonLd.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience,
    };
  }

  return jsonLd;
}
