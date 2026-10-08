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

export interface OfflinePayment {
  localPaymentId: string;
  ticketId: string; // localId atau serverId tiket
  amount: number;
  paymentMethod: "CASH" | "QRIS" | "BANK_TRANSFER";
  cashGiven?: number;
  changeGiven?: number;
  referenceNumber?: string;
  paidAt: number;
  syncStatus: "PENDING_SYNC" | "SYNCED";
}

export interface CachedService {
  id: string;
  outletId: string;
  name: string;
  vehicleCategory: string;
  price: number;
  estimatedMinutes: number;
}

export interface CachedCustomer {
  phone: string;
  fullName: string;
  totalVisits: number;
  loyaltyPoints: number;
  lastVisitAt?: number;
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
  offlinePayments!: Table<OfflinePayment, string>;
  cachedServices!: Table<CachedService, string>;
  cachedCustomers!: Table<CachedCustomer, string>;
  syncQueue!: Table<OfflineMutation, number>;
  masterCache!: Table<CachedMasterData, string>;

  constructor() {
    super("KinclonginOfflineDB");
    this.version(1).stores({
      tickets: "localId, serverId, licensePlate, status, syncStatus, createdAt",
      syncQueue: "++id, mutationType, entityId, createdAt, retryCount",
      masterCache: "key, cachedAt",
    });
    this.version(2).stores({
      tickets: "localId, serverId, licensePlate, status, syncStatus, createdAt",
      offlinePayments: "localPaymentId, ticketId, syncStatus, paidAt",
      cachedServices: "id, outletId, vehicleCategory",
      cachedCustomers: "phone, fullName",
      syncQueue: "++id, mutationType, entityId, createdAt, retryCount",
      masterCache: "key, cachedAt",
    });
  }

  // Alias getter untuk kompatibilitas nama tabel Task 7.2
  get offlineTickets(): Table<LocalTicket, string> {
    return this.tickets;
  }
}

// Singleton browser IndexedDB
export const localDb = new KinclonginOfflineDb();
