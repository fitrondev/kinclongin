import { Minus, Plus, ShoppingBag } from "lucide-react";

import { formatRupiah } from "@/lib/formatters";

import type { RetailProductItem } from "../checkout-view";

export interface CheckoutRetailUpsellProps {
  retailProducts: RetailProductItem[];
  cart: Record<string, number>;
  onUpdateQty: (productId: string, delta: number) => void;
}

export function CheckoutRetailUpsell({
  retailProducts,
  cart,
  onUpdateQty,
}: CheckoutRetailUpsellProps) {
  if (retailProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Tambah Produk Ritel (Minuman / Parfum / Lap)</span>
        </label>
        <span className="text-muted-foreground text-xs">
          {retailProducts.length} Produk Tersedia
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {retailProducts.map((p) => {
          const qty = cart[p.id] || 0;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${
                qty > 0
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:bg-muted/40"
              }`}
            >
              <div className="truncate">
                <h4 className="text-foreground truncate text-xs font-bold sm:text-sm">
                  {p.name}
                </h4>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className="text-primary font-extrabold">
                    {formatRupiah(p.sellingPrice)}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    Stok: {p.stock}
                  </span>
                </div>
              </div>

              {/* Selector Qty */}
              <div className="flex shrink-0 items-center gap-1.5">
                {qty > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(p.id, -1)}
                      className="bg-muted text-foreground hover:bg-muted/80 flex h-8 w-8 items-center justify-center rounded-lg active:scale-90"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {qty}
                    </span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => onUpdateQty(p.id, 1)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-8 w-8 items-center justify-center rounded-lg active:scale-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
