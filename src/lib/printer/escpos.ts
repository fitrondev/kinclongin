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
  lines.push(center(data.outletAddress));
  lines.push(center(`Telp: ${data.outletPhone}`));
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
    lines.push(row("Diskon", `-${formatRp(data.discount)}`));
  }
  lines.push(row("TOTAL", formatRp(data.total)));
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
  lines.push(center("TERIMA KASIH ATAS KUNJUNGAN ANDA!"));
  lines.push(center("KENDARAAN BERSIH & KINCLONG!"));
  lines.push(line);

  return lines.join("\n");
}

/**
 * Mengubah string teks menjadi array bytes ESC/POS untuk printer thermal
 */
export function buildEscPosCommands(receiptText: string): Uint8Array {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(receiptText + "\n\n\n\n");

  // Inisialisasi printer: ESC @ (0x1B, 0x40)
  // Potong kertas: GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
  const init = new Uint8Array([0x1b, 0x40]);
  const cut = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

  const combined = new Uint8Array(init.length + textBytes.length + cut.length);
  combined.set(init, 0);
  combined.set(textBytes, init.length);
  combined.set(cut, init.length + textBytes.length);

  return combined;
}

interface WebBluetoothDevice {
  gatt?: {
    connect: () => Promise<{
      getPrimaryService: (serviceUuid: string) => Promise<{
        getCharacteristic: (characteristicUuid: string) => Promise<{
          writeValue: (value: BufferSource) => Promise<void>;
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
  width = 32
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

    const receiptText = generatePlainTextReceipt(data, width);
    const commands = buildEscPosCommands(receiptText);

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
