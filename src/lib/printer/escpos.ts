export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface ReceiptData {
  outletName: string;
  outletAddress: string;
  outletPhone: string;
  slogan?: string | null;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  contactPhone?: string | null;
  ticketNumber: string;
  dateStr: string;
  cashierName: string;
  washerNames?: string;
  licensePlate: string;
  vehicleModel?: string;
  serviceName: string;
  servicePrice: number;
  retailItems?: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  cashGiven?: number;
  changeGiven?: number;
  customerName?: string;
  loyaltyPoints?: number;
  promoName?: string;
  taxAmount?: number;
  taxLabel?: string;
  taxType?: "INCLUSIVE" | "EXCLUSIVE";
  surchargeAmount?: number;
  surchargeLabel?: string;
}

/**
 * Menghasilkan teks struk monospace yang terformat rapi untuk 58mm (32 karakter per baris)
 */
export function generatePlainTextReceipt(
  data: ReceiptData,
  width = 32
): string {
  const pad = (text: string, len: number) =>
    text.padEnd(len, " ").slice(0, len);
  const line = "=".repeat(width);
  const dash = "-".repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.slice(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return " ".repeat(leftPad) + text;
  };

  const row = (left: string, right: string) => {
    const rightLen = right.length;
    const leftLen = width - rightLen - 1;
    return `${pad(left, leftLen)} ${right}`;
  };

  const formatRp = (num: number) => `Rp ${num.toLocaleString("id-ID")}`;

  const lines: string[] = [];

  // Header
  lines.push(line);
  lines.push(center(data.outletName.toUpperCase()));
  if (data.slogan) {
    lines.push(center(`"${data.slogan}"`));
  }
  if (data.receiptHeader) {
    lines.push(center(data.receiptHeader));
  }
  lines.push(center(data.outletAddress));
  lines.push(center(`Telp: ${data.contactPhone || data.outletPhone}`));
  lines.push(line);

  // Metadata
  lines.push(row("No. Tiket", `#${data.ticketNumber}`));
  lines.push(row("Waktu", data.dateStr));
  lines.push(row("Kasir", data.cashierName));
  if (data.washerNames) {
    lines.push(row("Washer", data.washerNames));
  }
  lines.push(
    row(
      "Kendaraan",
      `${data.licensePlate} ${data.vehicleModel ? `(${data.vehicleModel})` : ""}`
    )
  );
  if (data.customerName) {
    lines.push(row("Pelanggan", data.customerName));
  }
  lines.push(dash);

  // Layanan Utama
  lines.push(row(`1x ${data.serviceName}`, formatRp(data.servicePrice)));

  // Item Ritel jika ada
  if (data.retailItems && data.retailItems.length > 0) {
    for (const item of data.retailItems) {
      lines.push(row(`${item.qty}x ${item.name}`, formatRp(item.subtotal)));
    }
  }

  lines.push(dash);

  // Rincian Pembayaran
  lines.push(row("Subtotal", formatRp(data.subtotal)));
  if (data.discount > 0) {
    const discountLabel = data.promoName
      ? `Diskon (${data.promoName})`
      : "Diskon";
    lines.push(row(discountLabel, `-${formatRp(data.discount)}`));
  }
  if (data.surchargeAmount && data.surchargeAmount > 0) {
    lines.push(
      row(
        data.surchargeLabel || "Biaya QRIS",
        `+${formatRp(data.surchargeAmount)}`
      )
    );
  }
  if (data.taxAmount && data.taxAmount > 0 && data.taxType !== "INCLUSIVE") {
    lines.push(
      row(data.taxLabel || "Pajak (PB1)", `+${formatRp(data.taxAmount)}`)
    );
  }
  lines.push(row("TOTAL", formatRp(data.total)));
  if (data.taxAmount && data.taxAmount > 0 && data.taxType === "INCLUSIVE") {
    lines.push(
      row(`*Termasuk ${data.taxLabel || "PB1"}`, formatRp(data.taxAmount))
    );
  }
  lines.push(
    row(`BAYAR (${data.paymentMethod})`, formatRp(data.cashGiven ?? data.total))
  );
  if (data.changeGiven != null && data.changeGiven > 0) {
    lines.push(row("KEMBALIAN", formatRp(data.changeGiven)));
  }

  // Loyalty Points
  if (data.loyaltyPoints != null) {
    lines.push(dash);
    lines.push(center(`Poin Loyalty Anda: ${data.loyaltyPoints} Poin`));
  }

  // Footer
  lines.push(line);
  if (data.receiptFooter) {
    lines.push(center(data.receiptFooter));
  } else {
    lines.push(center("TERIMA KASIH ATAS KUNJUNGAN ANDA!"));
    lines.push(center("KENDARAAN BERSIH & KINCLONG!"));
  }
  if (data.contactPhone && !data.receiptFooter?.includes(data.contactPhone)) {
    lines.push(center(`CS: ${data.contactPhone}`));
  }
  lines.push(line);

  return lines.join("\n");
}

