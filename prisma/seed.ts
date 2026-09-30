import {
  ApplicationMethod,
  EducationLevel,
  ExperienceLevel,
  JobType,
  UserRole,
  VerificationStatus,
  WorkplaceType,
} from "../src/generated/prisma/client";
import { prisma } from "../src/lib/db/prisma";

const LOCATIONS_NTB = [
  { name: "Kota Mataram", slug: "kota-mataram", type: "KOTA", orderIndex: 1 },
  {
    name: "Kabupaten Lombok Barat",
    slug: "lombok-barat",
    type: "KABUPATEN",
    orderIndex: 2,
  },
  {
    name: "Kabupaten Lombok Tengah",
    slug: "lombok-tengah",
    type: "KABUPATEN",
    orderIndex: 3,
  },
  {
    name: "Kabupaten Lombok Timur",
    slug: "lombok-timur",
    type: "KABUPATEN",
    orderIndex: 4,
  },
  {
    name: "Kabupaten Lombok Utara",
    slug: "lombok-utara",
    type: "KABUPATEN",
    orderIndex: 5,
  },
  {
    name: "Kabupaten Sumbawa",
    slug: "sumbawa",
    type: "KABUPATEN",
    orderIndex: 6,
  },
  {
    name: "Kabupaten Sumbawa Barat",
    slug: "sumbawa-barat",
    type: "KABUPATEN",
    orderIndex: 7,
  },
  { name: "Kabupaten Dompu", slug: "dompu", type: "KABUPATEN", orderIndex: 8 },
  { name: "Kabupaten Bima", slug: "bima", type: "KABUPATEN", orderIndex: 9 },
  { name: "Kota Bima", slug: "kota-bima", type: "KOTA", orderIndex: 10 },
];

const JOB_CATEGORIES = [
  {
    name: "Pariwisata & Perhotelan",
    slug: "pariwisata-perhotelan",
    icon: "Hotel",
    orderIndex: 1,
  },
  {
    name: "Teknologi Informasi & IT",
    slug: "teknologi-informasi",
    icon: "Code2",
    orderIndex: 2,
  },
  {
    name: "Pertambangan & Energi",
    slug: "pertambangan-energi",
    icon: "Pickaxe",
    orderIndex: 3,
  },
  {
    name: "Pertanian & Perkebunan",
    slug: "pertanian-perkebunan",
    icon: "Wheat",
    orderIndex: 4,
  },
  {
    name: "Kelautan & Perikanan",
    slug: "kelautan-perikanan",
    icon: "Fish",
    orderIndex: 5,
  },
  {
    name: "Konstruksi & Properti",
    slug: "konstruksi-properti",
    icon: "HardHat",
    orderIndex: 6,
  },
  {
    name: "Pendidikan & Pelatihan",
    slug: "pendidikan-pelatihan",
    icon: "GraduationCap",
    orderIndex: 7,
  },
  {
    name: "Kesehatan & Farmasi",
    slug: "kesehatan-farmasi",
    icon: "HeartPulse",
    orderIndex: 8,
  },
  {
    name: "Keuangan & Perbankan",
    slug: "keuangan-perbankan",
    icon: "BadgeDollarSign",
    orderIndex: 9,
  },
  {
    name: "Penjualan & Retail",
    slug: "penjualan-retail",
    icon: "ShoppingBag",
    orderIndex: 10,
  },
  {
    name: "Administrasi & HR",
    slug: "administrasi-hr",
    icon: "Briefcase",
    orderIndex: 11,
  },
  {
    name: "Logistik & Transportasi",
    slug: "logistik-transportasi",
    icon: "Truck",
    orderIndex: 12,
  },
];

