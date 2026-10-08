"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Percent,
  Plus,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createPromotionAction,
  deletePromotionAction,
  togglePromotionAction,
} from "@/actions/promotions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatRupiah } from "@/lib/formatters";

interface PromotionItem {
  id: string;
  outletId: string;
  name: string;
  code: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minOrderAmount: number | null;
  daysOfWeek: string[] | null;
  startHour: string | null;
  endHour: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
}

interface PromotionsViewProps {
  outletId: string;
  outletName: string;
  promotions: PromotionItem[];
}

const DAYS = [
  { id: "MON", label: "Senin" },
  { id: "TUE", label: "Selasa" },
  { id: "WED", label: "Rabu" },
  { id: "THU", label: "Kamis" },
  { id: "FRI", label: "Jumat" },
  { id: "SAT", label: "Sabtu" },
  { id: "SUN", label: "Minggu" },
];

export function PromotionsView({
  outletId,
  outletName,
  promotions: initialPromotions,
}: PromotionsViewProps) {
  const router = useRouter();
  const [promotions, setPromotions] =
    useState<PromotionItem[]>(initialPromotions);
  const [isOpenDialog, setIsOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<
    "PERCENTAGE" | "FIXED_AMOUNT"
  >("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<string>("15");
  const [minOrderAmount, setMinOrderAmount] = useState<string>("0");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "MON",
    "TUE",
    "WED",
    "THU",
  ]);
  const [startHour, setStartHour] = useState("08:00");
  const [endHour, setEndHour] = useState("11:00");
  const [description, setDescription] = useState("");

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    const nextState = !currentActive;
    setPromotions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: nextState } : p))
    );

    const res = await togglePromotionAction(id, nextState);
    if (!res.success) {
      toast.error(res.error || "Gagal mengubah status promosi.");
      // Rollback
      setPromotions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: currentActive } : p))
      );
    } else {
      toast.success(
        nextState ? "Promosi berhasil diaktifkan!" : "Promosi dinonaktifkan."
      );
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus aturan promosi ini secara permanen?")) return;

    const res = await deletePromotionAction(id);
    if (!res.success) {
      toast.error(res.error || "Gagal menghapus promosi.");
    } else {
      toast.success("Aturan promosi dihapus.");
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama promosi wajib diisi.");
      return;
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Nilai diskon harus lebih dari 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPromotionAction({
        outletId,
        name: name.trim(),
        code: code.trim() || undefined,
        discountType,
        discountValue: val,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
        daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
        startHour: startHour || undefined,
        endHour: endHour || undefined,
        description: description.trim() || undefined,
        isActive: true,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan promosi.");
      } else {
        toast.success("Aturan promosi berhasil dibuat!");
        setIsOpenDialog(false);
        // Reset form
        setName("");
        setCode("");
        setDiscountValue("15");
        setDescription("");
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-black tracking-tight sm:text-3xl">
            Mesin Diskon & Happy Hour
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Kelola promosi otomatis jam sepi dan voucher diskon di{" "}
            <span className="text-foreground font-bold">{outletName}</span>.
          </p>
        </div>

        <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
          <DialogTrigger asChild>
            <Button className="h-11 gap-2 font-bold shadow-xs">
              <Plus className="h-4 w-4" />
              <span>+ Buat Promosi Baru</span>
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md sm:max-w-lg">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>Tambah Promosi / Happy Hour</span>
                </DialogTitle>
                <DialogDescription>
                  Aturan diskon otomatis saat transaksi di kasir POS.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="promo-name">Nama Promosi *</Label>
                  <Input
                    id="promo-name"
                    placeholder="Contoh: Happy Hour Pagi 20%"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="discount-type">Tipe Diskon</Label>
                    <Select
                      value={discountType}
                      onValueChange={(val: "PERCENTAGE" | "FIXED_AMOUNT") =>
                        setDiscountType(val)
                      }
                    >
                      <SelectTrigger id="discount-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">
                          Persentase (%)
                        </SelectItem>
                        <SelectItem value="FIXED_AMOUNT">
                          Nominal Tetap (Rp)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="discount-val">
                      Nilai Diskon{" "}
                      {discountType === "PERCENTAGE" ? "(%)" : "(Rp)"} *
                    </Label>
                    <Input
                      id="discount-val"
                      type="number"
                      min="1"
                      placeholder={
                        discountType === "PERCENTAGE" ? "20" : "10000"
                      }
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="promo-code">Kode Voucher (Opsional)</Label>
                    <Input
                      id="promo-code"
                      placeholder="Misal: KOMUNITAS10K"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                    <p className="text-muted-foreground text-[11px]">
                      Kosongkan jika ingin promo aktif otomatis.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="min-order">Min. Transaksi (Rp)</Label>
                    <Input
                      id="min-order"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* Happy Hour Settings */}
                <div className="bg-muted/40 space-y-3 rounded-xl border p-3">
                  <div className="text-foreground flex items-center gap-2 text-xs font-bold">
                    <Clock className="text-primary h-4 w-4" />
                    <span>Jadwal Jam Sepi (Happy Hour Otomatis)</span>
                  </div>

                  {/* Hari */}
                  <div className="space-y-1.5">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      Hari Berlaku:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DAYS.map((d) => {
                        const active = selectedDays.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleDay(d.id)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              active
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-card text-muted-foreground hover:bg-muted border"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jam Mulai - Jam Selesai */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="start-hour" className="text-xs">
                        Jam Mulai (HH:MM)
                      </Label>
                      <Input
                        id="start-hour"
                        type="time"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="end-hour" className="text-xs">
                        Jam Selesai (HH:MM)
                      </Label>
                      <Input
                        id="end-hour"
                        type="time"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="promo-desc">Catatan / Deskripsi</Label>
                  <Input
                    id="promo-desc"
                    placeholder="Misal: Promo cuci pagi hari kerja"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpenDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Aturan Promosi"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List Promosi */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.length === 0 ? (
          <Card className="col-span-full border-dashed p-8 text-center">
            <CardContent className="flex flex-col items-center justify-center p-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Tag className="h-6 w-6" />
              </div>
              <h3 className="text-foreground mt-4 text-base font-bold">
                Belum Ada Aturan Promosi
              </h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                Buat promosi jam sepi (Happy Hour) untuk meningkatkan kapasitas
                cuci kendaraan di pagi hari kerja atau bagi voucher diskon.
              </p>
            </CardContent>
          </Card>
        ) : (
          promotions.map((promo) => {
            const isPercent = promo.discountType === "PERCENTAGE";
            const hasHappyHour = Boolean(promo.startHour && promo.endHour);

            return (
              <Card
                key={promo.id}
                className={`relative transition-all ${
                  promo.isActive
                    ? "border-primary/20 shadow-xs"
                    : "bg-muted/30 opacity-60"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold">
                          {promo.name}
                        </CardTitle>
                        {promo.code && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 font-mono text-[10px] text-amber-700 dark:text-amber-300"
                          >
                            {promo.code}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {promo.description || "Promosi aktif di loket kasir"}
                      </CardDescription>
                    </div>

                    <Switch
                      checked={promo.isActive}
                      onCheckedChange={() =>
                        handleToggle(promo.id, promo.isActive)
                      }
                      title={promo.isActive ? "Nonaktifkan" : "Aktifkan"}
                    />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Nilai Diskon Banner */}
                  <div className="bg-primary/5 text-primary flex items-center justify-between rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        Besaran Diskon:
                      </span>
                    </div>
                    <span className="text-lg font-black">
                      {isPercent
                        ? `${promo.discountValue}%`
                        : formatRupiah(promo.discountValue)}
                    </span>
                  </div>

                  {/* Kriteria Waktu */}
                  {hasHappyHour && (
                    <div className="text-muted-foreground space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>
                          Happy Hour: {promo.startHour} - {promo.endHour}
                        </span>
                      </div>
                      {promo.daysOfWeek && promo.daysOfWeek.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span>Hari: {promo.daysOfWeek.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {promo.minOrderAmount != null && promo.minOrderAmount > 0 && (
                    <p className="text-muted-foreground text-[11px]">
                      Min. transaksi:{" "}
                      <span className="text-foreground font-semibold">
                        {formatRupiah(promo.minOrderAmount)}
                      </span>
                    </p>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between border-t pt-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        promo.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {promo.isActive ? "Aktif di Kasir" : "Nonaktif"}
                    </Badge>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(promo.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                      title="Hapus promosi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
