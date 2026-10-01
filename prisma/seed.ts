import bcrypt from "bcryptjs";

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
  console.log("🧼 MEMULAI SEEDING DATA LENGKAP KINCLONGIN POS & SAAS SYSTEM");
  console.log("🧼 =========================================================");

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

  // 1. Bersihkan tabel lama agar seeding bersih dan idenpoten
  console.log("\n🧹 1. Membersihkan database lama...");
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

  // 2. Buat Pengguna Utama Cabang (Owner terlebih dahulu agar dapat ditautkan ke Outlet)
  console.log("👤 2. Membuat Akun Pengguna Utama (Owner)...");
  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Pak H. Ridwan (Owner Cabang)",
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      avatarUrl:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80",
    },
  });

  // 3. Buat Cabang Outlet (Multi-Tenant Manual Demo: 3 Cabang)
  console.log("\n🏢 3. Membuat Cabang Outlet Demo (3 Cabang Multi-Tenant)...");
  const outletMataram = await prisma.outlet.create({
    data: {
      name: "Kinclongin Cabang Pusat Mataram",
      slug: "kinclongin-pusat-mataram",
      address: "Jl. Pejanggik No. 88, Cakranegara, Kota Mataram, NTB",
      phone: "081912345678",
      logoUrl:
        "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&q=80",
      waGatewayApiKey: "WA_KNC_DEMO_KEY_MATARAM",
      waSenderNumber: "6281912345678",
      ownerId: ownerUser.id,
      isActive: true,
    },
  });

  const outletRembiga = await prisma.outlet.create({
    data: {
      name: "Kinclongin Express Rembiga",
      slug: "kinclongin-express-rembiga",
      address: "Jl. Dr. Wahidin No. 45, Rembiga, Kota Mataram, NTB",
      phone: "081987654321",
      logoUrl:
        "https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=400&q=80",
      waGatewayApiKey: "WA_KNC_DEMO_KEY_REMBIGA",
      waSenderNumber: "6281987654321",
      ownerId: ownerUser.id,
      isActive: true,
    },
  });

  const outletSenggigi = await prisma.outlet.create({
    data: {
      name: "Kinclongin Auto Spa & Detailing Senggigi",
      slug: "kinclongin-autospa-senggigi",
      address: "Jl. Raya Senggigi KM 8, Batu Layar, Lombok Barat, NTB",
      phone: "081933445566",
      logoUrl:
        "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&q=80",
      waGatewayApiKey: "WA_KNC_DEMO_KEY_SENGGIGI",
      waSenderNumber: "6281933445566",
      ownerId: ownerUser.id,
      isActive: true,
    },
  });

  // Tautkan outletId aktif untuk Owner (default ke Mataram Pusat)
  await prisma.user.update({
    where: { id: ownerUser.id },
    data: { outletId: outletMataram.id },
  });

  // Buat Manajer & Kasir Mataram
  console.log("👥 4. Membuat Akun Manajer & Kasir Shift...");
  const managerUser = await prisma.user.create({
    data: {
      email: "danu.operasional@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Danu Prakoso (Manajer Operasional)",
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  const cashierMorning = await prisma.user.create({
    data: {
      email: "kasir.mataram@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Siti Rahma (Kasir Shift Pagi)",
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  const cashierAfternoon = await prisma.user.create({
    data: {
      email: "kasir.sore@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Putri Anggraeni (Kasir Shift Sore)",
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });

  // Staf Cabang Rembiga
  const managerRembiga = await prisma.user.create({
    data: {
      email: "manager.rembiga@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Rian Saputra (Manajer Rembiga)",
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      outletId: outletRembiga.id,
    },
  });

  const cashierRembiga = await prisma.user.create({
    data: {
      email: "kasir.rembiga@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Dina Marlina (Kasir Rembiga)",
      role: UserRole.CASHIER,
      status: UserStatus.ACTIVE,
      outletId: outletRembiga.id,
    },
  });

  // Contoh Akun Suspended & Inactive (untuk menguji filter status pengguna di dasbor)
  await prisma.user.create({
    data: {
      email: "mantan.kasir@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Hadi Wijaya (Kasir Non-Aktif)",
      role: UserRole.CASHIER,
      status: UserStatus.SUSPENDED,
      outletId: outletMataram.id,
    },
  });

  // 5. Buat Karyawan Washer Cuci & Hubungkan ke Akun Pengguna + PIN Kiosk
  console.log("🧽 5. Membuat Karyawan Washer Cuci & PIN Kiosk Tablet...");

  // Washer 1: Agus Santoso (PIN: 1234)
  const userWasher1 = await prisma.user.create({
    data: {
      email: "agus.washer@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Agus Santoso",
      role: UserRole.WASHER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });
  const washer1 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      userId: userWasher1.id,
      fullName: "Agus Santoso",
      phone: "087765432101",
      pinCode: "1234",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  // Washer 2: Budi Pratama (PIN: 5678)
  const userWasher2 = await prisma.user.create({
    data: {
      email: "budi.washer@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Budi Pratama",
      role: UserRole.WASHER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });
  const washer2 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      userId: userWasher2.id,
      fullName: "Budi Pratama",
      phone: "087765432102",
      pinCode: "5678",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 12000,
      isActive: true,
    },
  });

  // Washer 3: Rian Hidayat (PIN: 9999)
  const userWasher3 = await prisma.user.create({
    data: {
      email: "rian.washer@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Rian Hidayat",
      role: UserRole.WASHER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });
  const washer3 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      userId: userWasher3.id,
      fullName: "Rian Hidayat",
      phone: "087765432103",
      pinCode: "9999",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 10000,
      isActive: true,
    },
  });

  // Washer 4: Ilham Saputra (PIN: 2026)
  const userWasher4 = await prisma.user.create({
    data: {
      email: "ilham.washer@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Ilham Saputra",
      role: UserRole.WASHER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });
  const washer4 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      userId: userWasher4.id,
      fullName: "Ilham Saputra",
      phone: "087765432104",
      pinCode: "2026",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 10000,
      isActive: true,
    },
  });

  // Washer 5: Fajar Ramadhan (PIN: 1122 - Komisi Persentase 25%)
  const userWasher5 = await prisma.user.create({
    data: {
      email: "fajar.washer@kinclongin.com",
      passwordHash: defaultPasswordHash,
      fullName: "Fajar Ramadhan",
      role: UserRole.WASHER,
      status: UserStatus.ACTIVE,
      outletId: outletMataram.id,
    },
  });
  const washer5 = await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      userId: userWasher5.id,
      fullName: "Fajar Ramadhan",
      phone: "087765432105",
      pinCode: "1122",
      role: UserRole.WASHER,
      commissionType: CommissionType.PERCENTAGE,
      commissionRate: 25,
      isActive: true,
    },
  });

  // Washer 6 (Tidak Aktif - Menguji filter status karyawan)
  await prisma.employee.create({
    data: {
      outletId: outletMataram.id,
      fullName: "Joko Widodo (Alumni Staf)",
      phone: "087765432109",
      pinCode: "4321",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 10000,
      isActive: false,
    },
  });

  // Karyawan Cabang Rembiga
  const washerRembiga1 = await prisma.employee.create({
    data: {
      outletId: outletRembiga.id,
      fullName: "Dadan Hermansyah",
      phone: "087711223344",
      pinCode: "3344",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 10000,
      isActive: true,
    },
  });

  const washerRembiga2 = await prisma.employee.create({
    data: {
      outletId: outletRembiga.id,
      fullName: "Eko Prasetyo",
      phone: "087711223355",
      pinCode: "5566",
      role: UserRole.WASHER,
      commissionType: CommissionType.FIXED_NOMINAL,
      commissionRate: 10000,
      isActive: true,
    },
  });

  // 6. Buat Master Paket Layanan Cuci (Semua 7 Kategori Kendaraan + Variasi Komisi)
  console.log("📋 6. Membuat Master Paket Layanan Cuci (7 Kategori)...");
  const servicesData = [
    // 1. MOTOR KECIL (Bebek, Matic 110-125cc: Beat, Vario, Scoopy, Mio)
    {
      name: "Cuci Salju Motor Kecil",
      description: "Cuci bodi salju, kolong, velg, dan semir ban kering",
      vehicleCategory: VehicleCategory.MOTOR_KECIL,
      price: 15000,
      estimatedMinutes: 20,
      defaultCommission: 5000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },
    {
      name: "Cuci Komplit + Semir Bodi Motor Kecil",
      description: "Cuci salju, poles bodi mengkilap, dan semir ban wet look",
      vehicleCategory: VehicleCategory.MOTOR_KECIL,
      price: 25000,
      estimatedMinutes: 30,
      defaultCommission: 8000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },

    // 2. MOTOR BESAR (NMax, PCX, Vespa, Aerox, ADV, 150-250cc)
    {
      name: "Cuci Salju Motor Besar (NMax/PCX)",
      description:
        "Cuci bodi jumbo, sela mesin, kolong belakang, dan semir ban",
      vehicleCategory: VehicleCategory.MOTOR_BESAR,
      price: 20000,
      estimatedMinutes: 25,
      defaultCommission: 7000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },
    {
      name: "Cuci Komplit + Detailing Rantai Motor Besar",
      description: "Cuci bodi salju, degreaser rantai & gear, plus semir bodi",
      vehicleCategory: VehicleCategory.MOTOR_BESAR,
      price: 35000,
      estimatedMinutes: 40,
      defaultCommission: 12000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },

    // 3. MOTOR MOGE (250cc+, Harley, Ninja ZX, Trail, Big Bike)
    {
      name: "Cuci Premium Moge (250cc+)",
      description:
        "Cuci detail teliti, sela mesin V-Twin/In-Line, semir & wax bodi",
      vehicleCategory: VehicleCategory.MOTOR_MOGE,
      price: 50000,
      estimatedMinutes: 45,
      defaultCommission: 18000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },
    {
      name: "Detailing Engine & Ceramic Wax Moge",
      description:
        "Deep cleaning ruang mesin, coating pelindung knalpot, wax bodi",
      vehicleCategory: VehicleCategory.MOTOR_MOGE,
      price: 120000,
      estimatedMinutes: 75,
      defaultCommission: 35000,
      commissionType: CommissionType.PERCENTAGE,
      isActive: true,
    },

    // 4. MOBIL KECIL (Brio, Agya, Ayla, Yaris, Raize, Hatchback)
    {
      name: "Cuci Salju + Vacuum Mobil Kecil (Agya/Brio)",
      description:
        "Cuci bodi salju aktif, vacuum kabin, bersihkan karpet, semir ban",
      vehicleCategory: VehicleCategory.MOBIL_KECIL,
      price: 40000,
      estimatedMinutes: 35,
      defaultCommission: 12000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
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
      isActive: true,
    },

    // 5. MOBIL SEDANG (Avanza, Xpander, HR-V, Innova Zenix, Sedan)
    {
      name: "Cuci Salju + Vacuum Mobil Sedang (Avanza/Xpander)",
      description: "Cuci hidrolik kolong, vacuum jok & karpet, semir ban",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 50000,
      estimatedMinutes: 40,
      defaultCommission: 15000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
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
      isActive: true,
    },
    {
      name: "Fogging Disinfektan Interior Mobil",
      description: "Pengasapan antibakteri aroma kopi / lemon interior kabin",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 35000,
      estimatedMinutes: 15,
      defaultCommission: 10000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },

    // 6. MOBIL BESAR (Pajero, Fortuner, Alphard, Double Cabin, Land Cruiser)
    {
      name: "Cuci Salju + Vacuum Mobil Besar (Pajero/Fortuner)",
      description:
        "Cuci hidrolik kolong besar, semir ban tebal, vacuum kabin 3 baris",
      vehicleCategory: VehicleCategory.MOBIL_BESAR,
      price: 60000,
      estimatedMinutes: 50,
      defaultCommission: 18000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
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
      isActive: true,
    },
    {
      name: "Deep Cleaning Interior & Plafon Mobil Besar",
      description:
        "Pencucian jok, plafon fabric, karpet dasar tebal, dan antibakteri",
      vehicleCategory: VehicleCategory.MOBIL_BESAR,
      price: 175000,
      estimatedMinutes: 90,
      defaultCommission: 45000,
      commissionType: CommissionType.PERCENTAGE,
      isActive: true,
    },

    // 7. KENDARAAN LAIN (Pick-up, Blind Van, Truk Engkel Box)
    {
      name: "Cuci Eksterior Pick-up / Mobil Box",
      description: "Cuci bersih bodi luar, bak kargo, dan semir roda",
      vehicleCategory: VehicleCategory.KENDARAAN_LAIN,
      price: 50000,
      estimatedMinutes: 40,
      defaultCommission: 15000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },
    {
      name: "Cuci Kolong & Bodi Truk Engkel",
      description: "Semprot hidrolik bertekanan tinggi sasis & kolong lumpur",
      vehicleCategory: VehicleCategory.KENDARAAN_LAIN,
      price: 85000,
      estimatedMinutes: 60,
      defaultCommission: 25000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: true,
    },

    // 8. Paket Layanan Tidak Aktif (Contoh Arsip Promo)
    {
      name: "Paket Promo Kemerdekaan (Arsip)",
      description: "Diskon cuci khusus bulan Agustus",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      price: 35000,
      estimatedMinutes: 30,
      defaultCommission: 10000,
      commissionType: CommissionType.FIXED_NOMINAL,
      isActive: false,
    },
  ];

  const createdServices: Array<
    Awaited<ReturnType<typeof prisma.servicePackage.create>>
  > = [];
  for (const s of servicesData) {
    const created = await prisma.servicePackage.create({
      data: {
        ...s,
        outletId: outletMataram.id,
      },
    });
    createdServices.push(created);
  }

  // Paket Layanan Cabang Rembiga (Sebagian)
  for (const s of servicesData.slice(0, 6)) {
    await prisma.servicePackage.create({
      data: {
        ...s,
        outletId: outletRembiga.id,
      },
    });
  }

  // 7. Buat Master Produk Ritel & Minuman (Semua Status Stok)
  console.log(
    "☕ 7. Membuat Master Produk Ritel Toko Kasir (Semua Status Stok)..."
  );
  const retailProductsData = [
    // Stok Normal
    {
      sku: "RTL-001",
      name: "Kopi Gula Aren Dingin 250ml",
      category: "Minuman",
      costPrice: 6000,
      sellingPrice: 12000,
      stock: 45,
      minStockAlert: 10,
      imageUrl:
        "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=300&q=80",
      isActive: true,
    },
    {
      sku: "RTL-002",
      name: "Air Mineral Dingin 600ml",
      category: "Minuman",
      costPrice: 2500,
      sellingPrice: 5000,
      stock: 90,
      minStockAlert: 20,
      imageUrl:
        "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=300&q=80",
      isActive: true,
    },
    {
      sku: "RTL-003",
      name: "Teh Kotak Melati Dingin",
      category: "Minuman",
      costPrice: 3000,
      sellingPrice: 6000,
      stock: 40,
      minStockAlert: 10,
      imageUrl:
        "https://images.unsplash.com/photo-1556881286-fc6915169721?w=300&q=80",
      isActive: true,
    },
    {
      sku: "RTL-004",
      name: "Keripik Singkong Balado Renyah",
      category: "Makanan",
      costPrice: 4000,
      sellingPrice: 8000,
      stock: 25,
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80",
      isActive: true,
    },
    {
      sku: "RTL-005",
      name: "Kain Lap Microfiber Tebal 40x40cm",
      category: "Aksesoris",
      costPrice: 7000,
      sellingPrice: 15000,
      stock: 35,
      minStockAlert: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&q=80",
      isActive: true,
    },

    // Stok Menipis (Trigger Alert: stock <= minStockAlert)
    {
      sku: "RTL-006",
      name: "Parfum Mobil Aroma Kopi (Kaleng)",
      category: "Aksesoris",
      costPrice: 18000,
      sellingPrice: 35000,
      stock: 3, // TRIGGER ALERT STOK MENIPIS!
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=300&q=80",
      isActive: true,
    },
    {
      sku: "RTL-007",
      name: "Wiper Fluid Konsentrat Rain-X",
      category: "Aksesoris",
      costPrice: 15000,
      sellingPrice: 28000,
      stock: 2, // TRIGGER ALERT STOK MENIPIS!
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&q=80",
      isActive: true,
    },

    // Stok Habis (Stok = 0)
    {
      sku: "RTL-008",
      name: "Phone Holder Magnetik Dashboard",
      category: "Aksesoris",
      costPrice: 22000,
      sellingPrice: 45000,
      stock: 0, // HABIS TOTAL
      minStockAlert: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=300&q=80",
      isActive: true,
    },

    // Produk Non-Aktif
    {
      sku: "RTL-009",
      name: "Bantal Leher Memory Foam",
      category: "Aksesoris",
      costPrice: 35000,
      sellingPrice: 65000,
      stock: 10,
      minStockAlert: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=300&q=80",
      isActive: false, // TIDAK AKTIF
    },
  ];

  const createdRetail: Array<
    Awaited<ReturnType<typeof prisma.retailProduct.create>>
  > = [];
  for (const p of retailProductsData) {
    const created = await prisma.retailProduct.create({
      data: {
        ...p,
        outletId: outletMataram.id,
      },
    });
    createdRetail.push(created);

    if (p.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          outletId: outletMataram.id,
          retailProductId: created.id,
          movementType: MovementType.IN_RESTOCK,
          quantity: p.stock,
          balanceAfter: p.stock,
          referenceNote: "Inisialisasi Saldo Awal Gudang Ritel",
        },
      });
    }
  }

  // 8. Buat Master Bahan Baku Operasional Cuci
  console.log("🧪 8. Membuat Master Bahan Baku Operasional Cuci...");
  const operationalSuppliesData = [
    {
      sku: "OPS-001",
      name: "Shampo Salju Konsentrat (Touchless Pink)",
      unit: "Liter",
      stock: 125,
      minStockAlert: 20,
      usagePerCarWash: 0.1, // 100ml per mobil
      usagePerMotorWash: 0.04, // 40ml per motor
    },
    {
      sku: "OPS-002",
      name: "Silicone Emulsion Semir Ban Wet Look",
      unit: "Liter",
      stock: 45,
      minStockAlert: 10,
      usagePerCarWash: 0.05,
      usagePerMotorWash: 0.02,
    },
    {
      sku: "OPS-003",
      name: "Degreaser Pembersih Velg & Kolong",
      unit: "Liter",
      stock: 28,
      minStockAlert: 8,
      usagePerCarWash: 0.08,
      usagePerMotorWash: 0.03,
    },
    {
      sku: "OPS-004",
      name: "Interior Dressing Protectant (Matte Finish)",
      unit: "Liter",
      stock: 4, // ALERT STOK MENIPIS!
      minStockAlert: 5,
      usagePerCarWash: 0.03,
      usagePerMotorWash: 0.01,
    },
    {
      sku: "OPS-005",
      name: "Cairan Fogging Disinfektan Aroma Kopi",
      unit: "Liter",
      stock: 18,
      minStockAlert: 4,
      usagePerCarWash: 0.05,
      usagePerMotorWash: 0.0,
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
        referenceNote: "Penerimaan Pasokan Bahan Formula Cuci",
      },
    });
  }

  // 9. DATA MASTER MEMBER PELANGGAN & KENDARAAN (SEMUA CONTOH KASUS LOYALITAS)
  console.log("\n🚗 9. Membuat Data Member Pelanggan & Kendaraan Terkunci...");

  // Pelanggan 1: Ibu Linda Permata - CONTOH SIAP KLAIM PROMO CUCI 10x GRATIS 1x
  // Plat DR 1001 AB sudah 10 kali kunjungan!
  const customer1 = await prisma.customer.create({
    data: {
      phone: "085233445566",
      fullName: "Ibu Linda Permata",
      notes:
        "Pelanggan setia sejak 2024. Brio merah selalu minta semir ban wet look.",
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
      totalVisits: 10, // KUNJUNGAN KE-10: BERHAK KLAIM CUCI 10X GRATIS 1X!
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

  // Pelanggan 3: Budi Setiawan - CONTOH 1 PELANGGAN 2 KENDARAAN (KUNJUNGAN INDEPENDEN AMAN)
  // Menunjukkan bahwa Fortuner (5x) dan XMAX (2x) tidak dicampur aduk!
  const customer3 = await prisma.customer.create({
    data: {
      phone: "087812345678",
      fullName: "Budi Setiawan",
      notes:
        "Punya mobil Fortuner dan motor XMAX. Poin loyalitas terakumulasi di akun WA.",
      loyaltyPoints: 42,
      totalVisits: 7, // 5 mobil + 2 motor
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
      totalVisits: 5,
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
      totalVisits: 2,
    },
  });

  // Pelanggan 4: dr. Farhan Malik - CONTOH MEMBER VIP SALDO POIN BANYAK
  const customer4 = await prisma.customer.create({
    data: {
      phone: "081999888777",
      fullName: "dr. Farhan Malik, Sp.A",
      notes: "Suka ambil cuci komplit wax + fogging interior.",
      loyaltyPoints: 85, // Siap redeem diskon poin
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

  // Pelanggan 6: Ahmad Zaki - Walk-in Pertama Kali
  const customer6 = await prisma.customer.create({
    data: {
      phone: "082145678901",
      fullName: "Ahmad Zaki",
      notes: "Walk-in baru pertama kali.",
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

  // Pelanggan 7: Ibu Ratna Dewi - Member Langganan Cuci Bulanan Unlimited
  const customer7 = await prisma.customer.create({
    data: {
      phone: "081333777888",
      fullName: "Ibu Ratna Dewi",
      notes: "Member bulanan unlimited motor matic.",
      loyaltyPoints: 20,
      totalVisits: 4,
    },
  });

  const vehicle7 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 2222 KL",
      category: VehicleCategory.MOTOR_KECIL,
      brand: "Honda",
      model: "Scoopy Prestige",
      color: "Putih Mutiara",
      customerId: customer7.id,
      totalVisits: 4,
    },
  });

  // Pelanggan 8: Rudi Hartono - Niaga Pick-up
  const customer8 = await prisma.customer.create({
    data: {
      phone: "085999111222",
      fullName: "Rudi Hartono",
      notes: "Armada operasional toko bangunan.",
      loyaltyPoints: 24,
      totalVisits: 6,
    },
  });

  const vehicle8 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 4567 TY",
      category: VehicleCategory.KENDARAAN_LAIN,
      brand: "Suzuki",
      model: "Carry Pick-up",
      color: "Hitam Solid",
      customerId: customer8.id,
      totalVisits: 6,
    },
  });

  // Pelanggan 9: Kevin Sanjaya - Moge Ninja ZX
  const customer9 = await prisma.customer.create({
    data: {
      phone: "081777222333",
      fullName: "Kevin Sanjaya",
      notes:
        "Komunitas motor sport, selalu minta detailing rantai & sela mesin.",
      loyaltyPoints: 28,
      totalVisits: 4,
    },
  });

  const vehicle9 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 9999 ZX",
      category: VehicleCategory.MOTOR_MOGE,
      brand: "Kawasaki",
      model: "Ninja ZX-25R",
      color: "Lime Green",
      customerId: customer9.id,
      totalVisits: 4,
    },
  });

  // Pelanggan 10: Siti Nurhaliza - Yaris Cross
  const customer10 = await prisma.customer.create({
    data: {
      phone: "082333444555",
      fullName: "Siti Nurhaliza",
      notes: "Pelanggan baru area Cakranegara.",
      loyaltyPoints: 12,
      totalVisits: 2,
    },
  });

  const vehicle10 = await prisma.vehicle.create({
    data: {
      licensePlate: "DR 5555 YC",
      category: VehicleCategory.MOBIL_KECIL,
      brand: "Toyota",
      model: "Yaris Cross",
      color: "Putih",
      customerId: customer10.id,
      totalVisits: 2,
    },
  });

  // 10. Buat Langganan Member Pelanggan (CustomerMembership - Semua Status)
  console.log(
    "💳 10. Membuat Contoh Langganan Member Cuci (CustomerMembership)..."
  );

  // Contoh 1: Aktif dengan Sisa Kuota (dr. Farhan)
  const membershipFarhan = await prisma.customerMembership.create({
    data: {
      customerId: customer4.id,
      outletId: outletMataram.id,
      planName: "Paket Hemat 4x Cuci / Bulan",
      price: 180000,
      startDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      totalQuota: 4,
      remainingQuota: 2, // Sisa 2 kuota cuci
      discountPercent: 10,
      paymentMethod: PaymentMethod.QRIS,
      paymentRef: "QRIS-MEM-0091",
      cashierId: cashierMorning.id,
      notes: "Member aktif, diskon ritel 10%",
    },
  });

  // Contoh 2: Aktif Unlimited Motor (Ibu Ratna Dewi)
  const membershipRatna = await prisma.customerMembership.create({
    data: {
      customerId: customer7.id,
      outletId: outletMataram.id,
      planName: "VIP Unlimited Express Cuci Motor (1 Bulan)",
      price: 150000,
      startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      totalQuota: 999, // Unlimited
      remainingQuota: 999,
      discountPercent: 15,
      paymentMethod: PaymentMethod.CASH,
      cashierId: cashierMorning.id,
      notes: "Unlimited cuci motor Scoopy putih",
    },
  });

  // Contoh 3: Aktif Kuota Sisa 1x (Hendra Wijaya)
  await prisma.customerMembership.create({
    data: {
      customerId: customer2.id,
      outletId: outletMataram.id,
      planName: "Paket Komplit 5x Cuci + Wax",
      price: 300000,
      startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
      totalQuota: 5,
      remainingQuota: 1, // Sisa 1x lagi
      discountPercent: 5,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentRef: "TRF-BCA-887102",
      cashierId: cashierAfternoon.id,
      notes: "Sisa 1x lagi, tawari perpanjangan bulan depan",
    },
  });

  // Contoh 4: Kedaluwarsa (Expired - Ibu Linda)
  await prisma.customerMembership.create({
    data: {
      customerId: customer1.id,
      outletId: outletMataram.id,
      planName: "Paket Hemat 4x Cuci (Bulan Lalu)",
      price: 160000,
      startDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      status: "EXPIRED",
      totalQuota: 4,
      remainingQuota: 0,
      discountPercent: 0,
      paymentMethod: PaymentMethod.CASH,
      cashierId: cashierMorning.id,
      notes: "Masa aktif telah berakhir",
    },
  });

  // Contoh 5: Dibatalkan (Cancelled - Rudi Hartono)
  await prisma.customerMembership.create({
    data: {
      customerId: customer8.id,
      outletId: outletMataram.id,
      planName: "Paket Armada Usaha 8x Cuci",
      price: 320000,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      status: "CANCELLED",
      totalQuota: 8,
      remainingQuota: 6,
      discountPercent: 0,
      paymentMethod: PaymentMethod.CASH,
      cashierId: cashierMorning.id,
      notes:
        "Dibatalkan atas permintaan pemilik armada karena kendaraan dijual",
    },
  });

  // 11. Riwayat Mutasi Poin Loyalitas Pelanggan (CustomerLoyaltyLog)
  console.log("📜 11. Membuat Riwayat Mutasi Poin Loyalitas & Reward...");
  await prisma.customerLoyaltyLog.createMany({
    data: [
      {
        customerId: customer1.id,
        pointsChanged: 4,
        balanceAfter: 46,
        description: "Poin transaksi cuci Brio RS (#KNC-20260915-012)",
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer1.id,
        pointsChanged: 4,
        balanceAfter: 50,
        description: "Poin transaksi cuci Brio RS (#KNC-20260925-008)",
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer2.id,
        pointsChanged: 5,
        balanceAfter: 35,
        description: "Poin transaksi cuci Xpander (#KNC-20260928-004)",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer4.id,
        pointsChanged: 11,
        balanceAfter: 85,
        description:
          "Poin transaksi cuci Ioniq 5 + Fogging (#KNC-20260920-001)",
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        customerId: customer3.id,
        pointsChanged: 6,
        balanceAfter: 42,
        description:
          "Poin transaksi cuci Fortuner GR Sport (#KNC-20260926-003)",
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // 12. Helper untuk mengambil paket layanan
  const sMobilKecil = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Kecil (Agya/Brio)"
  )!;
  const sMobilKecilWax = createdServices.find(
    (s) => s.name === "Cuci Komplit + Wax Proteksi Mobil Kecil"
  )!;
  const sMotorKecil = createdServices.find(
    (s) => s.name === "Cuci Salju Motor Kecil"
  )!;
  const sMotorBesar = createdServices.find(
    (s) => s.name === "Cuci Salju Motor Besar (NMax/PCX)"
  )!;
  const sMotorMoge = createdServices.find(
    (s) => s.name === "Cuci Premium Moge (250cc+)"
  )!;
  const sMobilSedang = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Sedang (Avanza/Xpander)"
  )!;
  const sMobilSedangWax = createdServices.find(
    (s) => s.name === "Cuci Komplit + Wax Mobil Sedang"
  )!;
  const sMobilBesar = createdServices.find(
    (s) => s.name === "Cuci Salju + Vacuum Mobil Besar (Pajero/Fortuner)"
  )!;
  const sMobilBesarWax = createdServices.find(
    (s) => s.name === "Cuci Hidrolik + Semir Kolong + Wax Mobil Besar"
  )!;
  const sPickup = createdServices.find(
    (s) => s.name === "Cuci Eksterior Pick-up / Mobil Box"
  )!;

  // 13. BUAT TIKET ANTREAN LIVE HARI INI (SEMUA STATUS: QUEUED, WASHING, DRYING, READY, COMPLETED, CANCELLED)
  console.log(
    "🎫 13. Membuat Tiket Antrean Live Hari Ini (Semua Status Kanban)..."
  );

  // TIKET 1: Status READY (Honda Brio Ibu Linda - SIAP KLAIM PROMO CUCI 10X GRATIS DI KASIR!)
  const ticketReady1 = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-001`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer1.id,
      vehicleId: vehicle1.id,
      licensePlate: vehicle1.licensePlate,
      vehicleCategory: vehicle1.category,
      servicePackageId: sMobilKecil.id,
      servicePrice: sMobilKecil.price,
      status: TicketStatus.READY,
      initialNotes: "Kondisi bodi mulus, minta semir ban ekstra basah.",
      inspectionPhotos: [
        "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=600&q=80",
      ],
      washingStartedAt: new Date(now.getTime() - 50 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 25 * 60 * 1000),
      readyAt: new Date(now.getTime() - 5 * 60 * 1000),
      subtotalServices: sMobilKecil.price,
      subtotalRetail: 0,
      totalAmount: sMobilKecil.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketReady1.id,
      employeeId: washer1.id,
      commissionAmount: sMobilKecil.defaultCommission,
      isPaidToWasher: false,
    },
  });

  // TIKET 2: Status READY (Honda Scoopy Ibu Ratna - PENGGUNAAN KUOTA MEMBERSHIP!)
  const ticketReady2 = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-004`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer7.id,
      vehicleId: vehicle7.id,
      licensePlate: vehicle7.licensePlate,
      vehicleCategory: vehicle7.category,
      servicePackageId: sMotorKecil.id,
      servicePrice: sMotorKecil.price,
      status: TicketStatus.READY,
      membershipId: membershipRatna.id,
      isMembershipWash: true, // Cuci pakai kuota langganan member!
      initialNotes: "Klaim kuota member bulanan unlimited.",
      washingStartedAt: new Date(now.getTime() - 35 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 15 * 60 * 1000),
      readyAt: new Date(now.getTime() - 2 * 60 * 1000),
      subtotalServices: sMotorKecil.price,
      subtotalRetail: 0,
      discountAmount: sMotorKecil.price,
      totalAmount: 0, // Terpotong penuh oleh membership
      paidAmount: 0,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketReady2.id,
      employeeId: washer5.id,
      commissionAmount: sMotorKecil.defaultCommission,
      isPaidToWasher: false,
    },
  });

  // TIKET 3: Status DRYING (Motor NMax Dedi - Sedang Dikeringkan & Beli Kopi Dingin)
  const ticketDrying = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-002`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer5.id,
      vehicleId: vehicle5.id,
      licensePlate: vehicle5.licensePlate,
      vehicleCategory: vehicle5.category,
      servicePackageId: sMotorBesar.id,
      servicePrice: sMotorBesar.price,
      status: TicketStatus.DRYING,
      initialNotes: "Sela radiator agak berdebu.",
      washingStartedAt: new Date(now.getTime() - 30 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 8 * 60 * 1000),
      subtotalServices: sMotorBesar.price,
      subtotalRetail: 12000, // Kopi Dingin
      totalAmount: Number(sMotorBesar.price) + 12000,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketDrying.id,
      employeeId: washer4.id,
      commissionAmount: sMotorBesar.defaultCommission,
      isPaidToWasher: false,
    },
  });

  await prisma.ticketRetailItem.create({
    data: {
      ticketId: ticketDrying.id,
      retailProductId: createdRetail[0].id, // Kopi Gula Aren Dingin
      quantity: 1,
      unitPrice: 12000,
      subtotal: 12000,
    },
  });

  // TIKET 4: Status WASHING - TANDEM WASHER (Xpander Hendra Wijaya - Dikerjakan 2 Washer Sekaligus!)
  const ticketWashingTandem = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-003`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer2.id,
      vehicleId: vehicle2.id,
      licensePlate: vehicle2.licensePlate,
      vehicleCategory: vehicle2.category,
      servicePackageId: sMobilSedang.id,
      servicePrice: sMobilSedang.price,
      status: TicketStatus.WASHING,
      initialNotes: "Kolong banyak lumpur sehabis ke Lombok Timur.",
      washingStartedAt: new Date(now.getTime() - 18 * 60 * 1000),
      subtotalServices: sMobilSedang.price,
      subtotalRetail: 0,
      totalAmount: sMobilSedang.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // Komisi dibagi dua (Tandem Agus Santoso & Budi Pratama)
  const halfCommission = Number(sMobilSedang.defaultCommission) / 2;
  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketWashingTandem.id,
      employeeId: washer1.id,
      commissionAmount: halfCommission,
      isPaidToWasher: false,
    },
  });
  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketWashingTandem.id,
      employeeId: washer2.id,
      commissionAmount: halfCommission,
      isPaidToWasher: false,
    },
  });

  // TIKET 5: Status WASHING - SOLO (Pick-up Rudi Hartono)
  const ticketWashingSolo = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-005`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer8.id,
      vehicleId: vehicle8.id,
      licensePlate: vehicle8.licensePlate,
      vehicleCategory: vehicle8.category,
      servicePackageId: sPickup.id,
      servicePrice: sPickup.price,
      status: TicketStatus.WASHING,
      initialNotes: "Bak kargo banyak pasir.",
      washingStartedAt: new Date(now.getTime() - 10 * 60 * 1000),
      subtotalServices: sPickup.price,
      subtotalRetail: 0,
      totalAmount: sPickup.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketWashingSolo.id,
      employeeId: washer3.id,
      commissionAmount: sPickup.defaultCommission,
      isPaidToWasher: false,
    },
  });

  // TIKET 6: Status QUEUED (Kawasaki Ninja ZX-25R Kevin Sanjaya - Moge di Antrean Masuk)
  await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-006`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer9.id,
      vehicleId: vehicle9.id,
      licensePlate: vehicle9.licensePlate,
      vehicleCategory: vehicle9.category,
      servicePackageId: sMotorMoge.id,
      servicePrice: sMotorMoge.price,
      status: TicketStatus.QUEUED,
      initialNotes: "Waspada leher knalpot masih panas.",
      subtotalServices: sMotorMoge.price,
      subtotalRetail: 0,
      totalAmount: sMotorMoge.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // TIKET 7: Status QUEUED (Fortuner Budi Setiawan - Mobil Besar di Antrean Masuk)
  await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-007`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer3.id,
      vehicleId: vehicle3Mobil.id,
      licensePlate: vehicle3Mobil.licensePlate,
      vehicleCategory: vehicle3Mobil.category,
      servicePackageId: sMobilBesar.id,
      servicePrice: sMobilBesar.price,
      status: TicketStatus.QUEUED,
      initialNotes: "Mobil tinggi, gunakan tangga hidrolik untuk atap.",
      subtotalServices: sMobilBesar.price,
      subtotalRetail: 0,
      totalAmount: sMobilBesar.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  // TIKET 8: Status CANCELLED (Daihatsu Sigra - Contoh Pembatalan Tiket & Audit Log)
  const ticketCancelled = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-000D`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      licensePlate: "DR 9876 XX",
      vehicleCategory: VehicleCategory.MOBIL_SEDANG,
      servicePackageId: sMobilSedang.id,
      servicePrice: sMobilSedang.price,
      status: TicketStatus.CANCELLED,
      initialNotes:
        "Dibatalkan pelanggan karena ada urusan mendadak dan antrean hidrolik penuh.",
      subtotalServices: sMobilSedang.price,
      subtotalRetail: 0,
      totalAmount: sMobilSedang.price,
      paymentStatus: PaymentStatus.UNPAID,
    },
  });

  await prisma.auditLog.create({
    data: {
      outletId: outletMataram.id,
      actorId: cashierMorning.id,
      actorRole: "CASHIER",
      action: "TICKET_CANCELLED",
      entityType: "WashTicket",
      entityId: ticketCancelled.id,
      metadata: {
        reason: "Pelanggan buru-buru, antrean penuh",
        ticketNumber: ticketCancelled.ticketNumber,
      },
    },
  });

  // 14. TRANSAKSI SELESAI HARI INI (COMPLETED) DENGAN PEMBAYARAN LUNAS BERBAGAI METODE
  console.log(
    "💰 14. Membuat Transaksi Selesai Hari Ini (QRIS, CASH, TRANSFER)..."
  );

  // Selesai 1: Ioniq 5 dr. Farhan (Lunas QRIS Rp 110.000)
  const ticketCompletedToday1 = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-000A`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer4.id,
      vehicleId: vehicle4.id,
      licensePlate: vehicle4.licensePlate,
      vehicleCategory: vehicle4.category,
      servicePackageId: sMobilSedangWax.id,
      servicePrice: sMobilSedangWax.price, // 75.000
      status: TicketStatus.COMPLETED,
      initialNotes: "Wax bodi mengkilap anti air.",
      washingStartedAt: new Date(now.getTime() - 130 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 80 * 60 * 1000),
      readyAt: new Date(now.getTime() - 40 * 60 * 1000),
      completedAt: new Date(now.getTime() - 30 * 60 * 1000),
      subtotalServices: sMobilSedangWax.price,
      subtotalRetail: 35000, // Parfum Mobil Kaleng
      totalAmount: 110000,
      paidAmount: 110000,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketCompletedToday1.id,
      employeeId: washer4.id,
      commissionAmount: sMobilSedangWax.defaultCommission,
      isPaidToWasher: false, // Belum dicairkan (bisa dicairkan di modul Komisi)
    },
  });

  await prisma.ticketRetailItem.create({
    data: {
      ticketId: ticketCompletedToday1.id,
      retailProductId: createdRetail[5].id, // Parfum Mobil
      quantity: 1,
      unitPrice: 35000,
      subtotal: 35000,
    },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticketCompletedToday1.id,
      outletId: outletMataram.id,
      cashierId: cashierMorning.id,
      method: PaymentMethod.QRIS,
      status: PaymentStatus.PAID,
      totalAmount: 110000,
      referenceNumber: "QRIS-NMID-99281729102",
      paidAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
  });

  // Selesai 2: Innova Zenix Ahmad Zaki (Lunas Tunai CASH Rp 50.000)
  const ticketCompletedToday2 = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-000B`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer6.id,
      vehicleId: vehicle6.id,
      licensePlate: vehicle6.licensePlate,
      vehicleCategory: vehicle6.category,
      servicePackageId: sMobilSedang.id,
      servicePrice: sMobilSedang.price,
      status: TicketStatus.COMPLETED,
      initialNotes: "Walk-in baru.",
      washingStartedAt: new Date(now.getTime() - 100 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 60 * 60 * 1000),
      readyAt: new Date(now.getTime() - 25 * 60 * 1000),
      completedAt: new Date(now.getTime() - 20 * 60 * 1000),
      subtotalServices: sMobilSedang.price,
      subtotalRetail: 0,
      totalAmount: sMobilSedang.price,
      paidAmount: sMobilSedang.price,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketCompletedToday2.id,
      employeeId: washer1.id,
      commissionAmount: sMobilSedang.defaultCommission,
      isPaidToWasher: false,
    },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticketCompletedToday2.id,
      outletId: outletMataram.id,
      cashierId: cashierMorning.id,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
      totalAmount: 50000,
      cashGiven: 100000,
      changeGiven: 50000,
      paidAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
  });

  // Selesai 3: Yaris Cross Siti Nurhaliza (Lunas BANK TRANSFER Rp 65.000)
  const ticketCompletedToday3 = await prisma.washTicket.create({
    data: {
      ticketNumber: `KNC-${dateStr}-000C`,
      outletId: outletMataram.id,
      createdById: cashierMorning.id,
      customerId: customer10.id,
      vehicleId: vehicle10.id,
      licensePlate: vehicle10.licensePlate,
      vehicleCategory: vehicle10.category,
      servicePackageId: sMobilKecilWax.id,
      servicePrice: sMobilKecilWax.price, // 65.000
      status: TicketStatus.COMPLETED,
      initialNotes: "Cuci komplit wax kinclong.",
      washingStartedAt: new Date(now.getTime() - 75 * 60 * 1000),
      dryingStartedAt: new Date(now.getTime() - 35 * 60 * 1000),
      readyAt: new Date(now.getTime() - 15 * 60 * 1000),
      completedAt: new Date(now.getTime() - 10 * 60 * 1000),
      subtotalServices: sMobilKecilWax.price,
      subtotalRetail: 0,
      totalAmount: sMobilKecilWax.price,
      paidAmount: sMobilKecilWax.price,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  await prisma.ticketWasher.create({
    data: {
      ticketId: ticketCompletedToday3.id,
      employeeId: washer2.id,
      commissionAmount: sMobilKecilWax.defaultCommission,
      isPaidToWasher: false,
    },
  });

  await prisma.payment.create({
    data: {
      ticketId: ticketCompletedToday3.id,
      outletId: outletMataram.id,
      cashierId: cashierMorning.id,
      method: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.PAID,
      totalAmount: 65000,
      referenceNumber: "TRF-BCA-992384",
      proofImageUrl:
        "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600&q=80",
      paidAt: new Date(now.getTime() - 10 * 60 * 1000),
    },
  });

  // 15. SEED DATA HISTORIS 6 HARI TERAKHIR (UNTUK ANALITIK & GRAFIK DASBOR YANG KAYA)
  console.log(
    "📊 15. Membuat Transaksi Historis 6 Hari Terakhir (Populasi Grafik Dasbor)..."
  );

  interface PastTicketTemplate {
    category: VehicleCategory;
    serviceName: string;
    plate: string;
    hour: number;
    minute: number;
    paymentMethod: PaymentMethod;
    retailSku?: string;
    washerIdx: number;
    isPaidCommission: boolean;
  }

  const pastTemplates: PastTicketTemplate[] = [
    {
      category: VehicleCategory.MOTOR_KECIL,
      serviceName: "Cuci Salju Motor Kecil",
      plate: "DR 1101 SA",
      hour: 8,
      minute: 30,
      paymentMethod: PaymentMethod.CASH,
      washerIdx: 0,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOBIL_SEDANG,
      serviceName: "Cuci Salju + Vacuum Mobil Sedang (Avanza/Xpander)",
      plate: "DR 2022 AB",
      hour: 9,
      minute: 15,
      paymentMethod: PaymentMethod.QRIS,
      retailSku: "RTL-001", // Kopi
      washerIdx: 1,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOBIL_BESAR,
      serviceName: "Cuci Salju + Vacuum Mobil Besar (Pajero/Fortuner)",
      plate: "DR 3033 CD",
      hour: 10,
      minute: 45,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      washerIdx: 2,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOTOR_BESAR,
      serviceName: "Cuci Salju Motor Besar (NMax/PCX)",
      plate: "DR 4044 EF",
      hour: 11,
      minute: 20,
      paymentMethod: PaymentMethod.CASH,
      washerIdx: 3,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOBIL_SEDANG,
      serviceName: "Cuci Komplit + Wax Mobil Sedang",
      plate: "DR 5055 GH",
      hour: 13,
      minute: 10,
      paymentMethod: PaymentMethod.QRIS,
      retailSku: "RTL-006", // Parfum
      washerIdx: 0,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOBIL_KECIL,
      serviceName: "Cuci Salju + Vacuum Mobil Kecil (Agya/Brio)",
      plate: "DR 6066 IJ",
      hour: 14,
      minute: 40,
      paymentMethod: PaymentMethod.CASH,
      washerIdx: 4,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.MOTOR_MOGE,
      serviceName: "Cuci Premium Moge (250cc+)",
      plate: "DR 7077 KL",
      hour: 15,
      minute: 30,
      paymentMethod: PaymentMethod.QRIS,
      washerIdx: 1,
      isPaidCommission: true,
    },
    {
      category: VehicleCategory.KENDARAAN_LAIN,
      serviceName: "Cuci Eksterior Pick-up / Mobil Box",
      plate: "DR 8088 MN",
      hour: 16,
      minute: 15,
      paymentMethod: PaymentMethod.CASH,
      washerIdx: 2,
      isPaidCommission: true,
    },
  ];

  const washersList = [washer1, washer2, washer3, washer4, washer5];

  for (let daysAgo = 6; daysAgo >= 1; daysAgo--) {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysAgo
    );
    const dayStr = targetDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Ambil sebagian template per hari (antara 4 - 7 transaksi per hari)
    const countForDay = 4 + ((daysAgo * 3) % 4);
    const dayTemplates = pastTemplates.slice(0, countForDay);

    for (let i = 0; i < dayTemplates.length; i++) {
      const t = dayTemplates[i];
      const seqStr = String(i + 1).padStart(3, "0");
      const ticketNum = `KNC-${dayStr}-${seqStr}`;

      const sPkg = createdServices.find((s) => s.name === t.serviceName)!;
      const retailProd = t.retailSku
        ? createdRetail.find((r) => r.sku === t.retailSku)
        : null;

      const ticketTime = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        t.hour,
        t.minute
      );
      const readyTime = new Date(ticketTime.getTime() + 35 * 60 * 1000);
      const completedTime = new Date(ticketTime.getTime() + 45 * 60 * 1000);

      const retailAmount = retailProd ? Number(retailProd.sellingPrice) : 0;
      const totalAmount = Number(sPkg.price) + retailAmount;

      const histTicket = await prisma.washTicket.create({
        data: {
          ticketNumber: ticketNum,
          outletId: outletMataram.id,
          createdById: cashierMorning.id,
          licensePlate: t.plate,
          vehicleCategory: t.category,
          servicePackageId: sPkg.id,
          servicePrice: sPkg.price,
          status: TicketStatus.COMPLETED,
          queuedAt: ticketTime,
          washingStartedAt: ticketTime,
          dryingStartedAt: new Date(ticketTime.getTime() + 20 * 60 * 1000),
          readyAt: readyTime,
          completedAt: completedTime,
          subtotalServices: sPkg.price,
          subtotalRetail: retailAmount,
          totalAmount,
          paidAmount: totalAmount,
          paymentStatus: PaymentStatus.PAID,
          createdAt: ticketTime,
        },
      });

      // Hubungkan washer & komisi (sebagian sudah dicairkan di masa lalu)
      const assignedWasher = washersList[t.washerIdx % washersList.length];
      const isPaid = daysAgo >= 2 ? true : false; // 2 hari ke belakang sudah dicairkan, kemarin belum dicairkan
      await prisma.ticketWasher.create({
        data: {
          ticketId: histTicket.id,
          employeeId: assignedWasher.id,
          commissionAmount: sPkg.defaultCommission,
          assignedAt: ticketTime,
          isPaidToWasher: isPaid,
          paidAt: isPaid
            ? new Date(ticketTime.getTime() + 8 * 60 * 60 * 1000)
            : null,
        },
      });

      // Item ritel jika ada
      if (retailProd) {
        await prisma.ticketRetailItem.create({
          data: {
            ticketId: histTicket.id,
            retailProductId: retailProd.id,
            quantity: 1,
            unitPrice: retailProd.sellingPrice,
            subtotal: retailProd.sellingPrice,
          },
        });
      }

      // Pembayaran kasir
      await prisma.payment.create({
        data: {
          ticketId: histTicket.id,
          outletId: outletMataram.id,
          cashierId: cashierMorning.id,
          method: t.paymentMethod,
          status: PaymentStatus.PAID,
          totalAmount,
          paidAt: completedTime,
        },
      });
    }
  }

  // 16. DATA CABANG KEDUA (OUTLET REMBIGA) - DEMO MULTI-OUTLET SWITCHER
  console.log("🏢 16. Membuat Data Antrean Berjalan di Cabang Rembiga...");
  const sPkgRembiga = await prisma.servicePackage.findFirst({
    where: { outletId: outletRembiga.id },
  });

  if (sPkgRembiga) {
    const ticketRembiga1 = await prisma.washTicket.create({
      data: {
        ticketNumber: `RBG-${dateStr}-001`,
        outletId: outletRembiga.id,
        createdById: cashierRembiga.id,
        licensePlate: "DR 8899 XY",
        vehicleCategory: VehicleCategory.MOTOR_BESAR,
        servicePackageId: sPkgRembiga.id,
        servicePrice: sPkgRembiga.price,
        status: TicketStatus.WASHING,
        initialNotes: "Cuci motor express di Rembiga",
        washingStartedAt: new Date(now.getTime() - 15 * 60 * 1000),
        subtotalServices: sPkgRembiga.price,
        subtotalRetail: 0,
        totalAmount: sPkgRembiga.price,
        paymentStatus: PaymentStatus.UNPAID,
      },
    });

    await prisma.ticketWasher.create({
      data: {
        ticketId: ticketRembiga1.id,
        employeeId: washerRembiga1.id,
        commissionAmount: sPkgRembiga.defaultCommission,
        isPaidToWasher: false,
      },
    });
  }

  // 17. WhatsApp Logs & Audit Trail
  console.log("📲 17. Membuat Log WhatsApp & Audit Trail...");
  await prisma.whatsAppLog.create({
    data: {
      ticketId: ticketReady1.id,
      recipientPhone: customer1.phone,
      messageType: "STATUS_READY",
      status: WhatsAppDeliveryStatus.DELIVERED,
      sentAt: new Date(now.getTime() - 5 * 60 * 1000),
    },
  });

  await prisma.whatsAppLog.create({
    data: {
      ticketId: ticketCompletedToday1.id,
      recipientPhone: customer4.phone,
      messageType: "RECEIPT",
      status: WhatsAppDeliveryStatus.READ,
      sentAt: new Date(now.getTime() - 28 * 60 * 1000),
    },
  });

  await prisma.whatsAppLog.create({
    data: {
      ticketId: ticketDrying.id,
      recipientPhone: customer5.phone,
      messageType: "PROMO",
      status: WhatsAppDeliveryStatus.SENT,
      sentAt: new Date(now.getTime() - 15 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      outletId: outletMataram.id,
      actorId: cashierMorning.id,
      actorRole: "CASHIER",
      action: "TICKET_CREATED",
      entityType: "WashTicket",
      entityId: ticketReady1.id,
      metadata: {
        ticketNumber: ticketReady1.ticketNumber,
        plate: ticketReady1.licensePlate,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      outletId: outletMataram.id,
      actorId: ownerUser.id,
      actorRole: "OWNER",
      action: "COMMISSION_PAID",
      entityType: "TicketWasher",
      entityId: washer1.id,
      metadata: {
        amount: 150000,
        period: "Pencairan Komisi Mingguan",
      },
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("\n=========================================================");
  console.log("🎉 SEEDING DATA KINCLONGIN BERHASIL DENGAN SEMUA CONTOH!");
  console.log("=========================================================");
  console.log(`
  📊 Ringkasan Data Master & Transaksi yang Berhasil Dibuat:
  -----------------------------------------------------------------------
  1. Multi-Cabang Outlet : 3 Cabang
                           - Kinclongin Cabang Pusat Mataram (Aktif)
                           - Kinclongin Express Rembiga (Aktif)
                           - Kinclongin Auto Spa & Detailing Senggigi (Aktif)

  2. Akun Pengguna       : 10 Akun Lengkap (Password demo: 123456)
                           - OWNER: owner@kinclongin.com
                           - MANAGER: danu.operasional@kinclongin.com, manager.rembiga@kinclongin.com
                           - CASHIER: kasir.mataram@kinclongin.com, kasir.sore@kinclongin.com, kasir.rembiga@kinclongin.com
                           - WASHER: agus, budi, rian, ilham, fajar (tertaut ke akun employee)
                           - STATUS KHUSUS: mantan.kasir@kinclongin.com (SUSPENDED)

  3. Karyawan Washer Cuci: 7 Staf dengan PIN Tablet Kiosk
                           - Agus Santoso   (PIN: 1234) - Rp 12.000 / unit
                           - Budi Pratama   (PIN: 5678) - Rp 12.000 / unit
                           - Rian Hidayat   (PIN: 9999) - Rp 10.000 / unit
                           - Ilham Saputra  (PIN: 2026) - Rp 10.000 / unit
                           - Fajar Ramadhan (PIN: 1122) - Komisi 25% Persentase
                           - Joko Widodo    (PIN: 4321) - Non-Aktif (Arsip)
                           - Dadan & Eko    (Cabang Rembiga)

  4. Paket Layanan Cuci  : 17 Layanan Lengkap (7 Kategori Kendaraan)
                           - MOTOR_KECIL, MOTOR_BESAR, MOTOR_MOGE
                           - MOBIL_KECIL, MOBIL_SEDANG, MOBIL_BESAR
                           - KENDARAAN_LAIN (Pick-up, Truk Engkel)
                           - Paket Promo Arsip (isActive: false)

  5. Ritel & Stok Kasir  : 9 Produk Ritel & Minuman
                           - Normal Stock (Kopi Aren, Air Mineral, Teh, Singkong, Microfiber)
                           - Low Stock Alert (Parfum Mobil, Wiper Fluid) -> Tampil Badge Merah/Kuning
                           - Out of Stock (Phone Holder Magnetik Dashboard: 0) -> Badge Habis
                           - Non-Aktif (Bantal Leher: isActive false)

  6. Bahan Baku Cuci     : 5 Formula Operasional (Shampo, Semir, Degreaser, Dressing, Fogging)

  7. Member Pelanggan    : 10 Pelanggan & 11 Kendaraan Terkunci:
                           • Ibu Linda Permata (DR 1001 AB) -> KUNJUNGAN KE-10 (SIAP CUCI 10X GRATIS!)
                           • Hendra Wijaya     (DR 1888 XY) -> Kunjungan ke-9 (Sisa 1x lagi!)
                           • Budi Setiawan     (Multi-Unit) -> Fortuner (5x), XMAX (2x) Terpisah Aman
                           • dr. Farhan Malik  (DR 88 EV)   -> VIP Poin Banyak (85 Poin) & Member Aktif
                           • Ibu Ratna Dewi    (DR 2222 KL) -> Member Bulanan Unlimited Aktif
                           • Dedi Kurniawan    (DR 5432 KL) -> Motor NMax (3x Kunjungan)
                           • Rudi Hartono      (DR 4567 TY) -> Pick-up Niaga (6x Kunjungan)
                           • Kevin Sanjaya     (DR 9999 ZX) -> Moge Ninja ZX (4x Kunjungan)
                           • Ahmad Zaki        (DR 1234 BZ) -> Walk-in Baru (1x Kunjungan)
                           • Siti Nurhaliza    (DR 5555 YC) -> Yaris Cross (2x Kunjungan)

  8. Customer Membership : 5 Contoh Lengkap:
                           - ACTIVE (Kuota Berjalan: Sisa 2 dari 4)
                           - ACTIVE (Unlimited Express Motor: Kuota 999)
                           - ACTIVE (Kuota Menipis: Sisa 1 dari 5)
                           - EXPIRED (Kedaluwarsa bulan lalu)
                           - CANCELLED (Dibatalkan pelanggan)

  9. Kanban Papan Antrean: 7 Tiket Berjalan Hari Ini (Semua Status):
                           - READY     : DR 1001 AB (Siap Klaim Promo Cuci 10x di Kasir)
                           - READY     : DR 2222 KL (Penggunaan Kuota Member Unlimited)
                           - DRYING    : DR 5432 KL (NMax sedang dilap + pesan kopi dingin)
                           - WASHING   : DR 1888 XY (TANDEM WASHER: Agus & Budi bagi komisi)
                           - WASHING   : DR 4567 TY (SOLO WASHER: Rian di pick-up)
                           - QUEUED    : DR 9999 ZX (Moge Ninja di antrean)
                           - QUEUED    : DR 7777 WQ (Fortuner di antrean)
                           - CANCELLED : DR 9876 XX (Dibatalkan dengan Audit Log)

  10. Transaksi Selesai  : 3 Selesai Hari Ini + 30+ Tiket Historis 6 Hari Terakhir
                           (Grafik Tren 7 Hari, Jam Sibuk, dan Komposisi Omset Otomatis Penuh)
  -----------------------------------------------------------------------
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
