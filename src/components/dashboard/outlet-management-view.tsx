"use client";

import { useState } from "react";

import {
  Building2,
  CheckCircle2,
  Crown,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { createOutletAction, switchActiveOutletAction } from "@/actions/org";
import {
  type UpdateOutletProfileInput,
  updateOutletProfileAction,
} from "@/actions/owner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStorageUpload } from "@/hooks/use-storage-upload";

export interface OutletDetailItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  slogan?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  contactPhone?: string | null;
  isActive: boolean;
  isCurrent: boolean;
  totalEmployees: number;
  totalTicketsThisMonth: number;
}

interface OutletManagementViewProps {
  currentOutlet: OutletDetailItem;
  allOutlets: OutletDetailItem[];
}

export function OutletManagementView({
  currentOutlet,
  allOutlets,
}: OutletManagementViewProps) {
  // State Edit Profil Cabang Aktif
  const [name, setName] = useState(currentOutlet.name);
  const [address, setAddress] = useState(currentOutlet.address);
  const [phone, setPhone] = useState(currentOutlet.phone);
  const [logoUrl, setLogoUrl] = useState(currentOutlet.logoUrl || "");
  const [slogan, setSlogan] = useState(currentOutlet.slogan || "");
  const [receiptHeader, setReceiptHeader] = useState(
    currentOutlet.receiptHeader || ""
  );
  const [receiptFooter, setReceiptFooter] = useState(
    currentOutlet.receiptFooter || ""
  );
  const [contactPhone, setContactPhone] = useState(
    currentOutlet.contactPhone || currentOutlet.phone || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Hook Upload Logo S3
  const { upload, isUploading: isLogoUploading } = useStorageUpload();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (PNG, JPG, atau WEBP)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran logo maksimal 2MB");
      return;
    }

    const res = await upload(file, "LOGO", currentOutlet.id);
    if (res?.publicUrl) {
      setLogoUrl(res.publicUrl);
      toast.success(
        "Logo berhasil diunggah! Klik 'Simpan Perubahan' untuk menerapkan."
      );
    } else {
      toast.error("Gagal mengunggah logo ke penyimpanan.");
    }
  };

  // State Tambah Cabang Baru
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [newOutletPhone, setNewOutletPhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await updateOutletProfileAction({
        outletId: currentOutlet.id,
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        logoUrl: logoUrl.trim() || undefined,
        slogan: slogan.trim() || undefined,
        receiptHeader: receiptHeader.trim() || undefined,
        receiptFooter: receiptFooter.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui data cabang.");
        return;
      }

      toast.success("Profil dan identitas brand cabang berhasil diperbarui!");
    } catch {
      toast.error("Terjadi kendala jaringan saat memperbarui profil cabang.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newOutletName.trim() ||
      !newOutletAddress.trim() ||
      !newOutletPhone.trim()
    ) {
      toast.error("Lengkapi seluruh kolom cabang baru.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createOutletAction({
        name: newOutletName.trim(),
        address: newOutletAddress.trim(),
        phone: newOutletPhone.trim(),
      });

      if (!res.success) {
        toast.error(res.error || "Gagal membuat cabang baru.");
        return;
      }

      toast.success("Cabang baru berhasil didaftarkan dan diaktifkan!");
      setIsAddOpen(false);
      setNewOutletName("");
      setNewOutletAddress("");
      setNewOutletPhone("");
      window.location.reload();
    } catch {
      toast.error("Gagal membuka cabang baru.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchOutlet = async (outletId: string) => {
    setSwitchingId(outletId);
    try {
      const res = await switchActiveOutletAction(outletId);
      if (!res.success) {
        toast.error(res.error || "Gagal beralih cabang.");
        return;
      }
      toast.success("Berhasil beralih cabang operasional!");
      window.location.reload();
    } catch {
      toast.error("Kendala jaringan saat beralih cabang.");
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground flex flex-wrap items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <Building2 className="text-primary h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span>Pengelolaan & Ekspansi Cabang Outlet</span>
            </h1>
            <Badge
              variant="outline"
              className="shrink-0 items-center gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600"
            >
              <Crown className="h-3 w-3 text-amber-600" />
              <span>Khusus Owner</span>
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Atur profil cabang aktif dan kelola ekspansi multi-cabang bisnis
            cuci Anda.
          </p>
        </div>

        {/* Tombol Tambah Cabang Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 w-full shrink-0 gap-2 rounded-xl text-xs font-bold shadow-sm sm:w-auto">
              <Plus className="h-4 w-4" />
              <span>+ Tambah Cabang Baru</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Tambah Cabang Outlet Baru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ekspansi usaha cuci kendaraan Anda ke lokasi baru dengan satu
                akun Owner.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateOutlet} className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="newName" className="text-xs font-semibold">
                  Nama Cabang Baru
                </Label>
                <Input
                  id="newName"
                  placeholder="Contoh: Kinclongin Cabang Cakranegara"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  required
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newAddress" className="text-xs font-semibold">
                  Alamat Lengkap Lokasi
                </Label>
                <Textarea
                  id="newAddress"
                  placeholder="Jl. Pejanggik No. 88, Mataram"
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  required
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPhone" className="text-xs font-semibold">
                  Nomor Telepon / WhatsApp Cabang
                </Label>
                <Input
                  id="newPhone"
                  placeholder="081234567890"
                  value={newOutletPhone}
                  onChange={(e) => setNewOutletPhone(e.target.value)}
                  required
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 w-full gap-2 rounded-xl text-xs font-bold"
                >
                  {isCreating ? "Mendaftarkan..." : "Daftarkan Cabang Baru"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted/60 grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 group-data-horizontal/tabs:h-auto sm:inline-flex sm:h-10 sm:w-auto sm:gap-1.5">
          <TabsTrigger
            value="profile"
            className="h-9 gap-1.5 px-2 text-xs font-bold data-active:shadow-xs sm:gap-2 sm:px-3"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Profil Cabang</span>
            <span className="text-muted-foreground hidden max-w-40 truncate text-[11px] font-normal md:inline">
              ({currentOutlet.name})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="branches"
            className="h-9 gap-1.5 px-2 text-xs font-bold data-active:shadow-xs sm:gap-2 sm:px-3"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Semua Cabang</span>
            <span className="text-muted-foreground shrink-0 font-mono text-[10px] sm:text-xs">
              ({allOutlets.length})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Edit Profil Cabang Aktif & White-Label Branding */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Kolom Kiri: Form Pengaturan Brand (8 Kolom) */}
            <Card className="border-border bg-card shadow-xs lg:col-span-7 xl:col-span-8">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-foreground text-base font-bold">
                  Detail Identitas & White-Label Branding
                </CardTitle>
                <CardDescription className="text-xs">
                  Atur logo, nama usaha, dan tampilan struk kasir. Seluruh staf
                  dan pelanggan akan melihat identitas brand tempat cuci Anda.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  {/* Upload Logo Tempat Cuci */}
                  <div className="bg-muted/20 space-y-2 rounded-xl border border-dashed p-3 sm:p-4">
                    <Label className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="text-primary h-3.5 w-3.5" />
                        <span>Logo Tempat Cuci</span>
                      </span>
                      {logoUrl ? (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="text-destructive flex items-center gap-1 text-[11px] hover:underline"
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus Logo
                        </button>
                      ) : null}
                    </Label>

                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      {/* Thumbnail Preview */}
                      <div className="bg-card flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1.5 shadow-xs">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={logoUrl}
                            alt="Logo Tempat Cuci"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="text-muted-foreground flex flex-col items-center text-center">
                            <ImageIcon className="h-6 w-6 opacity-40" />
                            <span className="mt-0.5 text-[9px] font-medium">
                              Tanpa Logo
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Upload Input & Manual URL */}
                      <div className="w-full flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              disabled={isLogoUploading}
                              onChange={handleLogoUpload}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isLogoUploading}
                              className="pointer-events-none h-9 gap-1.5 rounded-xl text-xs font-semibold"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              <span>
                                {isLogoUploading
                                  ? "Mengunggah..."
                                  : "Unggah Logo (PNG/JPG)"}
                              </span>
                            </Button>
                          </label>
                          <span className="text-muted-foreground text-[11px]">
                            Maks 2MB
                          </span>
                        </div>
                        <Input
                          id="logoUrl"
                          placeholder="Atau tempel URL gambar (https://...)"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold">
                        Nama Usaha / Tempat Cuci
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Contoh: Berkah Auto Wash"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="slogan" className="text-xs font-semibold">
                        Slogan Usaha (Opsional)
                      </Label>
                      <Input
                        id="slogan"
                        value={slogan}
                        onChange={(e) => setSlogan(e.target.value)}
                        placeholder="Contoh: Cepat, Bersih & Mengkilap"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-xs font-semibold">
                      Alamat Fisik Cabang
                    </Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={2}
                      className="rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold">
                        Telepon Operasional
                      </Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="contactPhone"
                        className="text-xs font-semibold"
                      >
                        WhatsApp Bantuan CS
                      </Label>
                      <Input
                        id="contactPhone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="08123456789"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="slug" className="text-xs font-semibold">
                        Slug URL Cabang
                      </Label>
                      <Input
                        id="slug"
                        value={currentOutlet.slug}
                        disabled
                        className="bg-muted text-muted-foreground h-10 rounded-xl font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Kustomisasi Teks Struk Kasir */}
                  <div className="space-y-3 border-t pt-2">
                    <h3 className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                      <Receipt className="text-primary h-3.5 w-3.5" />
                      <span>Kustomisasi Nota / Struk Kasir (ESC/POS)</span>
                    </h3>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="receiptHeader"
                        className="text-xs font-semibold"
                      >
                        Teks Tambahan Kepala Struk (Header)
                      </Label>
                      <Input
                        id="receiptHeader"
                        value={receiptHeader}
                        onChange={(e) => setReceiptHeader(e.target.value)}
                        placeholder="Contoh: SPESIALIS CUCI HIDROLIK & SALJU"
                        className="h-10 rounded-xl text-xs"
                      />
                      <p className="text-muted-foreground text-[11px]">
                        Teks ini dicetak di bawah nama outlet pada struk kertas
                        thermal.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="receiptFooter"
                        className="text-xs font-semibold"
                      >
                        Teks Catatan Kaki Struk (Footer)
                      </Label>
                      <Input
                        id="receiptFooter"
                        value={receiptFooter}
                        onChange={(e) => setReceiptFooter(e.target.value)}
                        placeholder="Contoh: Barang berharga harap diamankan. Terima kasih atas kunjungan Anda!"
                        className="h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t pt-4">
                  <Button
                    type="submit"
                    disabled={isUpdating || isLogoUploading}
                    className="h-10 w-full gap-2 rounded-xl text-xs font-bold shadow-xs sm:w-auto"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {isUpdating
                        ? "Menyimpan..."
                        : "Simpan Perubahan Identitas"}
                    </span>
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Kolom Kanan: Pratinjau Langsung Struk Kasir (4-5 Kolom) */}
            <div className="space-y-4 lg:col-span-5 xl:col-span-4">
              <Card className="border-border bg-card shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground flex items-center gap-1.5 text-xs font-bold">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pratinjau Live Struk Kasir</span>
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Simulasi tampilan nota thermal 58mm pelanggan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/40 text-foreground space-y-2 rounded-xl border p-4 font-mono text-xs shadow-inner">
                    {/* Header Struk */}
                    <div className="space-y-0.5 border-b pb-2 text-center">
                      {logoUrl ? (
                        <div className="mb-1 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt="Logo Struk"
                            className="h-8 object-contain"
                          />
                        </div>
                      ) : null}
                      <p className="text-sm font-extrabold tracking-wide uppercase">
                        {name || "NAMA TEMPAT CUCI"}
                      </p>
                      {slogan ? (
                        <p className="text-muted-foreground text-[10px] italic">
                          &ldquo;{slogan}&rdquo;
                        </p>
                      ) : null}
                      {receiptHeader ? (
                        <p className="text-primary text-[10px] font-semibold">
                          {receiptHeader}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground line-clamp-1 text-[10px]">
                        {address || "Alamat Cabang"}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        Telp: {contactPhone || phone || "08xxxx"}
                      </p>
                    </div>

                    {/* Metadata Sample */}
                    <div className="space-y-0.5 border-b py-1 text-[11px]">
                      <div className="flex justify-between">
                        <span>No. Tiket:</span>
                        <span className="font-bold">#KNC-001</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kendaraan:</span>
                        <span className="font-bold">DR 1234 BZ (Avanza)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Layanan:</span>
                        <span>Cuci Salju + Semir</span>
                      </div>
                    </div>

                    {/* Total Sample */}
                    <div className="flex justify-between border-b pt-1 pb-2 text-xs font-bold">
                      <span>TOTAL:</span>
                      <span>Rp 50.000</span>
                    </div>

                    {/* Footer Struk */}
                    <div className="text-muted-foreground space-y-0.5 pt-1 text-center text-[10px]">
                      <p className="font-medium">
                        {receiptFooter || "TERIMA KASIH ATAS KUNJUNGAN ANDA!"}
                      </p>
                      {contactPhone ? (
                        <p className="text-[9px]">CS: {contactPhone}</p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Daftar Seluruh Cabang (Multi-Outlet) */}
        <TabsContent value="branches">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allOutlets.map((outlet) => (
              <Card
                key={outlet.id}
                className={`shadow-xs transition-all ${
                  outlet.isCurrent
                    ? "border-primary/50 bg-primary/5 ring-primary/20 ring-2"
                    : "border-border bg-card"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground text-sm font-bold">
                        {outlet.name}
                      </CardTitle>
                      <CardDescription className="mt-0.5 flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="max-w-44 truncate">
                          {outlet.address}
                        </span>
                      </CardDescription>
                    </div>

                    {outlet.isCurrent && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                        Aktif
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-xs">
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Telepon:</span>
                    <span className="text-foreground font-semibold">
                      {outlet.phone}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Total Staf:</span>
                    <span className="text-foreground font-semibold">
                      {outlet.totalEmployees} Orang
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center justify-between">
                    <span>Tiket Bulan Ini:</span>
                    <span className="font-semibold text-emerald-600">
                      {outlet.totalTicketsThisMonth} Unit
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="border-t pt-3">
                  {outlet.isCurrent ? (
                    <Button
                      disabled
                      variant="outline"
                      className="h-9 w-full rounded-xl text-xs font-bold"
                    >
                      <CheckCircle2 className="text-primary mr-1.5 h-3.5 w-3.5" />
                      <span>Sedang Dikelola</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSwitchOutlet(outlet.id)}
                      disabled={switchingId === outlet.id}
                      variant="secondary"
                      className="h-9 w-full rounded-xl text-xs font-bold"
                    >
                      {switchingId === outlet.id ? (
                        "Beralih..."
                      ) : (
                        <span>Beralih ke Cabang Ini</span>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
