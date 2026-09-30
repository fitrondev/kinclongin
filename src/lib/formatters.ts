import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

export function formatSalary(
  min?: number | string | { toNumber?: () => number } | null,
  max?: number | string | { toNumber?: () => number } | null,
  isDisclosed: boolean = true
): string {
  if (!isDisclosed) {
    return "Gaji Dirahasiakan";
  }

  const numMin =
    min != null
      ? typeof min === "number"
        ? min
        : typeof min === "string"
          ? parseFloat(min)
          : (min.toNumber?.() ?? Number(min))
      : null;

  const numMax =
    max != null
      ? typeof max === "number"
        ? max
        : typeof max === "string"
          ? parseFloat(max)
          : (max.toNumber?.() ?? Number(max))
      : null;

  if (!numMin && !numMax) {
    return "Kompetitif";
  }

  const toJuta = (val: number) => {
    const juta = val / 1_000_000;
    return juta >= 1
      ? `${Number(juta.toFixed(1)).toString().replace(".", ",")} Juta`
      : `Rp ${val.toLocaleString("id-ID")}`;
  };

  if (numMin && numMax) {
    if (numMin >= 1_000_000 && numMax >= 1_000_000) {
      const minStr = Number((numMin / 1_000_000).toFixed(1))
        .toString()
        .replace(".", ",");
      const maxStr = Number((numMax / 1_000_000).toFixed(1))
        .toString()
        .replace(".", ",");
      return `Rp ${minStr} - ${maxStr} Juta/bln`;
    }
    return `Rp ${numMin.toLocaleString("id-ID")} - ${numMax.toLocaleString("id-ID")}/bln`;
  }

  if (numMin) {
    return `Mulai ${toJuta(numMin)}/bln`;
  }

  if (numMax) {
    return `Hingga ${toJuta(numMax)}/bln`;
  }

  return "Kompetitif";
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) {
    return "Hari ini";
  }
  if (isYesterday(d)) {
    return "Kemarin";
  }
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Penuh Waktu",
  PART_TIME: "Paruh Waktu",
  CONTRACT: "Kontrak",
  INTERNSHIP: "Magang",
  FREELANCE: "Lepas (Freelance)",
};

export const WORKPLACE_LABELS: Record<string, string> = {
  ONSITE: "Di Kantor (On-site)",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const EDUCATION_LABELS: Record<string, string> = {
  NONE: "Semua Jenjang",
  SMA_SMK: "SMA / SMK",
  D1: "Diploma 1",
  D2: "Diploma 2",
  D3: "Diploma 3",
  D4_S1: "Sarjana (S1/D4)",
  S2: "Magister (S2)",
  S3: "Doktor (S3)",
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  FRESH_GRADUATE: "Fresh Graduate",
  LESS_THAN_1_YEAR: "< 1 Tahun",
  ONE_TO_THREE_YEARS: "1 - 3 Tahun",
  THREE_TO_FIVE_YEARS: "3 - 5 Tahun",
  FIVE_PLUS_YEARS: "> 5 Tahun",
};
