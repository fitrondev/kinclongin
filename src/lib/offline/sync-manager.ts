"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { toast } from "sonner";

import { type LocalTicket, type OfflineMutation, localDb } from "./db";

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors?: string[];
}

/**
 * Memproses seluruh antrean mutasi offline di Dexie IndexedDB
 * dan mengirimkannya ke endpoint server /api/sync/offline.
 */
export async function processSyncQueue(): Promise<SyncResult> {
  if (typeof window === "undefined") {
    return { success: false, processedCount: 0, failedCount: 0 };
  }

  if (!navigator.onLine) {
    return { success: false, processedCount: 0, failedCount: 0 };
  }

  const pendingItems = await localDb.syncQueue.orderBy("createdAt").toArray();
  if (pendingItems.length === 0) {
    return { success: true, processedCount: 0, failedCount: 0 };
  }

  const toastId = toast.loading(
    `Menyinkronkan ${pendingItems.length} transaksi tertunda ke cloud...`
  );

  try {
    const response = await fetch("/api/sync/offline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mutations: pendingItems }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData.error || "Gagal menghubungi server sinkronisasi."
      );
    }

    const data: {
      success: boolean;
      results: Array<{
        mutationId?: number;
        entityId: string;
        serverId?: string;
        ticketNumber?: string;
        success: boolean;
        error?: string;
      }>;
    } = await response.json();

    let processedCount = 0;
    let failedCount = 0;

    for (const res of data.results) {
      if (res.success) {
        processedCount++;
        // 1. Update tiket lokal dengan serverId resmi
        if (res.serverId) {
          const localTicket = await localDb.tickets.get(res.entityId);
          if (localTicket) {
            await localDb.tickets.update(res.entityId, {
              serverId: res.serverId,
              ticketNumber: res.ticketNumber || localTicket.ticketNumber,
              syncStatus: "SYNCED",
              updatedAt: Date.now(),
            });
          }
        }

        // 2. Hapus mutasi yang telah sukses dari antrean
        if (res.mutationId) {
          await localDb.syncQueue.delete(res.mutationId);
        }
      } else {
        failedCount++;
        if (res.mutationId) {
          const item = await localDb.syncQueue.get(res.mutationId);
          if (item) {
            await localDb.syncQueue.update(res.mutationId, {
              retryCount: item.retryCount + 1,
              lastError: res.error,
            });
          }
        }
      }
    }

    if (failedCount === 0) {
      toast.success(
        `Sukses! ${processedCount} data offline berhasil disinkronkan.`,
        { id: toastId }
      );
    } else {
      toast.warning(
        `${processedCount} berhasil, ${failedCount} gagal disinkronkan.`,
        { id: toastId }
      );
    }

    return { success: failedCount === 0, processedCount, failedCount };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan koneksi.";
    toast.error(`Sinkronisasi tertunda: ${message}`, { id: toastId });
    return {
      success: false,
      processedCount: 0,
      failedCount: pendingItems.length,
      errors: [message],
    };
  }
}

/**
 * Menyimpan tiket baru secara optimis saat perangkat offline.
 */
export async function saveOfflineTicket(input: {
  outletId: string;
  licensePlate: string;
  vehicleCategory: string;
  servicePackageId: string;
  servicePackageName: string;
  servicePrice: number;
  customerName?: string;
  customerPhone?: string;
  initialNotes?: string;
  inspectionPhotos?: string[];
  brand?: string;
  model?: string;
  color?: string;
}): Promise<LocalTicket> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const timeStr = new Date()
    .toTimeString()
    .split(" ")[0]
    .replace(/:/g, "")
    .slice(0, 4);
  const ticketNumber = `OFF-${timeStr}-${Math.floor(100 + Math.random() * 900)}`;

  const newTicket: LocalTicket = {
    localId,
    ticketNumber,
    outletId: input.outletId,
    licensePlate: input.licensePlate.trim().toUpperCase(),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    vehicleCategory: input.vehicleCategory,
    servicePackageId: input.servicePackageId,
    servicePackageName: input.servicePackageName,
    servicePrice: input.servicePrice,
    initialNotes: input.initialNotes,
    inspectionPhotos: input.inspectionPhotos,
    brand: input.brand,
    model: input.model,
    color: input.color,
    status: "QUEUED",
    totalAmount: input.servicePrice,
    paymentStatus: "UNPAID",
    syncStatus: "PENDING_CREATE",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Simpan ke tabel tiket lokal
  await localDb.tickets.put(newTicket);

  // Masukkan ke antrean sinkronisasi
  const mutation: OfflineMutation = {
    mutationType: "CREATE_TICKET",
    entityId: localId,
    payload: {
      localId,
      ticketNumber,
      outletId: input.outletId,
      licensePlate: input.licensePlate,
      vehicleCategory: input.vehicleCategory,
      servicePackageId: input.servicePackageId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      initialNotes: input.initialNotes,
      inspectionPhotos: input.inspectionPhotos,
      brand: input.brand,
      model: input.model,
      color: input.color,
    },
    createdAt: Date.now(),
    retryCount: 0,
  };

  await localDb.syncQueue.add(mutation);

  return newTicket;
}

/**
 * Cache master data di browser untuk penggunaan offline
 */
export async function cacheMasterData(
  key: string,
  data: unknown
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await localDb.masterCache.put({
      key,
      data,
      cachedAt: Date.now(),
    });
  } catch (e) {
    console.error("Gagal menyimpan cache master data:", e);
  }
}

/**
 * Mengambil master data dari cache browser
 */
export async function getCachedMasterData<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null;
  try {
    const item = await localDb.masterCache.get(key);
    return item ? (item.data as T) : null;
  } catch (e) {
    console.error("Gagal membaca cache master data:", e);
    return null;
  }
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

/**
 * Hook reaktif untuk memantau status jaringan dan jumlah antrean sync
 */
export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshPendingCount = async () => {
      try {
        const count = await localDb.syncQueue.count();
        setPendingCount(count);
      } catch {
        // Abaikan jika database belum siap
      }
    };

    refreshPendingCount();

    const handleOnline = async () => {
      toast.info("Koneksi online kembali! Memulai sinkronisasi otomatis...");
      setIsSyncing(true);
      await processSyncQueue();
      await refreshPendingCount();
      setIsSyncing(false);
    };

    const handleOffline = () => {
      toast.warning(
        "Koneksi terputus. Mode luring aktif — data tersimpan di peramban.",
        { duration: 4000 }
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Interval cek jumlah antrean lokal setiap 10 detik
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!isOnline) {
      toast.error("Tidak dapat sinkronisasi: Perangkat sedang offline.");
      return;
    }
    setIsSyncing(true);
    await processSyncQueue();
    const count = await localDb.syncQueue.count();
    setPendingCount(count);
    setIsSyncing(false);
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  };
}
