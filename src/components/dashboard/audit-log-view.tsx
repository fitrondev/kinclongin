"use client";

import { useState } from "react";

import {
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Eye,
  Filter,
  History,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import type { AuditLogItem } from "@/actions/owner";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditLogViewProps {
  initialLogs: AuditLogItem[];
  outletName: string;
}

export function AuditLogView({ initialLogs, outletName }: AuditLogViewProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMetadataLog, setActiveMetadataLog] =
    useState<AuditLogItem | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== "ALL" && log.action !== selectedAction) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    if (
      action.includes("CANCEL") ||
      action.includes("DELETE") ||
      action.includes("VOID")
    ) {
      return (
        <Badge variant="destructive" className="text-[10px] font-bold">
          {action}
        </Badge>
      );
    }
    if (action.includes("UPDATE") || action.includes("CHANGE")) {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600"
        >
          {action}
        </Badge>
      );
    }
    if (
      action.includes("CREATE") ||
      action.includes("PAID") ||
      action.includes("RESTOCK")
    ) {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-600"
        >
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-[10px] font-bold">
        {action}
      </Badge>
    );
  };

  const exportCSV = () => {
    const headers = [
      "ID",
      "Waktu",
      "Aktor",
      "Email",
      "Role",
      "Aksi",
      "Entitas",
      "Entity ID",
      "IP Address",
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.createdAt).toLocaleString("id-ID"),
      `"${l.actorName}"`,
      l.actorEmail,
      l.actorRole,
      l.action,
      l.entityType,
      l.entityId,
      l.ipAddress || "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Audit Log berhasil diekspor ke CSV!");
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-foreground flex flex-wrap items-center gap-2 text-xl font-black tracking-tight sm:text-2xl">
              <History className="text-primary h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span>Audit Log & Jejak Keamanan Sistem</span>
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
            Rekaman aktivitas administratif dan mutasi data sensitif di{" "}
            {outletName}.
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            onClick={exportCSV}
            variant="outline"
            className="h-10 w-full gap-2 rounded-xl text-xs font-bold shadow-xs sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-col gap-4 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-foreground text-base font-bold">
              Riwayat Jejak Audit ({filteredLogs.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Mencatat waktu, aktor, aksi, IP address, dan metadata mutasi
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
              <Input
                placeholder="Cari aktor / aksi / ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full rounded-xl pl-9 text-xs"
              />
            </div>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="border-input bg-background h-9 w-full rounded-xl border px-3 text-xs font-semibold sm:w-auto"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="WHATSAPP_CONFIG_UPDATE">
                WHATSAPP_CONFIG_UPDATE
              </option>
              <option value="OUTLET_PROFILE_UPDATE">
                OUTLET_PROFILE_UPDATE
              </option>
              <option value="USER_ROLE_UPDATE">USER_ROLE_UPDATE</option>
              <option value="COMMISSION_PAID">COMMISSION_PAID</option>
              <option value="TICKET_CANCELLED">TICKET_CANCELLED</option>
              <option value="STOCK_RESTOCK">STOCK_RESTOCK</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-xs">
              Belum ada rekaman audit log yang sesuai dengan filter pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36 text-xs font-bold">
                      Waktu
                    </TableHead>
                    <TableHead className="text-xs font-bold">Aktor</TableHead>
                    <TableHead className="text-xs font-bold">Aksi</TableHead>
                    <TableHead className="text-xs font-bold">Entitas</TableHead>
                    <TableHead className="text-xs font-bold">
                      IP & Perangkat
                    </TableHead>
                    <TableHead className="text-right text-xs font-bold">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-foreground text-xs font-bold">
                            {log.actorName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Badge
                              variant="secondary"
                              className="px-1 py-0 text-[9px] font-bold"
                            >
                              {log.actorRole}
                            </Badge>
                            <span className="text-muted-foreground">
                              {log.actorEmail}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">
                          <span className="text-foreground font-bold">
                            {log.entityType}
                          </span>
                          <span className="text-muted-foreground block max-w-32 truncate text-[10px]">
                            {log.entityId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <span className="block font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {log.ipAddress || "127.0.0.1"}
                        </span>
                        <span className="text-muted-foreground block max-w-44 truncate text-[10px]">
                          {log.userAgent || "Browser Client"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveMetadataLog(log)}
                          className="h-8 gap-1 rounded-lg px-2 text-xs font-semibold"
                          title="Lihat Metadata"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Detail</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Detail Metadata JSON */}
      <Dialog
        open={Boolean(activeMetadataLog)}
        onOpenChange={(open) => !open && setActiveMetadataLog(null)}
      >
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base font-bold">
              Detail Log Aktivitas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Aksi <strong>{activeMetadataLog?.action}</strong> oleh{" "}
              {activeMetadataLog?.actorName} ({activeMetadataLog?.actorRole})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div className="bg-muted/40 grid grid-cols-2 gap-2 rounded-xl border p-3">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Waktu:
                </span>
                <span className="font-semibold">
                  {activeMetadataLog?.createdAt &&
                    new Date(activeMetadataLog.createdAt).toLocaleString(
                      "id-ID"
                    )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  IP Address:
                </span>
                <span className="font-mono font-semibold">
                  {activeMetadataLog?.ipAddress || "Internal"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Entitas:
                </span>
                <span className="font-semibold">
                  {activeMetadataLog?.entityType} ({activeMetadataLog?.entityId}
                  )
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  User Agent:
                </span>
                <span className="block truncate font-mono text-[10px]">
                  {activeMetadataLog?.userAgent || "-"}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground block text-xs font-bold">
                Payload / Metadata JSON:
              </span>
              <pre className="max-h-60 overflow-auto rounded-xl border bg-slate-950 p-3 font-mono text-[11px] text-emerald-400">
                {JSON.stringify(activeMetadataLog?.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