async function main() {
  console.log("==> Memulai seeding data KerjaNTB...");

  // 1. Seed 10 Wilayah NTB
  const locationMap = new Map<string, string>();
  for (const loc of LOCATIONS_NTB) {
    const record = await prisma.location.upsert({
      where: { slug: loc.slug },
      update: { name: loc.name, type: loc.type, orderIndex: loc.orderIndex },
      create: loc,
    });
    locationMap.set(loc.slug, record.id);
  }
  console.log("✓ 10 Wilayah Kabupaten/Kota NTB berhasil disiapkan.");

  // 2. Seed 12 Kategori Lowongan
  const categoryMap = new Map<string, string>();
  for (const cat of JOB_CATEGORIES) {
    const record = await prisma.jobCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        orderIndex: cat.orderIndex,
        isActive: true,
      },
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log("✓ 12 Kategori Lowongan Kerja berhasil disiapkan.");

  // 3. Seed Demo Users & Companies
  console.log("==> Menyiapkan Akun Demo Perusahaan NTB...");

  const companiesData = [
    {
      clerkId: "demo_clerk_amman",
      email: "recruitment@amman.co.id",
      companyName: "PT Amman Mineral Nusa Tenggara",
      slug: "pt-amman-mineral-nusa-tenggara",
      industry: "Pertambangan & Energi",
      companySize: "1000+ Karyawan",
      locationSlug: "sumbawa-barat",
      address: "Batu Hijau, Sekongkang, Kabupaten Sumbawa Barat, NTB",
      website: "https://www.amman.co.id",
      phone: "+62 372 63531",
      description:
        "PT Amman Mineral Nusa Tenggara adalah perusahaan pertambangan tembaga dan emas terkemuka di Indonesia yang mengoperasikan tambang Batu Hijau di Kabupaten Sumbawa Barat, NTB.",
      nib: "9120301290481",
      legalName: "PT Amman Mineral Nusa Tenggara",
    },
    {
      clerkId: "demo_clerk_katamaran",
      email: "hrd@katamaranresort.com",
      companyName: "Katamaran Hotel & Resort",
      slug: "katamaran-hotel-and-resort",
      industry: "Pariwisata & Perhotelan",
      companySize: "100-250 Karyawan",
      locationSlug: "lombok-barat",
      address: "Jl. Raya Mangsit, Senggigi, Kabupaten Lombok Barat, NTB",
      website: "https://www.katamaranresort.com",
      phone: "+62 370 6197000",
      description:
        "Katamaran Hotel & Resort Senggigi adalah resor bintang 5 di pesisir barat Pulau Lombok yang menyajikan panorama matahari terbenam Gunung Agung dan fasilitas hospitality kelas dunia.",
      nib: "8120003847291",
      legalName: "PT Katamaran Mangsit International",
    },
    {
      clerkId: "demo_clerk_bankntb",
      email: "karir@bankntbsyariah.co.id",
      companyName: "PT Bank NTB Syariah",
      slug: "pt-bank-ntb-syariah",
      industry: "Keuangan & Perbankan",
      companySize: "500-1000 Karyawan",
      locationSlug: "kota-mataram",
      address: "Jl. Pejanggik No. 30, Kota Mataram, NTB",
      website: "https://www.bankntbsyariah.co.id",
      phone: "+62 370 633342",
      description:
        "PT Bank NTB Syariah adalah Badan Usaha Milik Daerah (BUMD) perbankan syariah terpercaya milik masyarakat Nusa Tenggara Barat dengan jaringan cabang di 10 Kabupaten/Kota se-NTB.",
      nib: "0220108374921",
      legalName: "PT Bank Pembangunan Daerah Nusa Tenggara Barat Syariah",
    },
    {
      clerkId: "demo_clerk_sasaktech",
      email: "talent@sasaktech.id",
      companyName: "PT Sasak Digital Nusantara",
      slug: "pt-sasak-digital-nusantara",
      industry: "Teknologi Informasi & IT",
      companySize: "20-50 Karyawan",
      locationSlug: "kota-mataram",
      address: "Komplek Graha Gomong Asri, Mataram, NTB",
      website: "https://sasaktech.id",
      phone: "+62 819 0789 1234",
      description:
        "Software studio dan digital agency yang fokus membangun produk software modern, web platform, dan otomasi cerdas untuk instansi pemerintah dan UMKM di Kawasan Timur Indonesia.",
      nib: "2810309482710",
      legalName: "PT Sasak Digital Nusantara",
    },
    {
      clerkId: "demo_clerk_jagungdompu",
      email: "hr@agrodompu.co.id",
      companyName: "PT Agro Sentra Dompu",
      slug: "pt-agro-sentra-dompu",
      industry: "Pertanian & Perkebunan",
      companySize: "50-100 Karyawan",
      locationSlug: "dompu",
      address: "Kawasan Agribisnis Terpadu, Manggelewa, Kab. Dompu, NTB",
      website: "https://agrodompu.co.id",
      phone: "+62 373 21980",
      description:
        "Pelopor modernisasi rantai pasok jagung dan komoditas pangan unggulan di Pulau Sumbawa yang memberdayakan ribuan petani lokal Dompu dan Bima.",
      nib: "1920394857102",
      legalName: "PT Agro Sentra Dompu Sejahtera",
    },
  ];

  const companyMap = new Map<string, { companyId: string; userId: string }>();

  for (const c of companiesData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { role: UserRole.COMPANY },
      create: {
        clerkId: c.clerkId,
        email: c.email,
        role: UserRole.COMPANY,
      },
    });

    const locationId = locationMap.get(c.locationSlug);

    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: {
        name: c.companyName,
        industry: c.industry,
        companySize: c.companySize,
        locationId,
        address: c.address,
        website: c.website,
        phone: c.phone,
        description: c.description,
        isVerified: true,
      },
      create: {
        userId: user.id,
        name: c.companyName,
        slug: c.slug,
        industry: c.industry,
        companySize: c.companySize,
        locationId,
        address: c.address,
        website: c.website,
        phone: c.phone,
        description: c.description,
        isVerified: true,
      },
    });

    // Verification record
    await prisma.companyVerification.upsert({
      where: { companyId: company.id },
      update: {
        legalName: c.legalName,
        nib: c.nib,
        status: VerificationStatus.APPROVED,
      },
      create: {
        companyId: company.id,
        legalName: c.legalName,
        nib: c.nib,
        address: c.address,
        phone: c.phone,
        email: c.email,
        website: c.website,
        documentUrl: `https://storage.sumopod.id/docs/${c.slug}-nib.pdf`,
        status: VerificationStatus.APPROVED,
      },
    });

    companyMap.set(c.slug, { companyId: company.id, userId: user.id });
  }
  console.log("✓ 5 Perusahaan Demo & Verifikasi NIB berhasil dibuat.");

  // 4. Seed Lowongan Kerja Aktif
  console.log("==> Menyiapkan Lowongan Kerja Realistis NTB...");

  const jobsData = [
    {
      companySlug: "pt-amman-mineral-nusa-tenggara",
      categorySlug: "pertambangan-energi",
      locationSlug: "sumbawa-barat",
      title: "Mining Operations Superintendent",
      slug: "mining-operations-superintendent-amman-sumbawa-barat",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 22000000,
      salaryMax: 35000000,
      isSalaryDisclosed: true,
      education: EducationLevel.D4_S1,
      experience: ExperienceLevel.FIVE_PLUS_YEARS,
      description:
        "Memimpin operasional penambangan open-pit di site Batu Hijau dengan standar keselamatan kerja pertambangan kelas dunia dan efisiensi optimal.",
      responsibilities:
        "- Mengawasi armada alat berat dan target produksi batuan/bijih harian.\n- Memastikan kepatuhan ketat terhadap Good Mining Practice dan K3L (Keselamatan & Kesehatan Kerja Tambang).\n- Mengoordinasikan shift tim operasi tambang dan berkolaborasi dengan divisi Mine Geology and Planning.",
      requirements:
        "- S1 Teknik Pertambangan / Geologi dari universitas terakreditasi.\n- Pengalaman minimal 5 tahun di posisi supervisi operasional tambang open pit.\n- Memiliki Sertifikat Pengawas Operasional Madya (POM) dari Kementerian ESDM.\n- Bersedia ditempatkan dengan sistem roster 4:2 di Site Batu Hijau, Sumbawa Barat.",
      benefits:
        "Akomodasi camp eksekutif, asuransi kesehatan swasta keluarga, bonus performa tahunan, tiket penerbangan roster gratis.",
      skills: ["Mine Operations", "K3L Tambang", "Open Pit", "POM ESDM"],
    },
    {
      companySlug: "katamaran-hotel-and-resort",
      categorySlug: "pariwisata-perhotelan",
      locationSlug: "lombok-barat",
      title: "Front Office Supervisor",
      slug: "front-office-supervisor-katamaran-senggigi",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 4500000,
      salaryMax: 6500000,
      isSalaryDisclosed: true,
      education: EducationLevel.D3,
      experience: ExperienceLevel.ONE_TO_THREE_YEARS,
      description:
        "Bertanggung jawab atas kelancaran operasional meja depan dan kepuasan tamu internasional maupun domestik di resor tepi pantai Senggigi.",
      responsibilities:
        "- Mengawasi proses check-in dan check-out tamu VIP dan tamu reguler.\n- Menangani pertanyaan, reservasi khusus, dan masukan tamu dengan respon cepat dan ramah.\n- Melatih staf front desk baru sesuai SOP hotel bintang 5.",
      requirements:
        "- Diploma Perhotelan / Pariwisata / Bahasa Asing.\n- Pengalaman minimal 2 tahun di Front Office hotel bintang 4/5.\n- Fasih berbahasa Inggris lisan dan tulisan.\n- Berpenampilan rapi, ramah, dan berorientasi pada keramahan khas Lombok.",
      benefits:
        "Gaji pokok, service charge kompetitif, BPJS Ketenagakerjaan & Kesehatan, makan harian staf.",
      skills: [
        "Customer Service",
        "Opera PMS",
        "English Fluency",
        "Hospitality",
      ],
    },
    {
      companySlug: "katamaran-hotel-and-resort",
      categorySlug: "pariwisata-perhotelan",
      locationSlug: "lombok-utara",
      title: "Executive Sous Chef",
      slug: "executive-sous-chef-lombok-utara",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 8000000,
      salaryMax: 12000000,
      isSalaryDisclosed: true,
      education: EducationLevel.D3,
      experience: ExperienceLevel.THREE_TO_FIVE_YEARS,
      description:
        "Membantu Executive Chef dalam memimpin dapur utama resor, mengkreasikan menu Nusantara & Western modern dengan cita rasa lokal Lombok.",
      responsibilities:
        "- Mengontrol kualitas masakan, food cost, dan higienitas dapur (HACCP).\n- Mengembangkan menu musiman berbasis bahan laut segar tangkapan nelayan lokal NTB.\n- Mengatur jadwal shift dan mentoring tim chef junior.",
      requirements:
        "- Minimal D3 Manajemen Tata Boga / Seni Kuliner.\n- Pengalaman minimal 3 tahun sebagai Sous Chef di resor bintang 4 atau 5.\n- Menguasai teknik Western & Authentic Indonesian Cuisine.\n- Memiliki sertifikasi HACCP menjadi nilai tambah utama.",
      benefits:
        "Service charge bulanan, tunjangan tempat tinggal di sekitar Senggigi/Lombok Utara, seragam & laundry.",
      skills: ["Culinary Art", "HACCP", "Food Costing", "Kitchen Management"],
    },
    {
      companySlug: "pt-sasak-digital-nusantara",
      categorySlug: "teknologi-informasi",
      locationSlug: "kota-mataram",
      title: "Fullstack Web Developer (Next.js & TypeScript)",
      slug: "fullstack-developer-nextjs-typescript-mataram",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.HYBRID,
      salaryMin: 6000000,
      salaryMax: 10000000,
      isSalaryDisclosed: true,
      education: EducationLevel.D4_S1,
      experience: ExperienceLevel.ONE_TO_THREE_YEARS,
      description:
        "Membangun dan mengembangkan platform aplikasi web modern berskala besar untuk klien korporasi dan pemerintah daerah di NTB.",
      responsibilities:
        "- Mengembangkan antarmuka responsif dengan Next.js App Router, React 19, dan Tailwind CSS.\n- Merancang REST & tRPC API dengan Node.js/Bun, Prisma, dan PostgreSQL/MySQL.\n- Melakukan code review, testing, dan kolaborasi dalam metodologi agile sprint.",
      requirements:
        "- Berpengalaman minimal 2 tahun menggunakan TypeScript, React / Next.js, dan database SQL.\n- Memahami prinsip arsitektur Server Components, RESTful design, dan Git flow.\n- Berdomisili atau bersedia kerja secara hybrid di Kota Mataram, Lombok.\n- Terbuka untuk Fresh Graduate dengan portofolio proyek yang kuat.",
      benefits:
        "Fleksibilitas hybrid working (3 hari kantor, 2 hari remote), anggaran pelatihan / sertifikasi, tunjangan perangkat laptop.",
      skills: ["TypeScript", "Next.js", "React", "Prisma", "Tailwind CSS"],
    },
    {
      companySlug: "pt-bank-ntb-syariah",
      categorySlug: "keuangan-perbankan",
      locationSlug: "kota-mataram",
      title: "Customer Service & Teller Operasional",
      slug: "customer-service-teller-bank-ntb-syariah-mataram",
      type: JobType.CONTRACT,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 3500000,
      salaryMax: 4500000,
      isSalaryDisclosed: true,
      education: EducationLevel.D4_S1,
      experience: ExperienceLevel.FRESH_GRADUATE,
      description:
        "Menjadi garda terdepan pelayanan transaksi dan konsultasi produk keuangan syariah kepada nasabah Bank NTB Syariah Cabang Utama Mataram.",
      responsibilities:
        "- Melayani transaksi tunai dan non-tunai nasabah secara akurat dan tepat waktu.\n- Memberikan edukasi produk simpanan dan pembiayaan syariah.\n- Menjaga kepatuhan terhadap regulasi perbankan OJK dan Dewan Syariah Nasional.",
      requirements:
        "- Lulusan D3/S1 semua jurusan dengan IPK minimal 3.00.\n- Berusia maksimal 25 tahun (Fresh Graduate dipersilakan melamar).\n- Memiliki integritas tinggi, ketelitian angka, dan kemampuan komunikasi yang ramah.\n- Bersedia ditempatkan di wilayah Kantor Cabang Mataram.",
      benefits:
        "Gaji sesuai UMP NTB + insentif kehadiran, seragam dinas, BPJS Ketenagakerjaan & Kesehatan, jenjang karir pegawai tetap.",
      skills: [
        "Perbankan Syariah",
        "Customer Service",
        "Komunikasi",
        "Cash Handling",
      ],
    },
    {
      companySlug: "pt-agro-sentra-dompu",
      categorySlug: "pertanian-perkebunan",
      locationSlug: "dompu",
      title: "Agronomist / Field Officer Jagung Hibrida",
      slug: "agronomist-field-officer-dompu-sumbawa",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 5000000,
      salaryMax: 7500000,
      isSalaryDisclosed: true,
      education: EducationLevel.D4_S1,
      experience: ExperienceLevel.ONE_TO_THREE_YEARS,
      description:
        "Mendampingi kelompok tani binaan di sentra perkebunan jagung Dompu dalam penerapan teknik budidaya modern dan pencegahan hama.",
      responsibilities:
        "- Memberikan penyuluhan penggunaan bibit unggul, pemupukan berimbang, dan manajemen air.\n- Melakukan monitoring kualitas tanah dan estimasi tonase hasil panen periodik.\n- Mengelola data demplot riset lapangan bersama tim R&D.",
      requirements:
        "- S1 Agronomi / Agroteknologi / Ilmu Tanah / Hama & Penyakit Tumbuhan.\n- Memiliki SIM C dan menyukai mobilitas tinggi di wilayah pedesaan Kabupaten Dompu.\n- Memahami karakteristik komoditas jagung kering pipil.\n- Diutamakan putra daerah Dompu atau Bima.",
      benefits:
        "Kendaraan dinas operasional motor trail, tempat tinggal mess lapangan, tunjangan pulsa & kuota data.",
      skills: [
        "Agronomi",
        "Budidaya Jagung",
        "Penyuluhan Tani",
        "Soil Management",
      ],
    },
    {
      companySlug: "katamaran-hotel-and-resort",
      categorySlug: "pariwisata-perhotelan",
      locationSlug: "lombok-tengah",
      title: "Tour Coordinator & Guest Relations Specialist",
      slug: "tour-coordinator-guest-relations-mandalika",
      type: JobType.CONTRACT,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 4000000,
      salaryMax: 6000000,
      isSalaryDisclosed: true,
      education: EducationLevel.D3,
      experience: ExperienceLevel.ONE_TO_THREE_YEARS,
      description:
        "Merancang paket eksplorasi wisata budaya Lombok dan Sirkuit Internasional Mandalika bagi wisatawan nusantara maupun mancanegara.",
      responsibilities:
        "- Menyusun jadwal itinerary tur private (Desa Sade, Pantai Kuta Mandalika, Bukit Merese).\n- Berkoordinasi dengan pemandu lokal, sopir, dan mitra vendor atraksi wisata NTB.\n- Memastikan keselamatan dan kepuasan pengalaman berlibur setiap tamu.",
      requirements:
        "- D3/S1 Pariwisata / Sastra Inggris / Hubungan Masyarakat.\n- Menguasai wawasan mendalam tentang sejarah, budaya Sasak, dan destinasi wisata Lombok.\n- Lancar berkomunikasi dalam Bahasa Inggris (kemampuan bahasa asing lain seperti Mandarin/Jerman nilai plus).",
      benefits:
        "Komisi paket tur, makan siang harian, asuransi kecelakaan kerja.",
      skills: [
        "Tour Planning",
        "Customer Relations",
        "English",
        "Sasak Culture Knowledge",
      ],
    },
    {
      companySlug: "pt-sasak-digital-nusantara",
      categorySlug: "konstruksi-properti",
      locationSlug: "lombok-timur",
      title: "Site Supervisor Konstruksi Bangunan Publik",
      slug: "site-supervisor-konstruksi-lombok-timur",
      type: JobType.FULL_TIME,
      workplace: WorkplaceType.ONSITE,
      salaryMin: 7000000,
      salaryMax: 11000000,
      isSalaryDisclosed: true,
      education: EducationLevel.D4_S1,
      experience: ExperienceLevel.THREE_TO_FIVE_YEARS,
      description:
        "Mengawasi implementasi gambar kerja arsitektur dan struktur pada proyek revitalisasi fasilitas publik di Kabupaten Lombok Timur.",
      responsibilities:
        "- Memastikan metode kerja kontraktor sesuai spesifikasi teknis dan RAB.\n- Memeriksa mutu material beton, baja, dan finishing di lapangan.\n- Membuat laporan progress mingguan (kurva S) dan memimpin toolbox safety meeting.",
      requirements:
        "- S1 Teknik Sipil / Arsitektur.\n- Pengalaman minimal 3 tahun sebagai Pelaksana / Site Supervisor proyek gedung atau infrastruktur.\n- Menguasai AutoCAD dan interpretasi gambar kerja struktur.\n- Memiliki SKA / SKK Konstruksi muda menjadi nilai tambah.",
      benefits: "Gaji pokok, tunjangan proyek lapangan, asuransi BPJS lengkap.",
      skills: [
        "Site Supervision",
        "AutoCAD",
        "Manajemen Proyek",
        "K3 Konstruksi",
      ],
    },
  ];

  for (const j of jobsData) {
    const comp = companyMap.get(j.companySlug);
    if (!comp) continue;

    const locId = locationMap.get(j.locationSlug);
    const catId = categoryMap.get(j.categorySlug);
    if (!locId || !catId) continue;

    const job = await prisma.job.upsert({
      where: { slug: j.slug },
      update: {
        title: j.title,
        type: j.type,
        workplace: j.workplace,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        isSalaryDisclosed: j.isSalaryDisclosed,
        education: j.education,
        experience: j.experience,
        description: j.description,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        benefits: j.benefits,
        status: "PUBLISHED",
        locationId: locId,
        categoryId: catId,
        companyId: comp.companyId,
        creatorId: comp.userId,
        applicationMethod: ApplicationMethod.KERJANTB,
      },
      create: {
        title: j.title,
        slug: j.slug,
        type: j.type,
        workplace: j.workplace,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        isSalaryDisclosed: j.isSalaryDisclosed,
        education: j.education,
        experience: j.experience,
        description: j.description,
        responsibilities: j.responsibilities,
        requirements: j.requirements,
        benefits: j.benefits,
        status: "PUBLISHED",
        locationId: locId,
        categoryId: catId,
        companyId: comp.companyId,
        creatorId: comp.userId,
        applicationMethod: ApplicationMethod.KERJANTB,
      },
    });

    // Seed skills for this job
    for (const skillName of j.skills) {
      const skillSlug = skillName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const skill = await prisma.skill.upsert({
        where: { slug: skillSlug },
        update: { name: skillName },
        create: { name: skillName, slug: skillSlug },
      });

      await prisma.jobSkill.upsert({
        where: {
          jobId_skillId: {
            jobId: job.id,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          jobId: job.id,
          skillId: skill.id,
        },
      });
    }
  }

  console.log("✓ 8 Lowongan Kerja NTB Realistis berhasil disiapkan.");
  console.log("==> Seeding seluruh data KerjaNTB sukses!");
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
