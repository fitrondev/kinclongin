import bcrypt from "bcryptjs";

import {
  CommissionType,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
  TicketStatus,
  UserRole,
  UserStatus,
  VehicleCategory,
  WhatsAppDeliveryStatus,
} from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db/prisma";

interface BranchConfig {
  name: string;
  slug: string;
  address: string;
  phone: string;
  city: string;
  subStatus: SubscriptionStatus;
  subExpiresAt: Date;
  receiptHeader: string;
  receiptFooter: string;
  manager: { name: string; email: string };
  cashiers: Array<{ name: string; email: string }>;
  washers: Array<{ name: string; email: string; pin: string }>;
  vehicleTypes: Array<{
    name: string;
    category: VehicleCategory;
    price: number;
    duration: number;
    commissionAmount: number;
  }>;
  supplies: Array<{
    name: string;
    unit: string;
    stock: number;
    minStockAlert: number;
  }>;
  retails: Array<{
    name: string;
    sku: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    minStockAlert: number;
  }>;
  customers: Array<{
    fullName: string;
    phone: string;
    plate: string;
    brand: string;
    model: string;
    category: VehicleCategory;
    points: number;
  }>;
}

async function main() {
  console.log("🧼 =========================================================");
  console.log("🧼 MEMULAI SEEDING DATA LENGKAP KINCLONGIN POS PLATFORM");
  console.log("🧼 =========================================================");

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 1. Bersihkan tabel lama agar seeding bersih dan idenpoten
  console.log("\n🧹 1. Membersihkan database lama...");
  await prisma.tenantSubscriptionPayment.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.workShift.deleteMany();
  await prisma.whatsAppLog.deleteMany();
  await prisma.customerLoyaltyLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticketRetailItem.deleteMany();
  await prisma.ticketWasher.deleteMany();
  await prisma.washTicket.deleteMany();
  await prisma.customerMembership.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.operationalSupply.deleteMany();
  await prisma.retailProduct.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();

  // Hash kata sandi default untuk semua akun demo (123456)
  const defaultPasswordHash = await bcrypt.hash("123456", 10);

  // 2. Buat Superadmin Platform (Pusat Provider tanpa outlet lokal)
  console.log("👑 2. Membuat Akun Superadmin Platform Provider...");
  const superadminUser = await prisma.user.create({
    data: {
      email: "superadmin@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Superadmin Platform Pusat",
      role: UserRole.SUPERADMIN,
      status: UserStatus.ACTIVE,
      outletId: null, // Superadmin platform murni tidak terikat cabang fisik
    },
  });

  // 3. Buat 2 Akun Owner Bisnis Cuci Mandiri (Multi-Tenant B2B)
  console.log(
    "🏢 3. Membuat 2 Akun Owner (AutoClean Group & Kilap Star Group)..."
  );

  // Owner 1: Pak H. Ridwan Santoso (AutoClean Group)
  const owner1 = await prisma.user.create({
    data: {
      email: "ridwan.owner@autoclean.com",
      passwordHash: defaultPasswordHash,
      fullName: "H. Ridwan Santoso",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  // Owner 2: Ibu Hj. Dewi Anggraeni (Kilap Motor & Detailing Group)
  const owner2 = await prisma.user.create({
    data: {
      email: "dewi.owner@kilapglossy.com",
      passwordHash: defaultPasswordHash,
      fullName: "Hj. Dewi Anggraeni",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
    },
  });

  // 4. Konfigurasi 4 Cabang Usaha Cuci (2 Cabang per Owner, BUKAN nama Kinclongin)
  const branchConfigs: Array<{ ownerId: string; config: BranchConfig }> = [
    // --- CABANG OWNER 1 (AUTOCLEAN GROUP) ---
    {
      ownerId: owner1.id,
      config: {
        name: "AutoClean Express Mataram",
        slug: "autoclean-express-mataram",
        address: "Jl. Pejanggik No. 88, Mataram, NTB",
        phone: "081234567801",
        city: "Mataram",
        subStatus: SubscriptionStatus.ACTIVE,
        subExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 Hari
        receiptHeader:
          "AUTOCLEAN EXPRESS MATARAM\nCuci Cepat, Bersih Maksimal, Mengkilap",
        receiptFooter:
          "Terima kasih atas kunjungan Anda!\nKritik & Saran WA: 081234567801",
        manager: { name: "Danu Prakoso", email: "danu.manager@autoclean.com" },
        cashiers: [
          { name: "Siti Rahma", email: "siti.kasir@autoclean.com" },
          { name: "Budi Setiawan", email: "budi.kasir@autoclean.com" },
        ],
        washers: [
          {
            name: "Agus Santoso",
            email: "agus.washer@autoclean.com",
            pin: "1234",
          },
          {
            name: "Bayu Pratama",
            email: "bayu.washer@autoclean.com",
            pin: "2345",
          },
          {
            name: "Candra Wijaya",
            email: "candra.washer@autoclean.com",
            pin: "3456",
          },
        ],
        vehicleTypes: [
          {
            name: "Cuci Mobil Standar (Avanza, Xpander, Ertiga)",
            category: VehicleCategory.MOBIL_SEDANG,
            price: 45000,
            duration: 35,
            commissionAmount: 12000,
          },
          {
            name: "Cuci Mobil Premium + Salju (Fortuner, Pajero, CR-V)",
            category: VehicleCategory.MOBIL_BESAR,
            price: 60000,
            duration: 45,
            commissionAmount: 16000,
          },
          {
            name: "Cuci Motor Reguler (Beat, Vario, Scoopy)",
            category: VehicleCategory.MOTOR_KECIL,
            price: 20000,
            duration: 20,
            commissionAmount: 6000,
          },
          {
            name: "Cuci Motor Besar (NMAX, PCX, Aerox)",
            category: VehicleCategory.MOTOR_BESAR,
            price: 25000,
            duration: 25,
            commissionAmount: 8000,
          },
        ],
        supplies: [
          {
            name: "Shampoo Salju Snow Foam pH Balanced",
            unit: "LITER",
            stock: 80,
            minStockAlert: 20,
          },
          {
            name: "Semir Ban Wet-Look Premium",
            unit: "LITER",
            stock: 35,
            minStockAlert: 10,
          },
          {
            name: "Pembersih Interior & Dashboard",
            unit: "LITER",
            stock: 22,
            minStockAlert: 8,
          },
          {
            name: "Wax Body Finishing Carnauba",
            unit: "BOTOL",
            stock: 12,
            minStockAlert: 5,
          },
        ],
        retails: [
          {
            name: "Parfum Mobil Aroma Kopi Bali Gantung",
            sku: "ACC-001",
            category: "Aksesoris",
            costPrice: 12000,
            sellingPrice: 20000,
            stock: 30,
            minStockAlert: 10,
          },
          {
            name: "Lap Microfiber Tebal 40x40cm 600GSM",
            sku: "ACC-002",
            category: "Aksesoris",
            costPrice: 15000,
            sellingPrice: 25000,
            stock: 25,
            minStockAlert: 8,
          },
          {
            name: "Air Mineral Botol Dingin 600ml",
            sku: "MNM-001",
            category: "Minuman",
            costPrice: 3000,
            sellingPrice: 5000,
            stock: 60,
            minStockAlert: 20,
          },
          {
            name: "Kopi Susu Gula Aren Kaleng Dingin",
            sku: "MNM-002",
            category: "Minuman",
            costPrice: 6500,
            sellingPrice: 10000,
            stock: 40,
            minStockAlert: 15,
          },
        ],
        customers: [
          {
            fullName: "Bambang Irawan",
            phone: "08123450001",
            plate: "DR 1452 AP",
            brand: "Toyota",
            model: "Avanza",
            category: VehicleCategory.MOBIL_SEDANG,
            points: 6,
          },
          {
            fullName: "dr. Nurul Hidayah",
            phone: "08123450002",
            plate: "DR 8899 LK",
            brand: "Honda",
            model: "HR-V",
            category: VehicleCategory.MOBIL_SEDANG,
            points: 9,
          },
          {
            fullName: "Dimas Saputra",
            phone: "08123450003",
            plate: "DR 5521 BC",
            brand: "Yamaha",
            model: "NMAX",
            category: VehicleCategory.MOTOR_BESAR,
            points: 3,
          },
          {
            fullName: "Suryadi Pratama",
            phone: "08123450004",
            plate: "DR 2109 XY",
            brand: "Mitsubishi",
            model: "Pajero Sport",
            category: VehicleCategory.MOBIL_BESAR,
            points: 10,
          },
        ],
      },
    },
    {
      ownerId: owner1.id,
      config: {
        name: "AutoClean Detailing Rembiga",
        slug: "autoclean-detailing-rembiga",
        address: "Jl. Dr. Wahidin No. 42, Rembiga, Mataram",
        phone: "081234567802",
        city: "Mataram",
        subStatus: SubscriptionStatus.ACTIVE,
        subExpiresAt: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000), // +45 Hari
        receiptHeader:
          "AUTOCLEAN DETAILING REMBIGA\nSalon Mobil, Nano Coating & Interior Detailing",
        receiptFooter:
          "Perawatan Kendaraan Terpercaya di Rembiga\nBooking Servis: 081234567802",
        manager: { name: "Reza Gunawan", email: "reza.manager@autoclean.com" },
        cashiers: [{ name: "Maya Lestari", email: "maya.kasir@autoclean.com" }],
        washers: [
          {
            name: "Fajar Ilham",
            email: "fajar.washer@autoclean.com",
            pin: "4567",
          },
          {
            name: "Gita Saputra",
            email: "gita.washer@autoclean.com",
            pin: "5678",
          },
        ],
        vehicleTypes: [
          {
            name: "Cuci Hidrolik + Kolong Sasis (All Car)",
            category: VehicleCategory.MOBIL_SEDANG,
            price: 55000,
            duration: 45,
            commissionAmount: 15000,
          },
          {
            name: "Full Detailing Jamur Kaca + Bodi",
            category: VehicleCategory.MOBIL_BESAR,
            price: 175000,
            duration: 90,
            commissionAmount: 45000,
          },
          {
            name: "Poles Bodi & Cuci Mesin Komplit",
            category: VehicleCategory.MOBIL_SEDANG,
            price: 150000,
            duration: 75,
            commissionAmount: 40000,
          },
        ],
        supplies: [
          {
            name: "Compound Poles Step 1 Cutting",
            unit: "BOTOL",
            stock: 15,
            minStockAlert: 4,
          },
          {
            name: "Shampoo Touchless Active Foam",
            unit: "LITER",
            stock: 50,
            minStockAlert: 15,
          },
          {
            name: "Cairan Pembersih Jamur Kaca Waterspot",
            unit: "LITER",
            stock: 18,
            minStockAlert: 5,
          },
        ],
        retails: [
          {
            name: "Parfum Mobil Aroma Vanilla Botol Kayu",
            sku: "ACC-101",
            category: "Aksesoris",
            costPrice: 14000,
            sellingPrice: 25000,
            stock: 20,
            minStockAlert: 5,
          },
          {
            name: "Kanebo Aion Asli Tabung Kuning",
            sku: "ACC-102",
            category: "Aksesoris",
            costPrice: 28000,
            sellingPrice: 45000,
            stock: 15,
            minStockAlert: 5,
          },
        ],
        customers: [
          {
            fullName: "Agung Wicaksono",
            phone: "08123450011",
            plate: "DR 1111 WZ",
            brand: "Toyota",
            model: "Innova Zenix",
            category: VehicleCategory.MOBIL_BESAR,
            points: 4,
          },
          {
            fullName: "Ferry Salim",
            phone: "08123450012",
            plate: "DR 7700 AS",
            brand: "Honda",
            model: "Civic Turbo",
            category: VehicleCategory.MOBIL_SEDANG,
            points: 7,
          },
        ],
      },
    },

    // --- CABANG OWNER 2 (KILAP STAR GROUP) ---
    {
      ownerId: owner2.id,
      config: {
        name: "Kilap Glossy Ampenan",
        slug: "kilap-glossy-ampenan",
        address: "Jl. Saleh Sungkar No. 15, Ampenan, Mataram",
        phone: "081987654301",
        city: "Mataram",
        subStatus: SubscriptionStatus.ACTIVE,
        subExpiresAt: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000), // +25 Hari
        receiptHeader:
          "KILAP GLOSSY AMPENAN\nSolusi Kilap Kendaraan Pesisir Pantai Ampenan",
        receiptFooter:
          "Buka Setiap Hari 07.30 - 21.00 WITA\nLayanan Antar Jemput: 081987654301",
        manager: {
          name: "Hendra Kusuma",
          email: "hendra.manager@kilapglossy.com",
        },
        cashiers: [{ name: "Rina Wati", email: "rina.kasir@kilapglossy.com" }],
        washers: [
          {
            name: "Joko Susilo",
            email: "joko.washer@kilapglossy.com",
            pin: "6789",
          },
          {
            name: "Kiki Kurniawan",
            email: "kiki.washer@kilapglossy.com",
            pin: "7890",
          },
        ],
        vehicleTypes: [
          {
            name: "Cuci Anti-Karat Garam Laut (Mobil)",
            category: VehicleCategory.MOBIL_SEDANG,
            price: 50000,
            duration: 40,
            commissionAmount: 14000,
          },
          {
            name: "Cuci Motor Kilap Salju (Matic)",
            category: VehicleCategory.MOTOR_KECIL,
            price: 18000,
            duration: 20,
            commissionAmount: 5000,
          },
          {
            name: "Cuci Motor Sport / Moge 250cc+",
            category: VehicleCategory.MOTOR_BESAR,
            price: 28000,
            duration: 30,
            commissionAmount: 9000,
          },
        ],
        supplies: [
          {
            name: "Cairan Anti Karat Underbody Coating",
            unit: "LITER",
            stock: 40,
            minStockAlert: 10,
          },
          {
            name: "Shampoo Salju Wax Protect",
            unit: "LITER",
            stock: 65,
            minStockAlert: 20,
          },
        ],
        retails: [
          {
            name: "Gantungan Kunci Kulit Custom Plat",
            sku: "ACC-201",
            category: "Merchandise",
            costPrice: 8000,
            sellingPrice: 15000,
            stock: 45,
            minStockAlert: 10,
          },
          {
            name: "Teh Botol Kotak Dingin",
            sku: "MNM-201",
            category: "Minuman",
            costPrice: 3200,
            sellingPrice: 5000,
            stock: 50,
            minStockAlert: 15,
          },
        ],
        customers: [
          {
            fullName: "I Made Sujana",
            phone: "08198760001",
            plate: "DR 4455 BL",
            brand: "Honda",
            model: "Vario 160",
            category: VehicleCategory.MOTOR_KECIL,
            points: 5,
          },
          {
            fullName: "Wayan Sudirman",
            phone: "08198760002",
            plate: "DR 1988 AB",
            brand: "Toyota",
            model: "Raize",
            category: VehicleCategory.MOBIL_SEDANG,
            points: 2,
          },
        ],
      },
    },
    {
      ownerId: owner2.id,
      config: {
        name: "Star Wash & Detailing Narmada",
        slug: "star-wash-narmada",
        address: "Jl. Raya Narmada No. 101, Lembuak, Narmada",
        phone: "081987654302",
        city: "Lombok Barat",
        subStatus: SubscriptionStatus.GRACE_PERIOD, // DEMO: GRACE PERIOD (3 hari) & ADA PENGAJUAN PENDING 50k
        subExpiresAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Kedaluwarsa kemarin (Toleransi hari ke-2)
        receiptHeader:
          "STAR WASH & DETAILING NARMADA\nAir Sumber Mata Air Alami Narmada",
        receiptFooter:
          "Pencucian Sebersih Mata Air Pegunungan\nFollow IG: @starwash.narmada",
        manager: { name: "Surya Saputra", email: "surya.manager@starwash.com" },
        cashiers: [{ name: "Nina Permata", email: "nina.kasir@starwash.com" }],
        washers: [
          {
            name: "Lukman Hakim",
            email: "lukman.washer@starwash.com",
            pin: "8901",
          },
          {
            name: "Maman Suherman",
            email: "maman.washer@starwash.com",
            pin: "9012",
          },
        ],
        vehicleTypes: [
          {
            name: "Cuci Mobil Alami Mata Air",
            category: VehicleCategory.MOBIL_SEDANG,
            price: 40000,
            duration: 35,
            commissionAmount: 11000,
          },
          {
            name: "Cuci Motor Cepat",
            category: VehicleCategory.MOTOR_KECIL,
            price: 15000,
            duration: 15,
            commissionAmount: 5000,
          },
        ],
        supplies: [
          {
            name: "Shampoo Salju Standard",
            unit: "LITER",
            stock: 30,
            minStockAlert: 10,
          },
          {
            name: "Semir Ban Standar",
            unit: "LITER",
            stock: 20,
            minStockAlert: 5,
          },
        ],
        retails: [
          {
            name: "Air Mineral Botol Narmada 600ml",
            sku: "MNM-301",
            category: "Minuman",
            costPrice: 2500,
            sellingPrice: 4000,
            stock: 80,
            minStockAlert: 20,
          },
        ],
        customers: [
          {
            fullName: "Lalu Zulkifli",
            phone: "08198760011",
            plate: "DR 3344 LK",
            brand: "Suzuki",
            model: "Ertiga",
            category: VehicleCategory.MOBIL_SEDANG,
            points: 8,
          },
        ],
      },
    },
  ];

  // 5. Eksekusi Seeding Data Cabang
  console.log("\n🏪 4. Membuat 4 Outlet Beserta Struktur Lengkap...");

  for (let bIndex = 0; bIndex < branchConfigs.length; bIndex++) {
    const { ownerId, config } = branchConfigs[bIndex];
    console.log(
      `\n  📍 [${bIndex + 1}/4] Membangun Cabang: "${config.name}" (Kota: ${config.city})...`
    );

    // A. Buat Outlet
    const outlet = await prisma.outlet.create({
      data: {
        name: config.name,
        slug: config.slug,
        address: config.address,
        phone: config.phone,
        ownerId: ownerId,
        subscriptionStatus: config.subStatus,
        subscriptionExpiresAt: config.subExpiresAt,
        receiptHeader: config.receiptHeader,
        receiptFooter: config.receiptFooter,
        isActive: true,
      },
    });

    // Jika ini cabang pertama masing-masing owner, set sebagai outletId aktif owner
    if (bIndex === 0) {
      await prisma.user.update({
        where: { id: owner1.id },
        data: { outletId: outlet.id },
      });
    } else if (bIndex === 2) {
      await prisma.user.update({
        where: { id: owner2.id },
        data: { outletId: outlet.id },
      });
    }

    // B. Buat Riwayat Pembayaran Lisensi Cabang (TenantSubscriptionPayment)
    console.log(`    💳 Membuat pembayaran lisensi cabang...`);
    await prisma.tenantSubscriptionPayment.create({
      data: {
        outletId: outlet.id,
        amount: 50000,
        periodMonths: 1,
        paymentMethod: SubscriptionPaymentMethod.QRIS,
        paymentProofUrl:
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
        status: SubscriptionPaymentStatus.APPROVED,
        notes: "Perpanjangan lisensi operasional cabang bulan sebelumnya",
        verifiedAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        verifiedBy: superadminUser.id,
      },
    });

    if (bIndex === 0) {
      // Cabang 1 tambahan 1x riwayat approved
      await prisma.tenantSubscriptionPayment.create({
        data: {
          outletId: outlet.id,
          amount: 50000,
          periodMonths: 1,
          paymentMethod: SubscriptionPaymentMethod.MANUAL_TRANSFER,
          paymentProofUrl:
            "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
          status: SubscriptionPaymentStatus.APPROVED,
          notes: "Pembayaran transfer Bank Mandiri 50k",
          verifiedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          verifiedBy: superadminUser.id,
        },
      });
    }

    if (config.slug === "star-wash-narmada") {
      // Cabang 4: Buat 1 pengajuan pembayaran PENDING untuk DEMO SUPERADMIN VERIFIKASI
      await prisma.tenantSubscriptionPayment.create({
        data: {
          outletId: outlet.id,
          amount: 50000,
          periodMonths: 1,
          paymentMethod: SubscriptionPaymentMethod.QRIS,
          paymentProofUrl:
            "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
          status: SubscriptionPaymentStatus.PENDING,
          notes:
            "Pengajuan perpanjangan lisensi 1 bulan via QRIS Usaha. Mohon approval.",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 jam yang lalu
        },
      });
      console.log(
        `    ⭐ Dibuat 1 antrean bukti bayar PENDING untuk demo verifikasi Superadmin!`
      );
    }

    // C. Buat Staf Cabang (Manager, Cashiers, Washers)
    console.log(`    👥 Mendaftarkan manajer, kasir, dan tukang cuci...`);

    // 1. Manajer
    const managerUser = await prisma.user.create({
      data: {
        email: config.manager.email,
        passwordHash: defaultPasswordHash,
        fullName: config.manager.name,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
        outletId: outlet.id,
      },
    });
    await prisma.employee.create({
      data: {
        fullName: config.manager.name,
        role: UserRole.MANAGER,
        outletId: outlet.id,
        userId: managerUser.id,
        commissionType: CommissionType.FIXED_NOMINAL,
        commissionRate: 0,
      },
    });

    // 2. Kasir
    const cashierUsers = [];
    for (const c of config.cashiers) {
      const u = await prisma.user.create({
        data: {
          email: c.email,
          passwordHash: defaultPasswordHash,
          fullName: c.name,
          role: UserRole.CASHIER,
          status: UserStatus.ACTIVE,
          outletId: outlet.id,
        },
      });
      const emp = await prisma.employee.create({
        data: {
          fullName: c.name,
          role: UserRole.CASHIER,
          outletId: outlet.id,
          userId: u.id,
          commissionType: CommissionType.FIXED_NOMINAL,
          commissionRate: 0,
        },
      });
      cashierUsers.push({ user: u, employee: emp });
    }

    // 3. Washers (Tukang Cuci dengan PIN Kiosk Masif)
    const washerRecords = [];
    for (const w of config.washers) {
      const u = await prisma.user.create({
        data: {
          email: w.email,
          passwordHash: defaultPasswordHash,
          fullName: w.name,
          role: UserRole.WASHER,
          status: UserStatus.ACTIVE,
          outletId: outlet.id,
        },
      });
      const emp = await prisma.employee.create({
        data: {
          fullName: w.name,
          role: UserRole.WASHER,
          pinCode: w.pin,
          outletId: outlet.id,
          userId: u.id,
          commissionType: CommissionType.FIXED_NOMINAL,
          commissionRate: 10000,
        },
      });
      washerRecords.push({ user: u, employee: emp, pin: w.pin });
    }

    // D. Buat Work Shifts & Shift Assignments
    console.log(`    ⏰ Membuat jadwal shift kerja...`);
    const shiftPagi = await prisma.workShift.create({
      data: {
        name: "Shift Pagi (08:00 - 16:00)",
        startTime: "08:00",
        endTime: "16:00",
        outletId: outlet.id,
      },
    });
    const shiftSore = await prisma.workShift.create({
      data: {
        name: "Shift Sore (14:00 - 22:00)",
        startTime: "14:00",
        endTime: "22:00",
        outletId: outlet.id,
      },
    });

    // Tugaskan washer ke shift hari ini
    if (washerRecords.length > 0) {
      await prisma.shiftAssignment.create({
        data: {
          employeeId: washerRecords[0].employee.id,
          shiftId: shiftPagi.id,
          outletId: outlet.id,
          date: now,
        },
      });
    }

    // E. Buat Paket Layanan (ServicePackage)
    console.log(`    🚿 Mendaftarkan paket layanan cuci...`);
    const createdPackages = [];
    for (const pkg of config.vehicleTypes) {
      const sp = await prisma.servicePackage.create({
        data: {
          name: pkg.name,
          vehicleCategory: pkg.category,
          price: pkg.price,
          estimatedMinutes: pkg.duration,
          commissionType: CommissionType.FIXED_NOMINAL,
          defaultCommission: pkg.commissionAmount,
          outletId: outlet.id,
        },
      });
      createdPackages.push(sp);
    }

    // F. Buat Bahan Operasional (OperationalSupply)
    console.log(`    🧪 Mendaftarkan bahan baku operasional...`);
    const createdSupplies = [];
    for (const sup of config.supplies) {
      const s = await prisma.operationalSupply.create({
        data: {
          name: sup.name,
          unit: sup.unit,
          stock: sup.stock,
          minStockAlert: sup.minStockAlert,
          outletId: outlet.id,
        },
      });
      // Catat movement saldo awal
      await prisma.stockMovement.create({
        data: {
          operationalSupplyId: s.id,
          quantity: sup.stock,
          balanceAfter: sup.stock,
          movementType: MovementType.IN_RESTOCK,
          referenceNote: "Stok awal pembukaan cabang",
          outletId: outlet.id,
        },
      });
      createdSupplies.push(s);
    }

    // G. Buat Produk Ritel Kasir (RetailProduct)
    console.log(`    🥤 Mendaftarkan produk ritel kasir...`);
    const createdRetails = [];
    for (const ret of config.retails) {
      const r = await prisma.retailProduct.create({
        data: {
          name: ret.name,
          sku: ret.sku,
          category: ret.category,
          costPrice: ret.costPrice,
          sellingPrice: ret.sellingPrice,
          stock: ret.stock,
          minStockAlert: ret.minStockAlert,
          outletId: outlet.id,
        },
      });
      createdRetails.push(r);
    }

    // H. Buat Data Pelanggan & Kendaraan
    console.log(`    🚗 Mendaftarkan pelanggan tetap & antrean aktif...`);
    const createdCustomers = [];
    for (const cust of config.customers) {
      // Find or create customer by phone
      let c = await prisma.customer.findUnique({
        where: { phone: cust.phone },
      });
      if (!c) {
        c = await prisma.customer.create({
          data: {
            fullName: cust.fullName,
            phone: cust.phone,
            loyaltyPoints: cust.points,
            totalVisits: cust.points + 2,
          },
        });
      }

      // Find or create vehicle by plate
      let v = await prisma.vehicle.findUnique({
        where: { licensePlate: cust.plate },
      });
      if (!v) {
        v = await prisma.vehicle.create({
          data: {
            licensePlate: cust.plate,
            brand: cust.brand,
            model: cust.model,
            category: cust.category,
            customerId: c.id,
          },
        });
      }

      createdCustomers.push({
        customer: c,
        vehicle: v,
        initialPoints: cust.points,
      });
    }

    // I. Buat Tiket Cuci Berbagai Tahapan Kanban (QUEUED, WASHING, DRYING, READY, COMPLETED)
    if (
      createdCustomers.length >= 2 &&
      createdPackages.length >= 2 &&
      washerRecords.length >= 2
    ) {
      const activeCashier = cashierUsers[0].user;

      // Tiket 1: Status QUEUED (Menunggu Cuci di Antrean Depan)
      await prisma.washTicket.create({
        data: {
          ticketNumber: `TKT-${dateStr}-${String(bIndex * 10 + 1).padStart(3, "0")}`,
          licensePlate: createdCustomers[0].vehicle.licensePlate,
          vehicleCategory: createdCustomers[0].vehicle.category,
          servicePackageId: createdPackages[0].id,
          servicePrice: createdPackages[0].price,
          subtotalServices: createdPackages[0].price,
          totalAmount: createdPackages[0].price,
          status: TicketStatus.QUEUED,
          paymentStatus: PaymentStatus.UNPAID,
          vehicleId: createdCustomers[0].vehicle.id,
          customerId: createdCustomers[0].customer.id,
          outletId: outlet.id,
          createdById: activeCashier.id,
          queuedAt: new Date(now.getTime() - 25 * 60 * 1000), // 25 menit lalu
          createdAt: new Date(now.getTime() - 25 * 60 * 1000),
        },
      });

      // Tiket 2: Status WASHING (Sedang Dicuci oleh Washer 1)
      const ticketWashing = await prisma.washTicket.create({
        data: {
          ticketNumber: `TKT-${dateStr}-${String(bIndex * 10 + 2).padStart(3, "0")}`,
          licensePlate: createdCustomers[1].vehicle.licensePlate,
          vehicleCategory: createdCustomers[1].vehicle.category,
          servicePackageId: createdPackages[1].id,
          servicePrice: createdPackages[1].price,
          subtotalServices: createdPackages[1].price,
          totalAmount: createdPackages[1].price,
          status: TicketStatus.WASHING,
          paymentStatus: PaymentStatus.UNPAID,
          vehicleId: createdCustomers[1].vehicle.id,
          customerId: createdCustomers[1].customer.id,
          outletId: outlet.id,
          createdById: activeCashier.id,
          queuedAt: new Date(now.getTime() - 35 * 60 * 1000),
          washingStartedAt: new Date(now.getTime() - 15 * 60 * 1000),
          createdAt: new Date(now.getTime() - 35 * 60 * 1000),
        },
      });
      // Washer 1 klaim tiket
      await prisma.ticketWasher.create({
        data: {
          ticketId: ticketWashing.id,
          employeeId: washerRecords[0].employee.id,
          commissionAmount: Number(createdPackages[1].defaultCommission),
        },
      });

      // Tiket 3: Status READY (Selesai Cuci, Siap Ambil / Bayar)
      if (createdCustomers.length >= 3) {
        const ticketReady = await prisma.washTicket.create({
          data: {
            ticketNumber: `TKT-${dateStr}-${String(bIndex * 10 + 3).padStart(3, "0")}`,
            licensePlate: createdCustomers[2].vehicle.licensePlate,
            vehicleCategory: createdCustomers[2].vehicle.category,
            servicePackageId: createdPackages[0].id,
            servicePrice: createdPackages[0].price,
            subtotalServices: createdPackages[0].price,
            totalAmount: createdPackages[0].price,
            status: TicketStatus.READY,
            paymentStatus: PaymentStatus.UNPAID,
            vehicleId: createdCustomers[2].vehicle.id,
            customerId: createdCustomers[2].customer.id,
            outletId: outlet.id,
            createdById: activeCashier.id,
            queuedAt: new Date(now.getTime() - 50 * 60 * 1000),
            washingStartedAt: new Date(now.getTime() - 40 * 60 * 1000),
            dryingStartedAt: new Date(now.getTime() - 20 * 60 * 1000),
            readyAt: new Date(now.getTime() - 10 * 60 * 1000),
            createdAt: new Date(now.getTime() - 50 * 60 * 1000),
          },
        });
        await prisma.ticketWasher.create({
          data: {
            ticketId: ticketReady.id,
            employeeId: washerRecords[1].employee.id,
            commissionAmount: Number(createdPackages[0].defaultCommission),
          },
        });
      }

      // Tiket 4: Status COMPLETED (Sudah Bayar Lunas, Komisi Tercatat)
      // Buat kendaraan dan customer untuk tiket 4
      let completedCust = await prisma.customer.findUnique({
        where: { phone: "081299998888" },
      });
      if (!completedCust) {
        completedCust = await prisma.customer.create({
          data: {
            fullName: "Pak Hendra Mulyadi",
            phone: "081299998888",
            loyaltyPoints: 3,
            totalVisits: 5,
          },
        });
      }

      let completedVeh = await prisma.vehicle.findUnique({
        where: { licensePlate: `DR ${9000 + bIndex} LK` },
      });
      if (!completedVeh) {
        completedVeh = await prisma.vehicle.create({
          data: {
            licensePlate: `DR ${9000 + bIndex} LK`,
            brand: "Honda",
            model: "BR-V",
            category: VehicleCategory.MOBIL_SEDANG,
            customerId: completedCust.id,
          },
        });
      }

      const retailSubtotal =
        createdRetails.length > 0 ? Number(createdRetails[0].sellingPrice) : 0;
      const totalAmount = Number(createdPackages[0].price) + retailSubtotal;

      const ticketCompleted = await prisma.washTicket.create({
        data: {
          ticketNumber: `TKT-${dateStr}-${String(bIndex * 10 + 4).padStart(3, "0")}`,
          licensePlate: completedVeh.licensePlate,
          vehicleCategory: completedVeh.category,
          servicePackageId: createdPackages[0].id,
          servicePrice: createdPackages[0].price,
          subtotalServices: createdPackages[0].price,
          subtotalRetail: retailSubtotal,
          totalAmount: totalAmount,
          paidAmount: totalAmount,
          status: TicketStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
          vehicleId: completedVeh.id,
          customerId: completedCust.id,
          outletId: outlet.id,
          createdById: activeCashier.id,
          queuedAt: new Date(now.getTime() - 130 * 60 * 1000),
          washingStartedAt: new Date(now.getTime() - 120 * 60 * 1000),
          dryingStartedAt: new Date(now.getTime() - 90 * 60 * 1000),
          readyAt: new Date(now.getTime() - 70 * 60 * 1000),
          completedAt: new Date(now.getTime() - 60 * 60 * 1000),
          createdAt: new Date(now.getTime() - 130 * 60 * 1000),
        },
      });

      // Washer 1 & Washer 2 tandem (Bagi komisi 50:50)
      const halfCommission = Number(createdPackages[0].defaultCommission) / 2;
      await prisma.ticketWasher.createMany({
        data: [
          {
            ticketId: ticketCompleted.id,
            employeeId: washerRecords[0].employee.id,
            commissionAmount: halfCommission,
            isPaidToWasher: true,
            paidAt: new Date(now.getTime() - 30 * 60 * 1000),
          },
          {
            ticketId: ticketCompleted.id,
            employeeId: washerRecords[1].employee.id,
            commissionAmount: halfCommission,
            isPaidToWasher: true,
            paidAt: new Date(now.getTime() - 30 * 60 * 1000),
          },
        ],
      });

      // Tambah item ritel di kasir (misal beli parfum mobil)
      if (createdRetails.length > 0) {
        await prisma.ticketRetailItem.create({
          data: {
            ticketId: ticketCompleted.id,
            retailProductId: createdRetails[0].id,
            quantity: 1,
            unitPrice: createdRetails[0].sellingPrice,
            subtotal: createdRetails[0].sellingPrice,
          },
        });
      }

      // Catat Pembayaran Kasir (Cash)
      await prisma.payment.create({
        data: {
          ticketId: ticketCompleted.id,
          outletId: outlet.id,
          cashierId: activeCashier.id,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PAID,
          totalAmount: totalAmount,
          cashGiven: totalAmount + 10000,
          changeGiven: 10000,
          paidAt: new Date(now.getTime() - 60 * 60 * 1000),
        },
      });

      // Catat Log WhatsApp Struk Digital
      await prisma.whatsAppLog.create({
        data: {
          recipientPhone: completedCust.phone,
          messageType: "DIGITAL_RECEIPT",
          status: WhatsAppDeliveryStatus.SENT,
          payloadJson: {
            ticketNumber: ticketCompleted.ticketNumber,
            totalAmount: totalAmount,
          },
          ticketId: ticketCompleted.id,
          sentAt: new Date(now.getTime() - 59 * 60 * 1000),
        },
      });
    }

    // J. Audit Log Registrasi Cabang
    await prisma.auditLog.create({
      data: {
        action: "BRANCH_SEEDED",
        actorId: superadminUser.id,
        actorRole: "SUPERADMIN",
        entityType: "Outlet",
        entityId: outlet.id,
        metadata: {
          details: `Cabang ${config.name} berhasil dibuat dengan status lisensi ${config.subStatus}.`,
        },
        outletId: outlet.id,
      },
    });
  }

  console.log("\n=========================================================");
  console.log("✅ SEEDING DATA BERHASIL DILAKUKAN 100%!");
  console.log("=========================================================");
  console.log("👑 1. SUPERADMIN PLATFORM PROVIDER:");
  console.log("   - Email   : superadmin@kinclongin.com");
  console.log("   - Password: 123456");
  console.log(
    "   - Akses   : /dashboard/admin/subscriptions (Approval Lisensi 50k)"
  );
  console.log("\n🏢 2. OWNER 1 (H. Ridwan Santoso - AutoClean Group):");
  console.log("   - Email   : ridwan.owner@autoclean.com");
  console.log("   - Password: 123456");
  console.log("   - Cabang 1: AutoClean Express Mataram (ACTIVE)");
  console.log("   - Cabang 2: AutoClean Detailing Rembiga (ACTIVE)");
  console.log("\n🏢 3. OWNER 2 (Hj. Dewi Anggraeni - Kilap Star Group):");
  console.log("   - Email   : dewi.owner@kilapglossy.com");
  console.log("   - Password: 123456");
  console.log("   - Cabang 3: Kilap Glossy Ampenan (ACTIVE)");
  console.log(
    "   - Cabang 4: Star Wash & Detailing Narmada (GRACE PERIOD + 1 PENDING 50K PROOF)"
  );
  console.log("\n👥 4. STAF DEMO UTAMA (AutoClean Express Mataram):");
  console.log("   - Manajer : danu.manager@autoclean.com (123456)");
  console.log("   - Kasir   : siti.kasir@autoclean.com (123456)");
  console.log("   - Washer  : agus.washer@autoclean.com (PIN Kiosk: 1234)");
  console.log("=========================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error saat menjalankan seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
