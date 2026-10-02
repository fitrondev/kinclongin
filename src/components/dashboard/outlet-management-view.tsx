"use client";

import { useState } from "react";

import {
  Building2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
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

export interface OutletDetailItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logoUrl: string | null;
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
  const [isUpdating, setIsUpdating] = useState(false);

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
      });

      if (!res.success) {
        toast.error(res.error || "Gagal memperbarui data cabang.");
        return;
      }

      toast.success("Profil cabang berhasil diperbarui!");
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-foreground flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <Building2 className="text-primary h-6 w-6" />
              <span>Pengelolaan & Ekspansi Cabang Outlet</span>
            </h1>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600"
            >
              👑 Khusus Owner
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
            <Button className="h-10 gap-2 rounded-xl text-xs font-bold shadow-sm">
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
        <TabsList className="bg-muted/60 h-10 rounded-xl p-1">
          <TabsTrigger value="profile" className="rounded-lg text-xs font-bold">
            Profil Cabang Aktif ({currentOutlet.name})
          </TabsTrigger>
          <TabsTrigger
            value="branches"
            className="rounded-lg text-xs font-bold"
          >
            Daftar Seluruh Cabang ({allOutlets.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Edit Profil Cabang Aktif */}
        <TabsContent value="profile">
          <Card className="border-border bg-card max-w-2xl shadow-xs">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-foreground text-base font-bold">
                Detail Identitas Cabang Aktif
              </CardTitle>
              <CardDescription className="text-xs">
                Informasi ini akan tertera pada struk fisik dan pesan WhatsApp
                pelanggan
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Nama Usaha / Cabang
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 rounded-xl text-xs"
                  />
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
                    rows={3}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Nomor Telepon / WhatsApp
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
                    <Label htmlFor="slug" className="text-xs font-semibold">
                      Slug Identitas URL
                    </Label>
                    <Input
                      id="slug"
                      value={currentOutlet.slug}
                      disabled
                      className="bg-muted text-muted-foreground h-10 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl" className="text-xs font-semibold">
                    URL Logo Usaha (Opsional)
                  </Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="h-10 rounded-xl text-xs"
                  />
                </div>
              </CardContent>

              <CardFooter className="border-t pt-4">
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="h-10 gap-2 rounded-xl text-xs font-bold shadow-xs"
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {isUpdating ? "Menyimpan..." : "Simpan Perubahan Cabang"}
                  </span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* Tab 2: Daftar Seluruh Cabang (Multi-Outlet) */}
        <TabsContent value="branches">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
