"use client";

import { useEffect, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import {
  Building2,
  Check,
  ChevronsUpDown,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  createOutletAction,
  getUserOutletsAction,
  switchActiveOutletAction,
} from "@/actions/org";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OutletItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  isActive: boolean;
  subscriptionStatus: string;
  isCurrent: boolean;
}

interface OrganizationSwitcherProps {
  hidePersonal?: boolean;
  afterSelectOrganizationUrl?: string;
  afterCreateOrganizationUrl?: string;
  appearance?: {
    elements?: {
      rootBox?: string;
      organizationSwitcherTrigger?: string;
    };
  };
}

export function OutletSwitcher({
  afterSelectOrganizationUrl,
  appearance,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [outlets, setOutlets] = useState<OutletItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Dialog State untuk Cabang Baru
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [newOutletPhone, setNewOutletPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOutlets = async () => {
    try {
      const res = await getUserOutletsAction();
      if (res.success && res.data) {
        setOutlets(res.data);
      }
    } catch (e) {
      console.error("Gagal memuat outlet:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    getUserOutletsAction()
      .then((res) => {
        if (!ignore && res.success && res.data) {
          setOutlets(res.data);
        }
      })
      .catch((e) => {
        console.error("Gagal memuat outlet:", e);
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const currentOutlet = outlets.find((o) => o.isCurrent) || outlets[0];

  const handleSwitchOutlet = (outletId: string) => {
    startTransition(async () => {
      const res = await switchActiveOutletAction(outletId);
      if (res.success) {
        toast.success("Berhasil beralih cabang outlet.");
        await fetchOutlets();
        if (afterSelectOrganizationUrl) {
          router.push(afterSelectOrganizationUrl);
        } else {
          router.refresh();
        }
      } else {
        toast.error(res.error || "Gagal beralih cabang.");
      }
    });
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim() || !newOutletAddress.trim()) {
      toast.error("Nama dan alamat cabang wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOutletAction({
        name: newOutletName,
        address: newOutletAddress,
        phone: newOutletPhone || "-",
      });

      if (res.success) {
        toast.success("Cabang outlet baru berhasil dibuat!");
        setIsDialogOpen(false);
        setNewOutletName("");
        setNewOutletAddress("");
        setNewOutletPhone("");
        await fetchOutlets();
        router.refresh();
      } else {
        toast.error(res.error || "Gagal membuat cabang baru.");
      }
    } catch {
      toast.error("Terjadi kesalahan saat membuat cabang.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-muted/50 h-8 w-36 animate-pulse rounded-lg border" />
    );
  }

  return (
    <>
      <div className={appearance?.elements?.rootBox || "flex items-center"}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isPending}
              className={`flex items-center justify-between transition-colors focus:outline-hidden ${
                appearance?.elements?.organizationSwitcherTrigger ||
                "bg-muted/40 hover:bg-muted gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="text-primary h-3.5 w-3.5 shrink-0" />
                <span className="max-w-32.5 truncate sm:max-w-45">
                  {currentOutlet?.name || "Pilih Cabang"}
                </span>
              </div>
              <ChevronsUpDown className="text-muted-foreground ml-1 h-3 w-3 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64 p-1">
            <DropdownMenuLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
              Daftar Cabang Outlet
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              {outlets.map((outlet) => {
                const isSelected = outlet.isCurrent;
                return (
                  <DropdownMenuItem
                    key={outlet.id}
                    onClick={() => handleSwitchOutlet(outlet.id)}
                    className="flex cursor-pointer items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="truncate text-xs leading-tight font-bold">
                          {outlet.name}
                        </span>
                        <span className="text-muted-foreground truncate text-[10px]">
                          {outlet.address}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="text-primary ml-2 h-4 w-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => setIsDialogOpen(true)}
              className="text-primary cursor-pointer gap-2 font-bold"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Tambah Cabang Baru</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal Dialog Tambah Cabang Baru */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Sparkles className="text-primary h-5 w-5" />
              Buka Cabang Outlet Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan cabang cuci mobil / motor baru Anda. Setiap cabang
              mendapatkan masa uji coba gratis 14 hari.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOutlet} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="branchName" className="text-xs font-bold">
                Nama Cabang Outlet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branchName"
                placeholder="misal: Kinclongin Cabang Cakranegara"
                value={newOutletName}
                onChange={(e) => setNewOutletName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchAddress" className="text-xs font-bold">
                Alamat Lokasi Cabang <span className="text-destructive">*</span>
              </Label>
              <Input
                id="branchAddress"
                placeholder="Jl. Pejanggik No. 88, Mataram"
                value={newOutletAddress}
                onChange={(e) => setNewOutletAddress(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchPhone" className="text-xs font-bold">
                Nomor Telepon / WhatsApp Cabang
              </Label>
              <Input
                id="branchPhone"
                placeholder="081912345678"
                value={newOutletPhone}
                onChange={(e) => setNewOutletPhone(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="border-primary/20 bg-primary/5 text-muted-foreground rounded-xl border p-3 text-xs">
              Tarif langganan cabang flat{" "}
              <strong className="text-foreground">Rp 50.000 / bulan</strong>{" "}
              setelah masa uji coba 14 hari berakhir.
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-bold"
              >
                {isSubmitting ? "Menyimpan..." : "Buat Cabang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Ekspor juga dengan nama OrganizationSwitcher agar backward-compatible
export const OrganizationSwitcher = OutletSwitcher;