/**
 * Perintah ESC/POS Drawer Kick Pulse (RJ11)
 * Standard: ESC p m t1 t2 -> 0x1B, 0x70, 0x00, 0x19, 0xFA
 * Mengalirkan pulsa 24V ke solenoid laci kasir pin 2 agar terbuka otomatis
 */
export const ESC_DRAWER_KICK = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);

/**
 * Menghasilkan byte command tunggal untuk membuka laci kasir
 */
export function buildDrawerKickCommand(): Uint8Array {
  const init = new Uint8Array([0x1b, 0x40]);
  const combined = new Uint8Array(init.length + ESC_DRAWER_KICK.length);
  combined.set(init, 0);
  combined.set(ESC_DRAWER_KICK, init.length);
  return combined;
}

/**
 * Mengubah string teks menjadi array bytes ESC/POS untuk printer thermal
 */
export function buildEscPosCommands(
  receiptText: string,
  kickDrawer = false
): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(receiptText + "\n\n\n\n");

  // Inisialisasi printer: ESC @ (0x1B, 0x40)
  // Potong kertas: GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
  const init = new Uint8Array([0x1b, 0x40]);
  const cut = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

  const kickBytes = kickDrawer ? ESC_DRAWER_KICK : new Uint8Array(0);
  const totalLength =
    init.length + kickBytes.length + textBytes.length + cut.length;

  const combined = new Uint8Array(totalLength);
  let offset = 0;

  combined.set(init, offset);
  offset += init.length;

  if (kickDrawer) {
    combined.set(kickBytes, offset);
    offset += kickBytes.length;
  }

  combined.set(textBytes, offset);
  offset += textBytes.length;

  combined.set(cut, offset);

  return combined;
}

export interface VoidReceiptData {
  outletName: string;
  ticketNumber: string;
  licensePlate: string;
  serviceName: string;
  totalAmount: number;
  cashierName: string;
  managerName: string;
  voidReason: string;
  voidReasonNotes?: string | null;
  voidedAt: string;
}

/**
 * Menghasilkan teks struk thermal saat tiket dibatalkan (VOID)
 */
export function buildVoidReceipt(data: VoidReceiptData, width = 32): string {
  const pad = (text: string, len: number) =>
    text.padEnd(len, " ").slice(0, len);
  const line = "=".repeat(width);
  const dash = "-".repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.slice(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return " ".repeat(leftPad) + text;
  };

  const row = (left: string, right: string) => {
    const rightLen = right.length;
    const leftLen = width - rightLen - 1;
    return `${pad(left, leftLen)} ${right}`;
  };

  const formatRp = (num: number) => `Rp ${num.toLocaleString("id-ID")}`;

  const lines: string[] = [
    line,
    center(data.outletName.toUpperCase()),
    center("*** TIKET DIBATALKAN (VOID) ***"),
    line,
    row("No. Tiket", data.ticketNumber),
    row("Plat Nomor", data.licensePlate),
    row("Layanan", data.serviceName),
    row("Nilai Transaksi", formatRp(data.totalAmount)),
    dash,
    row("Kasir", data.cashierName),
    row("Otorisasi", data.managerName),
    row(
      "Waktu Batal",
      new Date(data.voidedAt).toLocaleString("id-ID", {
        dateStyle: "short",
        timeStyle: "short",
      })
    ),
    dash,
    row("Alasan Void", data.voidReason),
  ];

  if (data.voidReasonNotes) {
    lines.push(row("Catatan", data.voidReasonNotes));
  }

  lines.push(line);
  lines.push(center("DOKUMEN AUDIT PEMBATALAN"));
  lines.push(line);

  return lines.join("\n");
}

