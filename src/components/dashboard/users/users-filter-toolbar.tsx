import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export interface UsersFilterToolbarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedRoleFilter: string;
  setSelectedRoleFilter: (val: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (val: string) => void;
}

export function UsersFilterToolbar({
  searchQuery,
  setSearchQuery,
  selectedRoleFilter,
  setSelectedRoleFilter,
  selectedStatusFilter,
  setSelectedStatusFilter,
}: UsersFilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      {/* Search Input */}
      <div className="relative w-full flex-1">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Cari berdasarkan nama staf, email, nomor HP, atau PIN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-card h-10 w-full pl-9 text-xs"
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {/* Role Filter Pills & Status Select */}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <div className="bg-muted/40 flex w-full flex-wrap items-center gap-1 rounded-xl border p-1 sm:w-auto">
          {[
            { id: "ALL", label: "Semua Role" },
            { id: "OWNER", label: "Owner" },
            { id: "MANAGER", label: "Manajer" },
            { id: "CASHIER", label: "Kasir" },
            { id: "WASHER", label: "Washer" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedRoleFilter(btn.id)}
              className={`flex-1 rounded-lg px-2.5 py-1 text-center text-xs font-bold transition-all sm:flex-none ${
                selectedRoleFilter === btn.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value)}
          className="bg-card border-border text-foreground h-10 w-full rounded-xl border px-3 text-xs font-bold focus:outline-hidden sm:w-auto"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Hanya Aktif</option>
          <option value="INACTIVE">Hanya Nonaktif</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </select>
      </div>
    </div>
  );
}
