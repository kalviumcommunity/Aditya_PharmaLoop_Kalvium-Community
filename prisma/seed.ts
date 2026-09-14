import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, OrderStatus, PaymentStatus, PaymentAttemptStatus, SubscriptionFrequency, SubscriptionStatus, NotificationType } from "../app/generated/prisma/client";

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

if (process.env.NODE_ENV === "production") {
  console.error(
    "[SEED ABORTED] prisma/seed.ts must NEVER be run against a production database.\n" +
      "It creates known demo/admin credentials intended for local development only.\n" +
      "Unset NODE_ENV=production or run against a dedicated development database.",
  );
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 25 Realistic Healthcare Products
const SEED_PRODUCTS = [
  {
    name: "Crocin 650",
    description: "Paracetamol 650 mg tablets for pain and fever relief (15 Tablets)",
    price: 35.0,
    stock: 120,
    isActive: true,
  },
  {
    name: "Dolo 650",
    description: "Paracetamol 650 mg tablets for pain and fever relief (15 Tablets)",
    price: 32.0,
    stock: 150,
    isActive: true,
  },
  {
    name: "Calpol 500",
    description: "Paracetamol 500 mg tablets (10 Tablets)",
    price: 24.0,
    stock: 90,
    isActive: true,
  },
  {
    name: "Cetirizine 10mg",
    description: "Cetirizine Hydrochloride 10 mg tablets for allergy relief (10 Tablets)",
    price: 22.0,
    stock: 80,
    isActive: true,
  },
  {
    name: "Azithromycin 500mg",
    description: "Azithromycin 500 mg tablets (3 Tablets)",
    price: 75.0,
    stock: 60,
    isActive: true,
  },
  {
    name: "Amoxicillin 500mg",
    description: "Amoxicillin 500 mg capsules (10 Capsules)",
    price: 85.0,
    stock: 70,
    isActive: true,
  },
  {
    name: "Augmentin 625 Duo",
    description: "Amoxicillin and Potassium Clavulanate tablets IP 625 mg (10 Tablets)",
    price: 180.0,
    stock: 50,
    isActive: true,
  },
  {
    name: "Neurobion Forte",
    description: "Vitamin B-Complex with Vitamin B12 tablets (30 Tablets)",
    price: 45.0,
    stock: 110,
    isActive: true,
  },
  {
    name: "Revital H",
    description: "Daily health supplement with Ginseng and essential vitamins (30 Capsules)",
    price: 310.0,
    stock: 45,
    isActive: true,
  },
  {
    name: "Vitamin D3 1000 IU",
    description: "Cholecalciferol (Vitamin D3) 1000 IU tablets (60 Tablets)",
    price: 260.0,
    stock: 95,
    isActive: true,
  },
  {
    name: "Omega 3 Fish Oil",
    description: "Omega 3 fish oil capsules containing EPA and DHA (60 Capsules)",
    price: 480.0,
    stock: 40,
    isActive: true,
  },
  {
    name: "Vicks VapoRub",
    description: "Menthol and camphor topical ointment for cold relief (50 g)",
    price: 95.0,
    stock: 130,
    isActive: true,
  },
  {
    name: "Salbutamol Inhaler",
    description: "Salbutamol 100 mcg metered dose inhaler (200 doses)",
    price: 165.0,
    stock: 35,
    isActive: true,
  },
  {
    name: "Hand Sanitizer 100ml",
    description: "70% Isopropyl alcohol hand sanitizer rinse-free solution (100 ml)",
    price: 60.0,
    stock: 200,
    isActive: true,
  },
  {
    name: "Cetaphil Gentle Cleanser",
    description: "Gentle skin cleanser hydrating formula (125 ml)",
    price: 330.0,
    stock: 40,
    isActive: true,
  },
  {
    name: "Pantoprazole 40mg",
    description: "Pantoprazole gastro-resistant tablets IP 40 mg (15 Tablets)",
    price: 90.0,
    stock: 85,
    isActive: true,
  },
  {
    name: "Metformin 500mg",
    description: "Metformin Hydrochloride sustained-release tablets IP 500 mg (20 Tablets)",
    price: 42.0,
    stock: 100,
    isActive: true,
  },
  {
    name: "Telmisartan 40mg",
    description: "Telmisartan tablets IP 40 mg (15 Tablets)",
    price: 110.0,
    stock: 75,
    isActive: true,
  },
  {
    name: "Atorvastatin 10mg",
    description: "Atorvastatin calcium tablets IP 10 mg (15 Tablets)",
    price: 135.0,
    stock: 65,
    isActive: true,
  },
  {
    name: "Cough Syrup Honitus",
    description: "Herbal non-drowsy cough syrup (100 ml)",
    price: 115.0,
    stock: 90,
    isActive: true,
  },
  {
    name: "Oral Rehydration Salts",
    description: "WHO formulation oral rehydration salts electrolyte powder (4 Sachets)",
    price: 25.0,
    stock: 150,
    isActive: true,
  },
  {
    name: "Digene Gel Antacid",
    description: "Antacid and antiflatulent oral suspension mint flavor (200 ml)",
    price: 140.0,
    stock: 70,
    isActive: true,
  },
  {
    name: "Volini Pain Relief Gel",
    description: "Diclofenac diethylamine pain relief gel (50 g)",
    price: 125.0,
    stock: 85,
    isActive: true,
  },
  {
    name: "Becosules Z Capsules",
    description: "Vitamin B-Complex with Zinc capsules (20 Capsules)",
    price: 55.0,
    stock: 95,
    isActive: true,
  },
  {
    name: "Multivitamin A-Z Daily",
    description: "Daily multivitamin and mineral tablets (60 Tablets)",
    price: 299.0,
    stock: 60,
    isActive: true,
  },
];

async function main() {
  console.log("--- Starting PharmaLoop Idempotent Database Seed ---");
  console.log(
    "WARNING: Development seed only. Creates demo@pharmaloop.local / admin@pharmaloop.local with known passwords. NEVER run against production.",
  );

  // 1. Seed Products (Idempotent via name check)
  console.log("Seeding products...");
  const productMap: Record<string, string> = {};

  for (const item of SEED_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name },
    });

    if (existing) {
      const updated = await prisma.product.update({
        where: { id: existing.id },
        data: {
          description: item.description,
          price: item.price,
          stock: item.stock,
          isActive: item.isActive,
        },
      });
      productMap[item.name] = updated.id;
    } else {
      const created = await prisma.product.create({
        data: {
          name: item.name,
          description: item.description,
          price: item.price,
          stock: item.stock,
          isActive: item.isActive,
        },
      });
      productMap[item.name] = created.id;
    }
  }
  console.log(`Seeded ${Object.keys(productMap).length} products successfully.`);

  // 2. Seed / Upsert Demo User
  console.log("Seeding demo user...");
  const demoEmail = "demo@pharmaloop.local";
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoUser) {
    const hashedPassword = await bcrypt.hash("Demo1234!", 12);
    demoUser = await prisma.user.create({
      data: {
        name: "PharmaLoop Demo User",
        email: demoEmail,
        phone: "+91 98000 12345",
        password: hashedPassword,
        role: "CUSTOMER",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Created demo user: ${demoUser.email} (${demoUser.id})`);
  } else {
    console.log(`Reusing existing demo user: ${demoUser.email} (${demoUser.id})`);
  }

  // Seed / Upsert Staff Admin User
  console.log("Seeding staff admin user...");
  const adminEmail = "admin@pharmaloop.local";
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash("Admin1234!", 12);
    adminUser = await prisma.user.create({
      data: {
        name: "PharmaLoop Staff Admin",
        email: adminEmail,
        phone: "+91 98000 99999",
        password: hashedPassword,
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Created staff admin user: ${adminUser.email} (${adminUser.id})`);
  } else {
    console.log(`Reusing existing staff admin user: ${adminUser.email} (${adminUser.id})`);
  }

  // 3. Seed Addresses for Demo User (Idempotent via label + userId)
  console.log("Seeding addresses...");
  let homeAddress = await prisma.address.findFirst({
    where: { userId: demoUser.id, label: "Home" },
  });
  if (!homeAddress) {
    homeAddress = await prisma.address.create({
      data: {
        userId: demoUser.id,
        label: "Home",
        address: "Flat 402, Lotus Heights, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
        country: "India",
      },
    });
    console.log("Created Home address.");
  } else {
    console.log("Reusing existing Home address.");
  }

  let officeAddress = await prisma.address.findFirst({
    where: { userId: demoUser.id, label: "Office" },
  });
  if (!officeAddress) {
    officeAddress = await prisma.address.create({
      data: {
        userId: demoUser.id,
        label: "Office",
        address: "Cyber Gateway, Tech Park Block 3",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560100",
        country: "India",
      },
    });
    console.log("Created Office address.");
  } else {
    console.log("Reusing existing Office address.");
  }

  // 4. Seed Orders (Idempotent: Only seed if user has 0 orders)
  const existingOrders = await prisma.order.findMany({
    where: { userId: demoUser.id },
  });

  if (existingOrders.length === 0) {
    console.log("Seeding orders for demo user...");
    const crocinId = productMap["Crocin 650"];
    const d3Id = productMap["Vitamin D3 1000 IU"];
    const omegaId = productMap["Omega 3 Fish Oil"];

    if (crocinId && d3Id && homeAddress) {
      // Order 1: Delivered
      const order1 = await prisma.order.create({
        data: {
          userId: demoUser.id,
          addressId: homeAddress.id,
          status: OrderStatus.DELIVERED,
          total: 330.0,
          items: {
            create: [
              { productId: crocinId, quantity: 2, price: 35.0 },
              { productId: d3Id, quantity: 1, price: 260.0 },
            ],
          },
          payment: {
            create: {
              amount: 330.0,
              status: PaymentStatus.SUCCESS,
              attempts: {
                create: {
                  status: PaymentAttemptStatus.SUCCESS,
                },
              },
            },
          },
        },
      });
      console.log(`Created Order 1 (DELIVERED): ${order1.id}`);
    }

    if (omegaId && homeAddress) {
      // Order 2: Processing
      const order2 = await prisma.order.create({
        data: {
          userId: demoUser.id,
          addressId: homeAddress.id,
          status: OrderStatus.PROCESSING,
          total: 480.0,
          items: {
            create: [{ productId: omegaId, quantity: 1, price: 480.0 }],
          },
          payment: {
            create: {
              amount: 480.0,
              status: PaymentStatus.SUCCESS,
              attempts: {
                create: {
                  status: PaymentAttemptStatus.SUCCESS,
                },
              },
            },
          },
        },
      });
      console.log(`Created Order 2 (PROCESSING): ${order2.id}`);
    }
  } else {
    console.log(`Found ${existingOrders.length} existing orders for demo user. Skipping order creation.`);
  }

  // 5. Seed Subscriptions (Idempotent: Only seed if user has 0 subscriptions)
  const existingSubs = await prisma.subscription.findMany({
    where: { userId: demoUser.id },
  });

  if (existingSubs.length === 0 && homeAddress) {
    console.log("Seeding subscriptions for demo user...");
    const crocinId = productMap["Crocin 650"];
    const d3Id = productMap["Vitamin D3 1000 IU"];

    if (crocinId) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const sub1 = await prisma.subscription.create({
        data: {
          userId: demoUser.id,
          addressId: homeAddress.id,
          frequency: SubscriptionFrequency.MONTHLY,
          nextRefillDate: nextWeek,
          refillTime: "09:00",
          status: SubscriptionStatus.ACTIVE,
          items: {
            create: [{ productId: crocinId, quantity: 1 }],
          },
        },
      });
      console.log(`Created Subscription 1 (ACTIVE, MONTHLY): ${sub1.id}`);
    }

    if (d3Id) {
      const nextFortnight = new Date();
      nextFortnight.setDate(nextFortnight.getDate() + 14);

      const sub2 = await prisma.subscription.create({
        data: {
          userId: demoUser.id,
          addressId: homeAddress.id,
          frequency: SubscriptionFrequency.BIWEEKLY,
          nextRefillDate: nextFortnight,
          refillTime: "10:00",
          status: SubscriptionStatus.ACTIVE,
          items: {
            create: [{ productId: d3Id, quantity: 1 }],
          },
        },
      });
      console.log(`Created Subscription 2 (ACTIVE, BIWEEKLY): ${sub2.id}`);
    }
  } else {
    console.log(`Found ${existingSubs.length} existing subscriptions. Skipping subscription creation.`);
  }

  // 6. Seed Notifications (Idempotent: Only seed if user has 0 notifications)
  const existingNotifs = await prisma.notification.findMany({
    where: { userId: demoUser.id },
  });

  if (existingNotifs.length === 0) {
    console.log("Seeding notifications for demo user...");
    await prisma.notification.createMany({
      data: [
        {
          userId: demoUser.id,
          type: NotificationType.REFILL,
          title: "Upcoming Refill: Crocin 650",
          message: "Your monthly prescription refill is scheduled for delivery in 7 days.",
          isRead: false,
        },
        {
          userId: demoUser.id,
          type: NotificationType.ORDER,
          title: "Order Delivered Successfully",
          message: "Your package containing Crocin 650 and Vitamin D3 has arrived.",
          isRead: true,
        },
        {
          userId: demoUser.id,
          type: NotificationType.PAYMENT,
          title: "Payment Received",
          message: "Payment of ₹330.00 for your order was successfully processed.",
          isRead: true,
        },
        {
          userId: demoUser.id,
          type: NotificationType.SYSTEM,
          title: "Welcome to PharmaLoop",
          message: "Your account is set up for automated prescription refills and tracking.",
          isRead: false,
        },
      ],
    });
    console.log("Created 4 notifications for demo user.");
  } else {
    console.log(`Found ${existingNotifs.length} existing notifications. Skipping notification creation.`);
  }

  console.log("--- Seed Completed Successfully ---");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