export interface ShiftZReportData {
  outletName: string;
  cashierName: string;
  shiftName: string;
  closedAt: string;
  transactionsCount: number;
  openingAmount: number;
  cashPayments: number;
  paidInAmount?: number;
  paidOutAmount?: number;
  expectedDrawerCash: number;
  physicalCashCounted: number;
  discrepancy: number;
  discrepancyStatus: "BALANCED" | "SURPLUS" | "DEFICIT";
  discrepancyReason?: string;
  qrisPayments: number;
  transferPayments: number;
  nonCashPayments: number;
  totalRevenue: number;
  denominations?: Record<string, number>;
}

/**
 * Menghasilkan teks struk thermal Z-Report (Tutup Shift Kasir)
 */
export function buildZReportReceipt(
  data: ShiftZReportData,
  width = 32
): string {
  const pad = (text: string, len: number) =>
    text.padEnd(len, " ").slice(0, len);
  const line = "=".repeat(width);
  const dash = "-".repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.slice(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return " ".repeat(leftPad) + text;
  };

  const row = (left: string, right: string) => {
    const rightLen = right.length;
    const leftLen = width - rightLen - 1;
    return `${pad(left, leftLen)} ${right}`;
  };

  const formatRp = (num: number) => `Rp ${num.toLocaleString("id-ID")}`;

  const dateStr = new Date(data.closedAt).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines: string[] = [
    line,
    center(data.outletName.toUpperCase()),
    center("LAPORAN Z-REPORT (TUTUP SHIFT)"),
    line,
    row("Kasir", data.cashierName),
    row("Shift", data.shiftName),
    row("Waktu Tutup", dateStr),
    row("Total Transaksi", `${data.transactionsCount} Struk`),
    dash,
    row("1. Modal Awal", formatRp(data.openingAmount)),
    row("2. Penerimaan Tunai", formatRp(data.cashPayments)),
  ];

  if (data.paidInAmount && data.paidInAmount > 0) {
    lines.push(row("3. Kas Masuk (In)", formatRp(data.paidInAmount)));
  }
  if (data.paidOutAmount && data.paidOutAmount > 0) {
    lines.push(row("4. Kas Keluar (Out)", `-${formatRp(data.paidOutAmount)}`));
  }

  lines.push(dash);
  lines.push(row("Kas Fisik Seharusnya", formatRp(data.expectedDrawerCash)));
  lines.push(row("Kas Fisik Terhitung", formatRp(data.physicalCashCounted)));

  const selisihLabel =
    data.discrepancy === 0
      ? "SEIMBANG (0)"
      : data.discrepancy > 0
        ? `LEBIH (+${formatRp(data.discrepancy)})`
        : `KURANG (${formatRp(data.discrepancy)})`;

  lines.push(row("STATUS SELISIH", selisihLabel));

  if (data.discrepancyReason) {
    lines.push(row("Ket. Selisih", data.discrepancyReason));
  }

  if (data.denominations && Object.keys(data.denominations).length > 0) {
    lines.push(dash);
    lines.push(center("PECAHAN UANG LEMBARAN FISIK"));
    const d = data.denominations;
    const addDenom = (keys: string[], label: string, mult: number) => {
      let count = 0;
      for (const k of keys) {
        if (typeof d[k] === "number" && d[k] > 0) count += d[k];
      }
      if (count > 0) {
        lines.push(row(`${label} x ${count}`, formatRp(count * mult)));
      }
    };

    addDenom(["100000", "100k"], "Rp 100.000", 100000);
    addDenom(["50000", "50k"], "Rp  50.000", 50000);
    addDenom(["20000", "20k"], "Rp  20.000", 20000);
    addDenom(["10000", "10k"], "Rp  10.000", 10000);
    addDenom(["5000", "5k"], "Rp   5.000", 5000);
    addDenom(["2000", "2k"], "Rp   2.000", 2000);
    addDenom(["1000", "1k"], "Rp   1.000", 1000);
    addDenom(["coin", "coins"], "Koin/Receh", 1000);
  }

  lines.push(dash);
  lines.push(row("Penerimaan QRIS", formatRp(data.qrisPayments)));
  lines.push(row("Penerimaan Transfer", formatRp(data.transferPayments)));
  lines.push(row("Total Non-Tunai", formatRp(data.nonCashPayments)));
  lines.push(line);
  lines.push(row("TOTAL OMSET SHIFT", formatRp(data.totalRevenue)));
  lines.push(line);
  lines.push("");
  lines.push(row("Kasir Bertugas", "Supervisor/Owner"));
  lines.push("");
  lines.push("");
  lines.push(row(`(${data.cashierName})`, "(..................)"));
  lines.push(line);

  return lines.join("\n");
}

