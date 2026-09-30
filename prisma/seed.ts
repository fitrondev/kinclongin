import {
  CommissionType,
  MovementType,
  PaymentMethod,
  PaymentStatus,
  TicketStatus,
  UserRole,
  UserStatus,
  VehicleCategory,
  WhatsAppDeliveryStatus,
} from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  console.log("🧼 =========================================================");
  console.log("🧼 MEMULAI SEEDING DATA LENGKAP KINCLONGIN POS & MEMBERSHIP");
  console.log("🧼 =========================================================");

  // 1. Bersihkan tabel lama agar seeding bersih dan idenpoten
  console.log("\n🧹 1. Membersihkan data lama...");
  await prisma.whatsAppLog.deleteMany();
  await prisma.customerLoyaltyLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.ticketRetailItem.deleteMany();
  await prisma.ticketWasher.deleteMany();
  await prisma.washTicket.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.operationalSupply.deleteMany();
  await prisma.retailProduct.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.tenantSubscriptionPayment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();

  // 2. Buat Cabang Outlet (Multi-Tenant Demo)
  console.log("\n🏢 2. Membuat Cabang Outlet Demo...");
  const outletMataram = await prisma.outlet.create({
    data: {
      clerkOrgId: "org_demo_mataram_001",
      name: "Kinclongin Cabang Pusat Mataram",
      slug: "kinclongin-pusat-mataram",
      address: "Jl. Pejanggik No. 88, Cakranegara, Kota Mataram, NTB",
      phone: "081912345678",
      logoUrl:
        "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&q=80",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // Aktif 6 bulan ke depan
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const outletRembiga = await prisma.outlet.create({
    data: {
      clerkOrgId: "org_demo_rembiga_002",
      name: "Kinclongin Express Rembiga",
      slug: "kinclongin-express-rembiga",
      address: "Jl. Dr. Wahidin No. 45, Rembiga, Kota Mataram, NTB",
      phone: "081987654321",
      logoUrl:
        "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=400&q=80",
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Aktif 3 bulan ke depan
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // 3. Catat Riwayat Langganan SaaS Cabang (Rp 50.000 / Bulan)
  console.log("💳 3. Membuat Riwayat Pembayaran Langganan SaaS Cabang...");
  await prisma.tenantSubscriptionPayment.create({
    data: {
      outletId: outletMataram.id,
      amount: 300000, // 6 bulan paket langganan
      durationMonths: 6,
      paymentMethod: "QRIS",
      proofImageUrl:
        "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&q=80",
      status: "APPROVED",
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 3600000),
      verifiedById: "user_superadmin_001",
    },
  });

  // 4. Buat Pengguna Utama Cabang (Owner, Manajer, Kasir)
  console.log("👤 4. Membuat Akun Pengguna Cabang...");
  const ownerUser = await prisma.user.create({
    data: {
      clerkId: "user_owner_demo_001",
      email: "owner@kinclongin.com",
      fullName: "Pak H. Ridwan (Owner Cabang)",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      clerkId: "user_manager_demo_002",
      email: "danu.operasional@kinclongin.com",
      fullName: "Danu Prakoso (Manajer Operasional)",
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  const cashierMorning = await prisma.user.create({
    data: {
      clerkId: "user_cashier_demo_001",
      email: "kasir.mataram@kinclongin.com",
      fullName: "Siti Rahma (Kasir Shift Pagi)",
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  const cashierAfternoon = await prisma.user.create({
    data: {
      clerkId: "user_cashier_demo_002",
      email: "kasir.sore@kinclongin.com",
      fullName: "Putri Anggraeni (Kasir Shift Sore)",
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  // 5. Buat Karyawan Washer Cuci (dengan PIN Kiosk Tablet)
  console.log("🧽 5. Membuat Data Pekerja Washer & PIN Kiosk Tablet...");
  const washer1 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      fullName: "Agus Santoso",
      phone: "087765432101",
      pinCode: "1234", // PIN Login Tablet Kiosk
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  const washer2 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      fullName: "Budi Pratama",
      phone: "087765432102",
      pinCode: "5678",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  const washer3 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      fullName: "Rian Hidayat",
      phone: "087765432103",
      pinCode: "9999",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  const washer4 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      fullName: "Ilham Saputra",
      phone: "087765432104",
      pinCode: "2026",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  // 6. Buat Master Paket Layanan Cuci (Lengkap untuk Semua Kategori)
  console.log("📋 6. Membuat Master Paket Layanan Cuci...");
  const servicesData = [
    // Motor Kecil
    {
      name: "Cuci Salju Motor Kecil",
      description: "Cuci bodi salju, kolong, velg, dan semir ban kering",
      vehicleCategory: VehicleCategory.MOTOR_KECIL,
      price: 15000,
      estimatedMinutes: 20,
      defaultCommission: 5000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Cuci Komplit + Semir Bodi Motor Kecil",
      description: "Cuci salju, poles bodi mengkilap, dan semir ban wet look",
      vehicleCategory: VehicleCategory.MOTOR_KECIL,
      price: 25000,
      estimatedMinutes: 30,
      defaultCommission: 8000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Motor Besar
    {
      name: "Cuci Salju Motor Besar (NMax/PCX)",
      description:
        "Cuci bodi jumbo, sela mesin, kolong belakang, dan semir ban",
      vehicleCategory: VehicleCategory.MOTOR_BESAR,
      price: 20000,
      estimatedMinutes: 25,
      defaultCommission: 7000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Cuci Komplit + Detailing Rantai Motor Besar",
      description: "Cuci bodi salju, degreaser rantai & gear, plus semir bodi",
      vehicleCategory: VehicleCategory.MOTOR_BESAR,
      price: 35000,
      estimatedMinutes: 40,
      defaultCommission: 12000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Motor Moge
    {
      name: "Cuci Premium Moge (250cc+)",
      description:
        "Cuci detail teliti, sela mesin V-Twin/In-Line, semir & wax bodi",
      vehicleCategory: VehicleCategory.MOTOR_MOGE,
      price: 50000,
      estimatedMinutes: 45,
      defaultCommission: 18000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Mobil Kecil
    {
      name: "Cuci Salju + Vacuum Mobil Kecil (Agya/Brio)",
      description:
        "Cuci bodi salju aktif, vacuum kabin, bersihkan karpet, semir ban",
      vehicleCategory: VehicleCategory.MOBIL_KECIL,
      price: 40000,
      estimatedMinutes: 35,
      defaultCommission: 12000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Cuci Komplit + Wax Proteksi Mobil Kecil",
      description:
        "Cuci hidrolik, vacuum detail, wax bodi anti jamur, parfum kabin",
      vehicleCategory: VehicleCategory.MOBIL_KECIL,
      price: 65000,
      estimatedMinutes: 50,
      defaultCommission: 20000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Mobil Sedang
    {
      name: "Cuci Salju + Vacuum Mobil Sedang (Avanza/Xpander)",
      description: "Cuci hidrolik kolong, vacuum jok & karpet, semir ban",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 50000,
      estimatedMinutes: 40,
      defaultCommission: 15000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Cuci Komplit + Wax Mobil Sedang",
      description:
        "Cuci hidrolik, semir kolong, vacuum, poles bodi wax, dan semir ban",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 75000,
      estimatedMinutes: 60,
      defaultCommission: 25000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Fogging Disinfektan Interior Mobil",
      description: "Pengasapan antibakteri aroma kopi / lemon interior kabin",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 35000,
      estimatedMinutes: 15,
      defaultCommission: 10000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Mobil Besar
    {
      name: "Cuci Salju + Vacuum Mobil Besar (Pajero/Fortuner)",
      description:
        "Cuci hidrolik kolong besar, semir ban tebal, vacuum kabin 3 baris",
      vehicleCategory: VehicleCategory.MOBIL_BESAR,
      price: 60000,
      estimatedMinutes: 50,
      defaultCommission: 18000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
    {
      name: "Cuci Hidrolik + Semir Kolong + Wax Mobil Besar",
      description:
        "Cuci lengkap kolong, poles wax kilap anti air (daun talas), interior",
      vehicleCategory: VehicleCategory.MOBIL_BESAR,
      price: 90000,
      estimatedMinutes: 70,
      defaultCommission: 30000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },

    // Kendaraan Lain
    {
      name: "Cuci Eksterior Pick-up / Mobil Box",
      description: "Cuci bersih bodi luar, bak kargo, dan semir roda",
      vehicleCategory: VehicleCategory.KENDARAAN_LAIN,
      price: 50000,
      estimatedMinutes: 40,
      defaultCommission: 15000,
      commissionType: CommissionType.FIXED_NOMINAL,
    },
  ];

  const createdServices = [];
  for (const s of servicesData) {
    const created = await prisma.servicePackage.create({
      data: {
        ...s,
        outletId: outletMataram.id,
      },
    });
    createdServices.push(created);
  }

  // 7. Buat Master Produk Ritel & Minuman
  console.log("☕ 7. Membuat Master Produk Ritel Toko Kasir...");
  const retailProductsData = [
    {
      sku: "RTL-001",
      name: "Kopi Gula Aren Dingin 250ml",
      category: "Minuman",
      costPrice: 6000,
      sellingPrice: 12000,
      stock: 50,
      minStockAlert: 10,
      imageUrl:
        "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=300&q=80",
    },
    {
      sku: "RTL-002",
      name: "Air Mineral Dingin 600ml",
      category: "Minuman",
      costPrice: 2500,
      sellingPrice: 5000,
      stock: 100,
      minStockAlert: 20,
      imageUrl:
        "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=300&q=80",
    },
    {
      sku: "RTL-003",
      name: "Parfum Mobil Aroma Kopi (Kaleng)",
      category: "Aksesoris",
      costPrice: 18000,
      sellingPrice: 35000,
      stock: 25,
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=300&q=80",
    },
    {
      sku: "RTL-004",
      name: "Kain Lap Microfiber Tebal 40x40cm",
      category: "Aksesoris",
      costPrice: 7000,
      sellingPrice: 15000,
      stock: 40,
      minStockAlert: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&q=80",
    },
    {
      sku: "RTL-005",
      name: "Keripik Singkong Balado Renyah",
      category: "Makanan",
      costPrice: 4000,
      sellingPrice: 8000,
      stock: 30,
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80",
    },
  ];

  const createdRetail = [];
  for (const p of retailProductsData) {
    const created = await prisma.retailProduct.create({
      data: {
        ...p,
        outletId: outletMataram.id,
      },
    });
    createdRetail.push(created);

    await prisma.stockMovement.create({
      data: {
        outletId: outletMataram.id,
        retailProductId: created.id,
        movementType: MovementType.IN_RESTOCK,
        quantity: p.stock,
        balanceAfter: p.stock,
        referenceNote: "Inisialisasi Stok Awal Toko",
      },
    });
  }

  // 8. Buat Master Bahan Baku Operasional Cuci
  console.log("🧪 8. Membuat Master Bahan Baku Operasional Cuci...");
  const operationalSuppliesData = [
    {
      sku: "OPS-001",
      name: "Shampo Salju Konsentrat (Touchless Pink)",
      unit: "Liter",
      stock: 150,
      minStockAlert: 20,
      usagePerCarWash: 0.1, // 100ml per mobil
      usagePerMotorWash: 0.04, // 40ml per motor
    },
    {
      sku: "OPS-002",
      name: "Silicone Emulsion Semir Ban Wet Look",
      unit: "Liter",
      stock: 50,
      minStockAlert: 10,
      usagePerCarWash: 0.05,
      usagePerMotorWash: 0.02,
    },
    {
      sku: "OPS-003",
      name: "Degreaser Pembersih Velg & Kolong",
      unit: "Liter",
      stock: 35,
      minStockAlert: 5,
      usagePerCarWash: 0.08,
      usagePerMotorWash: 0.03,
    },
    {
      sku: "OPS-004",
      name: "Interior Dressing Protectant (Matte Finish)",
      unit: "Liter",
      stock: 20,
      minStockAlert: 5,
      usagePerCarWash: 0.03,
      usagePerMotorWash: 0.01,
    },
  ];

  for (const s of operationalSuppliesData) {
    const created = await prisma.operationalSupply.create({
      data: {
        ...s,
        outletId: outletMataram.id,
      },
    });

    await prisma.stockMovement.create({
      data: {
        outletId: outletMataram.id,
        operationalSupplyId: created.id,
        movementType: MovementType.IN_RESTOCK,
        quantity: s.stock,
        balanceAfter: s.stock,
        referenceNote: "Inisialisasi Stok Bahan Baku Awal",
      },
    });
  }

  // 9. DATA MASTER MEMBER PELANGGAN & KENDARAAN TERKUNCI (CONTOH NYATA LOYALITAS)
  console.log("\n🚗 9. Membuat Data Member Pelanggan & Kendaraan Terkunci...");

  // Pelanggan 1: Ibu Linda Permata - CONTOH SIAP KLAIM PROMO CUCI 10x GRATIS 1x
  // Plat DR 1001 AB sudah 10 kali kunjungan!
  const customer1 = await prisma.customer.create({
    data: {
      phone: "085233445566",
      fullName: "Ibu Linda Permata",
      notes:
        "Pelanggan setia. Mobil Brio merah selalu minta semir ban wet look.",
      loyaltyPoints: 50,
      totalVisits: 10,
    },
  });

  const vehicle1 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 1001 AB",
      category: VehicleCategory.MOBIL_KECIL,
      brand: "Honda",
      model: "Brio RS",
      color: "Merah Rallye",
      customerId: customer1.id,
      totalVisits: 10, // KUNJUNGAN KE-10: BERHAK CUCI 10X GRATIS 1X!
    },
  });

  // Pelanggan 2: Hendra Wijaya - CONTOH SISA 1x LAGI MENUJU CUCI GRATIS KE-10
  // Plat DR 1888 XY sudah 9 kali kunjungan!
  const customer2 = await prisma.customer.create({
    data: {
      phone: "081234567890",
      fullName: "Hendra Wijaya",
      notes: "VIP Member, minta velg dipoles ekstra bersih.",
      loyaltyPoints: 35,
      totalVisits: 9,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 1888 XY",
      category: VehicleCategory.MOBIL_SEDANG,
      brand: "Mitsubishi",
      model: "Xpander Cross",
      color: "Hitam Metalik",
      customerId: customer2.id,
      totalVisits: 9, // Kunjungan ke-9 (Sisa 1x lagi menuju Cuci Gratis ke-10!)
    },
  });

  // Pelanggan 3: Budi Setiawan - CONTOH 1 PELANGGAN DENGAN 2 KENDARAAN (KUNJUNGAN TERPISAH AMAN)
  // Menunjukkan bahwa kunjungan Fortuner (5x) dan XMAX (2x) tidak dicampur aduk!
  const customer3 = await prisma.customer.create({
    data: {
      phone: "087812345678",
      fullName: "Budi Setiawan",
      notes:
        "Punya mobil Fortuner dan motor XMAX. Poin loyalitas terakumulasi di akun WA.",
      loyaltyPoints: 42,
      totalVisits: 7, // 5 kunjungan mobil + 2 kunjungan motor
    },
  });

  const vehicle3Mobil = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 7777 WQ",
      category: VehicleCategory.MOBIL_BESAR,
      brand: "Toyota",
      model: "Fortuner GR Sport",
      color: "Putih Mutiara",
      customerId: customer3.id,
      totalVisits: 5, // Kunjungan mobil: 5x
    },
  });

  const vehicle3Motor = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 3333 AZ",
      category: VehicleCategory.MOTOR_BESAR,
      brand: "Yamaha",
      model: "XMAX 250",
      color: "Matte Dark Blue",
      customerId: customer3.id,
      totalVisits: 2, // Kunjungan motor: 2x
    },
  });

  // Pelanggan 4: dr. Farhan Malik - CONTOH MEMBER VIP SALDO POIN BANYAK
  const customer4 = await prisma.customer.create({
    data: {
      phone: "081999888777",
      fullName: "dr. Farhan Malik, Sp.A",
      notes: "Suka ambil cuci komplit wax + fogging interior.",
      loyaltyPoints: 85, // Banyak poin, siap tukar poin untuk diskon
      totalVisits: 8,
    },
  });

  const vehicle4 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 88 EV",
      category: VehicleCategory.MOBIL_SEDANG,
      brand: "Hyundai",
      model: "Ioniq 5 Electric",
      color: "Gravity Gold",
      customerId: customer4.id,
      totalVisits: 8,
    },
  });

  // Pelanggan 5: Dedi Kurniawan - Motor NMax
  const customer5 = await prisma.customer.create({
    data: {
      phone: "081998877665",
      fullName: "Dedi Kurniawan",
      notes: "Suka cuci salju sambil ngopi dingin.",
      loyaltyPoints: 15,
      totalVisits: 3,
    },
  });

  const vehicle5 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 5432 KL",
      category: VehicleCategory.MOTOR_BESAR,
      brand: "Yamaha",
      model: "NMax 155 Connected",
      color: "Abu-Abu Doff",
      customerId: customer5.id,
      totalVisits: 3,
    },
  });

  // Pelanggan 6: Ahmad Zaki - Member Baru Walk-in
  const customer6 = await prisma.customer.create({
    data: {
      phone: "082145678901",
      fullName: "Ahmad Zaki",
      notes: "Walk-in pertama kali.",
      loyaltyPoints: 5,
      totalVisits: 1,
    },
  });

  const vehicle6 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 1234 BZ",
      category: VehicleCategory.MOBIL_SEDANG,
      brand: "Toyota",
      model: "Innova Zenix",
      color: "Silver Metallic",
      customerId: customer6.id,
      totalVisits: 1,
    },
  });

  // 10. Buat Log Loyalitas Masa Lalu (CustomerLoyaltyLog)
  console.log("📜 10. Membuat Riwayat Mutasi Poin Loyalitas & Reward...");
  await prisma.customerLoyaltyLog.createMany({
    data: [
      {
        customerId: customer1.id,
        pointsChanged: 4,
        balanceAfter: 46,
        description: "Poin transaksi cuci Brio RS (#KNC-20260915-012)",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer1.id,
        pointsChanged: 4,
        balanceAfter: 50,
        description: "Poin transaksi cuci Brio RS (#KNC-20260925-008)",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer2.id,
        pointsChanged: 5,
        balanceAfter: 35,
        description: "Poin transaksi cuci Xpander (#KNC-20260928-004)",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer4.id,
        pointsChanged: 11,
        balanceAfter: 85,
        description:
          "Poin transaksi cuci Ioniq 5 + Fogging (#KNC-20260920-001)",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // 11. BUAT TIKET ANTREAN KANBAN LIVE (SEMUA STATUS: QUEUED, WASHING, DRYING, READY, COMPLETED)
  console.log("🎫 11. Membuat Tiket Antrean Kanban Live (Semua Status)...");

  const serviceMobilSedang = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Sedang (Avanza/Xpander)"
  )!;
  const serviceMotorBesar = createdServices.find(
    (s) => s.name === "Cuci Salju Motor Besar (NMax/PCX)"
  )!;
  const serviceMobilKecil = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Kecil (Agya/Brio)"
  )!;
  const serviceMobilBesar = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Besar (Pajero/Fortuner)"
  )!;
  const serviceMobilKomplit = createdServices.find(
    (s) => s.name === "Cuci Komplit + Wax Mobil Sedang"
  )!;

  // TIKET 1: Status READY (Brio Merah Linda - SIAP KLAIM CUCI 10X GRATIS DI KASIR!)
  const ticketReady = await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-001",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      licensePlate: vehicle1.licensePlate,
      vehicleCategory: vehicle1.category,
      servicePackageId: serviceMobilKecil.id,
      servicePrice: serviceMobilKecil.price,
      status: TicketStatus.READY, // SUDAH SELESAI, SIAP DI KASIR
      initialNotes: "Kondisi mulus, minta semir ban wet look.",
      washingStartedAt: new Date(Date.now() - 45 * 60 * 1000),
      dryingStartedAt: new Date(Date.now() - 20 * 60 * 1000),
      readyAt: new Date(Date.now() - 5 * 60 * 1000),
      subtotalServices: serviceMobilKecil.price,
      subtotalRetail: 0,
      totalAmount: serviceMobilKecil.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketReady.id,
      employeeId: washer1.id,
      commissionAmount: serviceMobilKecil.defaultCommission,
    },
  });

  // TIKET 2: Status DRYING (Motor NMax Dedi - Sedang Dikeringkan & Poles Rantai)
  const ticketDrying = await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-002",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer5.id,
      vehicleId: vehicle5.id,
      licensePlate: vehicle5.licensePlate,
      vehicleCategory: vehicle5.category,
      servicePackageId: serviceMotorBesar.id,
      servicePrice: serviceMotorBesar.price,
      status: TicketStatus.DRYING,
      initialNotes: "Sela radiator agak berdebu.",
      washingStartedAt: new Date(Date.now() - 30 * 60 * 1000),
      dryingStartedAt: new Date(Date.now() - 8 * 60 * 1000),
      subtotalServices: serviceMotorBesar.price,
      subtotalRetail: 12000, // Ada beli kopi dingin
      totalAmount: Number(serviceMotorBesar.price) + 12000,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketDrying.id,
      employeeId: washer3.id,
      commissionAmount: serviceMotorBesar.defaultCommission,
    },
  });

  await prisma.ticketRetailItem.create({
    data: {
      ticketId: ticketDrying.id,
      retailProductId: createdRetail[0].id, // Kopi Dingin
      quantity: 1,
      unitPrice: 12000,
      subtotal: 12000,
    },
  });

  // TIKET 3: Status WASHING (Mobil Xpander Hendra - Sedang Dicuci Hidrolik Salju)
  const ticketWashing = await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-003",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer2.id,
      vehicleId: vehicle2.id,
      licensePlate: vehicle2.licensePlate,
      vehicleCategory: vehicle2.category,
      servicePackageId: serviceMobilSedang.id,
      servicePrice: serviceMobilSedang.price,
      status: TicketStatus.WASHING,
      initialNotes: "Kolong banyak tanah merah sehabis dari Lombok Timur.",
      washingStartedAt: new Date(Date.now() - 15 * 60 * 1000),
      subtotalServices: serviceMobilSedang.price,
      subtotalRetail: 0,
      totalAmount: serviceMobilSedang.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketWashing.id,
      employeeId: washer2.id,
      commissionAmount: serviceMobilSedang.defaultCommission,
    },
  });

  // TIKET 4: Status QUEUED (Fortuner Budi - Baru Masuk Antrean)
  await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-004",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer3.id,
      vehicleId: vehicle3Mobil.id,
      licensePlate: vehicle3Mobil.licensePlate,
      vehicleCategory: vehicle3Mobil.category,
      servicePackageId: serviceMobilBesar.id,
      servicePrice: serviceMobilBesar.price,
      status: TicketStatus.QUEUED,
      initialNotes: "Mobil tinggi, gunakan tangga cuci atap.",
      subtotalServices: serviceMobilBesar.price,
      subtotalRetail: 0,
      totalAmount: serviceMobilBesar.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // 12. TIKET SELESAI (COMPLETED) & PEMBAYARAN SUKSES HARI INI
  console.log("💰 12. Membuat Riwayat Transaksi Selesai & Pembayaran Kasir...");

  // Transaksi Selesai 1: Ioniq 5 dr. Farhan (Lunas QRIS Rp 110.000)
  const ticketCompleted1 = await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-000A",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer4.id,
      vehicleId: vehicle4.id,
      licensePlate: vehicle4.licensePlate,
      vehicleCategory: vehicle4.category,
      servicePackageId: serviceMobilKomplit.id,
      servicePrice: serviceMobilKomplit.price,
      status: TicketStatus.COMPLETED,
      initialNotes: "Wax bodi mengkilap anti air.",
      washingStartedAt: new Date(Date.now() - 120 * 60 * 1000),
      dryingStartedAt: new Date(Date.now() - 75 * 60 * 1000),
      readyAt: new Date(Date.now() - 35 * 60 * 1000),
      completedAt: new Date(Date.now() - 25 * 60 * 1000),
      subtotalServices: serviceMobilKomplit.price, // 75.000
      subtotalRetail: 35000, // Parfum Mobil
      totalAmount: 110000,
      paidAmount: 110000,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketCompleted1.id,
      employeeId: washer4.id,
      commissionAmount: serviceMobilKomplit.defaultCommission,
      isPaidToWasher: false,
    },
  });

  await prisma.ticketRetailItem.create({
    data: {
      ticketId: ticketCompleted1.id,
      retailProductId: createdRetail[2].id, // Parfum Mobil
      quantity: 1,
      unitPrice: 35000,
      subtotal: 35000,
    },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticketCompleted1.id,
      outletId: outletMataram.id,
      cashierId: cashierMorning.id,
      method: PaymentMethod.QRIS,
      status: PaymentStatus.PAID,
      totalAmount: 110000,
      referenceNumber: "QRIS-NMID-99281729102",
      paidAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });

  // Transaksi Selesai 2: Innova Zenix Ahmad Zaki (Lunas Tunai CASH Rp 50.000)
  const ticketCompleted2 = await prisma.washTicket.create({
    data: {
      ticketNumber: "KNC-20261001-000B",
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer6.id,
      vehicleId: vehicle6.id,
      licensePlate: vehicle6.licensePlate,
      vehicleCategory: vehicle6.category,
      servicePackageId: serviceMobilSedang.id,
      servicePrice: serviceMobilSedang.price,
      status: TicketStatus.COMPLETED,
      initialNotes: "Walk-in baru.",
      washingStartedAt: new Date(Date.now() - 90 * 60 * 1000),
      dryingStartedAt: new Date(Date.now() - 50 * 60 * 1000),
      readyAt: new Date(Date.now() - 20 * 60 * 1000),
      completedAt: new Date(Date.now() - 15 * 60 * 1000),
      subtotalServices: serviceMobilSedang.price,
      subtotalRetail: 0,
      totalAmount: serviceMobilSedang.price,
      paidAmount: serviceMobilSedang.price,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketCompleted2.id,
      employeeId: washer1.id,
      commissionAmount: serviceMobilSedang.defaultCommission,
      isPaidToWasher: false,
    },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticketCompleted2.id,
      outletId: outletMataram.id,
      cashierId: cashierMorning.id,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      totalAmount: 50000,
      cashGiven: 100000,
      changeGiven: 50000,
      paidAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  // 13. Log WhatsApp dan Audit Log
  console.log("📲 13. Membuat Log Notifikasi WhatsApp & Audit Trail...");
  await prisma.whatsAppLog.create({
    data: {
      ticketId: ticketReady.id,
      recipientPhone: customer1.phone,
      messageType: "STATUS_READY",
      status: WhatsAppDeliveryStatus.SENT,
      sentAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  await prisma.whatsAppLog.create({
    data: {
      ticketId: ticketCompleted1.id,
      recipientPhone: customer4.phone,
      messageType: "RECEIPT",
      status: WhatsAppDeliveryStatus.DELIVERED,
      sentAt: new Date(Date.now() - 24 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      outletId: outletMataram.id,
      actorId: cashierMorning.id,
      actorRole: "CASHIER",
      action: "TICKET_CREATED",
      entityType: "WashTicket",
      entityId: ticketReady.id,
      metadata: {
        ticketNumber: ticketReady.ticketNumber,
        plate: ticketReady.licensePlate,
      },
    },
  });

  console.log("\n=========================================================");
  console.log("🎉 SEEDING KINCLONGIN BERHASIL 100%!");
  console.log("=========================================================");
  console.log(`
  📊 Ringkasan Data Master yang Dibuat:
  ---------------------------------------------------------
  1. Cabang Outlet     : 2 Cabang (${outletMataram.name}, ${outletRembiga.name})
  2. Akun Pengguna     : 4 User (Owner, Manajer, 2 Kasir Shift)
  3. Karyawan Washer   : 4 Pekerja Cuci dengan PIN Kiosk:
                         - Agus Santoso  (PIN: 1234)
                         - Budi Pratama  (PIN: 5678)
                         - Rian Hidayat  (PIN: 9999)
                         - Ilham Saputra (PIN: 2026)
  4. Paket Layanan     : ${createdServices.length} Paket Cuci (Motor & Mobil)
  5. Produk Ritel      : ${createdRetail.length} Item Ritel Toko & Minuman
  6. Bahan Baku Cuci   : ${operationalSuppliesData.length} Jenis Formula Shampo/Semir
  7. Member Pelanggan  : 6 Pelanggan & 7 Kendaraan Terkunci:
                         • Ibu Linda Permata (DR 1001 AB) -> KUNJUNGAN KE-10 (SIAP CUCI GRATIS!)
                         • Hendra Wijaya (DR 1888 XY)     -> Kunjungan ke-9 (Sisa 1x lagi!)
                         • Budi Setiawan (Multi-Kendaraan)-> Fortuner (5x), XMAX (2x) Terkunci Aman
                         • dr. Farhan Malik (DR 88 EV)    -> Saldo 85 Poin Loyalitas
                         • Dedi Kurniawan (DR 5432 KL)    -> Motor NMax (3x Kunjungan)
                         • Ahmad Zaki (DR 1234 BZ)        -> Member Baru Walk-in (1x)
  8. Tiket Antrean POS : 4 Tiket Berjalan di Kanban:
                         - READY    : Plat DR 1001 AB (Siap Klaim Promo Cuci 10x di Kasir)
                         - DRYING   : Plat DR 5432 KL (NMax sedang dilap)
                         - WASHING  : Plat DR 1888 XY (Xpander di pit basah)
                         - QUEUED   : Plat DR 7777 WQ (Fortuner di antrean masuk)
  9. Transaksi Lunas   : 2 Tiket Selesai (QRIS Rp 110rb & CASH Rp 50rb)
  10. Riwayat Langganan: 1 Langganan SaaS Cabang (Rp 300.000 / 6 Bulan Approved)
  ---------------------------------------------------------
  `);
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan fatal saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
