import Dexie, { type Table } from "dexie";

export interface LocalTicket {
  localId: string; // UUID v4 lokal jika dibuat saat offline
  serverId?: string; // CUID dari server MySQL jika sudah sinkron
  ticketNumber: string;
  outletId: string;
  licensePlate: string;
  customerName?: string;
  customerPhone?: string;
  vehicleCategory: string;
  servicePackageId: string;
  servicePackageName: string;
  servicePrice: number;
  initialNotes?: string;
  inspectionPhotos?: string[];
  brand?: string;
  model?: string;
  color?: string;
  status: "QUEUED" | "WASHING" | "DRYING" | "READY" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  paymentStatus: "UNPAID" | "PAID";
  syncStatus: "SYNCED" | "PENDING_CREATE" | "PENDING_UPDATE";
  createdAt: number; // Epoch timestamp
  updatedAt: number;
}

export interface OfflineMutation {
  id?: number;
  mutationType: "CREATE_TICKET" | "UPDATE_STATUS" | "PROCESS_PAYMENT";
  entityId: string; // localId atau serverId
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface CachedMasterData {
  key: string; // "services", "products", "washers", "outlet"
  data: unknown;
  cachedAt: number;
}

export class KinclonginOfflineDb extends Dexie {
  tickets!: Table<LocalTicket, string>;
  syncQueue!: Table<OfflineMutation, number>;
  masterCache!: Table<CachedMasterData, string>;

  constructor() {
    super("KinclonginOfflineDB");
    this.version(1).stores({
      tickets: "localId, serverId, licensePlate, status, syncStatus, createdAt",
      syncQueue: "++id, mutationType, entityId, createdAt, retryCount",
      masterCache: "key, cachedAt",
    });
  }
}

// Singleton browser IndexedDB
export const localDb = new KinclonginOfflineDb();