export interface ShiftXReportData {
  outletName: string;
  cashierName: string;
  shiftName: string;
  printedAt: string;
  transactionsCount: number;
  openingAmount: number;
  cashPayments: number;
  paidInAmount?: number;
  paidOutAmount?: number;
  expectedDrawerCash: number;
  qrisPayments: number;
  transferPayments: number;
  nonCashPayments: number;
  totalRevenue: number;
}

/**
 * Menghasilkan teks struk thermal X-Report (Audit Kas Berjalan / Mid-Shift)
 * Berfungsi untuk cek kas sementara di tengah shift tanpa menutup atau mereset data
 */
export function buildXReportReceipt(
  data: ShiftXReportData,
  width = 32
): string {
  const pad = (text: string, len: number) =>
    text.padEnd(len, " ").slice(0, len);
  const line = "=".repeat(width);
  const dash = "-".repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.slice(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return " ".repeat(leftPad) + text;
  };

  const row = (left: string, right: string) => {
    const rightLen = right.length;
    const leftLen = width - rightLen - 1;
    return `${pad(left, leftLen)} ${right}`;
  };

  const formatRp = (num: number) => `Rp ${num.toLocaleString("id-ID")}`;

  const dateStr = new Date(data.printedAt).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const lines: string[] = [
    line,
    center(data.outletName.toUpperCase()),
    center("LAPORAN X-REPORT (MID-SHIFT)"),
    center("*** SEMENTARA - SHIFT AKTIF ***"),
    line,
    row("Kasir", data.cashierName),
    row("Shift", data.shiftName),
    row("Waktu Cetak", dateStr),
    row("Total Transaksi", `${data.transactionsCount} Struk`),
    dash,
    row("1. Modal Awal", formatRp(data.openingAmount)),
    row("2. Penjualan Tunai", formatRp(data.cashPayments)),
  ];

  if (data.paidInAmount && data.paidInAmount > 0) {
    lines.push(row("3. Kas Masuk (In)", formatRp(data.paidInAmount)));
  }
  if (data.paidOutAmount && data.paidOutAmount > 0) {
    lines.push(row("4. Kas Keluar (Out)", `-${formatRp(data.paidOutAmount)}`));
  }

  lines.push(dash);
  lines.push(row("Kas Fisik Seharusnya", formatRp(data.expectedDrawerCash)));
  lines.push(dash);
  lines.push(row("Penerimaan QRIS", formatRp(data.qrisPayments)));
  lines.push(row("Penerimaan Transfer", formatRp(data.transferPayments)));
  lines.push(row("Total Non-Tunai", formatRp(data.nonCashPayments)));
  lines.push(line);
  lines.push(row("TOTAL OMSET BERJALAN", formatRp(data.totalRevenue)));
  lines.push(line);
  lines.push(center("DOKUMEN AUDIT INTERIM"));
  lines.push(center("TIDAK MERESET DATA SHIFT"));
  lines.push(line);

  return lines.join("\n");
}

interface WebBluetoothDevice {
  gatt?: {
    connect: () => Promise<{
      getPrimaryService: (serviceUuid: string) => Promise<{
        getCharacteristic: (characteristicUuid: string) => Promise<{
          writeValue: (
            value: BufferSource | Uint8Array | Uint8Array<ArrayBufferLike>
          ) => Promise<void>;
        }>;
      }>;
    }>;
  };
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice: (options: {
      filters?: Array<{ services?: string[] }>;
      optionalServices?: string[];
      acceptAllDevices?: boolean;
    }) => Promise<WebBluetoothDevice>;
  };
}

/**
 * Mencetak langsung ke printer thermal Bluetooth menggunakan Web Bluetooth API
 */
export async function printReceiptViaBluetooth(
  data: ReceiptData,
  width = 32,
  kickDrawer = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as NavigatorWithBluetooth)
        : null;
    if (!nav?.bluetooth) {
      return {
        success: false,
        error:
          "Web Bluetooth API tidak didukung di browser ini. Gunakan Google Chrome atau Edge.",
      };
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });

    if (!device.gatt) {
      return {
        success: false,
        error: "GATT server printer Bluetooth tidak tersedia.",
      };
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(
      "000018f0-0000-1000-8000-00805f9b34fb"
    );
    const characteristic = await service.getCharacteristic(
      "00002af1-0000-1000-8000-00805f9b34fb"
    );

    const isCash = kickDrawer;

    const receiptText = generatePlainTextReceipt(data, width);
    const commands = buildEscPosCommands(receiptText, isCash);

    // Kirim chunk per 512 bytes untuk Bluetooth LE
    const chunkSize = 512;
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = commands.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal menghubungkan printer Bluetooth.";
    return { success: false, error: msg };
  }
}

/**
 * Mengirimkan sinyal RJ11 drawer kick pulse mandiri via printer Bluetooth
 */
export async function kickCashDrawerViaBluetooth(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as NavigatorWithBluetooth)
        : null;
    if (!nav?.bluetooth) {
      return {
        success: false,
        error: "Web Bluetooth API tidak didukung di browser ini.",
      };
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });

    if (!device.gatt) {
      return {
        success: false,
        error: "GATT printer Bluetooth tidak tersedia.",
      };
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(
      "000018f0-0000-1000-8000-00805f9b34fb"
    );
    const characteristic = await service.getCharacteristic(
      "00002af1-0000-1000-8000-00805f9b34fb"
    );

    const commands = buildDrawerKickCommand();
    await characteristic.writeValue(commands);

    return { success: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal membuka laci kasir via Bluetooth.";
    return { success: false, error: msg };
  }
}

/**
 * Mencetak teks sembarang (Z-Report, X-Report, Void Receipt) ke printer Bluetooth
 */
export async function printRawTextViaBluetooth(
  rawText: string,
  kickDrawer = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const nav =
      typeof navigator !== "undefined"
        ? (navigator as NavigatorWithBluetooth)
        : null;
    if (!nav?.bluetooth) {
      return {
        success: false,
        error: "Web Bluetooth API tidak didukung di browser ini.",
      };
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
    });

    if (!device.gatt) {
      return {
        success: false,
        error: "GATT printer Bluetooth tidak tersedia.",
      };
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(
      "000018f0-0000-1000-8000-00805f9b34fb"
    );
    const characteristic = await service.getCharacteristic(
      "00002af1-0000-1000-8000-00805f9b34fb"
    );

    const commands = buildEscPosCommands(rawText, kickDrawer);
    const chunkSize = 512;
    for (let i = 0; i < commands.length; i += chunkSize) {
      const chunk = commands.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : "Gagal mencetak struk teks via Bluetooth.";
    return { success: false, error: msg };
  }
}
