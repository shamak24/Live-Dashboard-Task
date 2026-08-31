import { faker } from "@faker-js/faker";
import {
  BookingStatus,
  MechanicStatus,
  PrismaClient,
  Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  buildTemplatePostVisitSummary,
  buildTemplatePreVisitSummary,
} from "../src/services/llmService.js";

const prisma = new PrismaClient();

const SERVICE_CATEGORIES = [
  { name: "Oil Change", description: "Full synthetic oil change and filter replacement", basePrice: 49.99 },
  { name: "Brake Repair", description: "Brake pad and rotor inspection and replacement", basePrice: 199.99 },
  { name: "Tire Replacement", description: "Tire rotation, balancing, and replacement", basePrice: 149.99 },
  { name: "Battery Service", description: "Battery testing, replacement, and terminal cleaning", basePrice: 89.99 },
  { name: "AC Repair", description: "Air conditioning system diagnosis and repair", basePrice: 179.99 },
  { name: "General Diagnostics", description: "Comprehensive vehicle health check", basePrice: 79.99 },
  { name: "Transmission Service", description: "Transmission fluid change and inspection", basePrice: 129.99 },
];

const VEHICLE_MAKES = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Nissan", "Hyundai", "Kia", "Volkswagen"];

const STATUS_WEIGHTS: { status: BookingStatus; weight: number }[] = [
  { status: BookingStatus.COMPLETED, weight: 55 },
  { status: BookingStatus.CANCELLED, weight: 8 },
  { status: BookingStatus.PENDING, weight: 10 },
  { status: BookingStatus.ASSIGNED, weight: 8 },
  { status: BookingStatus.MECHANIC_ON_THE_WAY, weight: 7 },
  { status: BookingStatus.IN_PROGRESS, weight: 7 },
  { status: BookingStatus.IN_PROGRESS, weight: 5 },
];

function pickWeightedStatus(): BookingStatus {
  const total = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let rand = Math.random() * total;
  for (const { status, weight } of STATUS_WEIGHTS) {
    rand -= weight;
    if (rand <= 0) return status;
  }
  return BookingStatus.COMPLETED;
}

function randomDateInRange(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.booking.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.mechanic.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 12);

  // Admin user for dashboard login
  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@instantmechanic.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  // Service categories
  const categories = await Promise.all(
    SERVICE_CATEGORIES.map((cat) =>
      prisma.serviceCategory.create({ data: cat })
    )
  );

  // Mechanics (20+)
  const mechanics = [];
  const mechanicNames: Record<string, string> = {};
  for (let i = 0; i < 22; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        passwordHash,
        role: Role.MECHANIC,
        mechanic: {
          create: {
            status: faker.helpers.arrayElement([
              MechanicStatus.AVAILABLE,
              MechanicStatus.ON_JOB,
              MechanicStatus.OFFLINE,
            ]),
            jobsCompleted: faker.number.int({ min: 10, max: 200 }),
            specialty: faker.helpers.arrayElement(
              SERVICE_CATEGORIES.map((c) => c.name)
            ),
          },
        },
      },
      include: { mechanic: true },
    });
    mechanics.push(user.mechanic!);
    mechanicNames[user.mechanic!.id] = user.name;
  }

  // Customers (50+)
  const customers = [];
  const customerNames: Record<string, string> = {};
  for (let i = 0; i < 55; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        passwordHash,
        role: Role.CUSTOMER,
        customer: {
          create: {
            phone: faker.phone.number(),
            address: faker.location.streetAddress({ useFullAddress: true }),
          },
        },
      },
      include: { customer: true },
    });
    customers.push(user.customer!);
    customerNames[user.customer!.id] = user.name;
  }

  // Vehicles for each customer
  const vehicles = [];
  for (const customer of customers) {
    const numVehicles = faker.number.int({ min: 1, max: 3 });
    for (let v = 0; v < numVehicles; v++) {
      const make = faker.helpers.arrayElement(VEHICLE_MAKES);
      const vehicle = await prisma.vehicle.create({
        data: {
          customerId: customer.id,
          make,
          model: faker.vehicle.model(),
          year: faker.number.int({ min: 2010, max: 2025 }),
          plate: faker.vehicle.vrm(),
        },
      });
      vehicles.push(vehicle);
    }
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const twoMonthsAhead = new Date();
  twoMonthsAhead.setMonth(twoMonthsAhead.getMonth() + 2);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Bookings (500+)
  const bookingCount = 520;
  let todayCount = 0;

  for (let i = 0; i < bookingCount; i++) {
    const customer = faker.helpers.arrayElement(customers);
    const customerVehicles = vehicles.filter((v) => v.customerId === customer.id);
    const vehicle = faker.helpers.arrayElement(customerVehicles);
    const category = faker.helpers.arrayElement(categories);

    let status = pickWeightedStatus();
    let scheduledAt: Date;

    // Ensure ~25-40 bookings today for dashboard stat
    if (todayCount < 35 && i > bookingCount - 100) {
      scheduledAt = randomDateInRange(todayStart, todayEnd);
      status = faker.helpers.arrayElement([
        BookingStatus.PENDING,
        BookingStatus.ASSIGNED,
        BookingStatus.MECHANIC_ON_THE_WAY,
        BookingStatus.IN_PROGRESS,
        BookingStatus.COMPLETED,
      ]);
      todayCount++;
    } else {
      scheduledAt = randomDateInRange(sixMonthsAgo, twoMonthsAhead);
    }

    const basePrice = Number(category.basePrice);
    const amount = basePrice + faker.number.float({ min: -20, max: 80, fractionDigits: 2 });

    let mechanicId: string | null = null;
    if (
      status !== BookingStatus.PENDING &&
      status !== BookingStatus.CANCELLED
    ) {
      mechanicId = faker.helpers.arrayElement(mechanics).id;
    }

    const createdAt = randomDateInRange(
      new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000),
      scheduledAt
    );

    const assignedMechanic = mechanicId
      ? mechanics.find((m) => m.id === mechanicId)
      : null;

    const summaryContext = {
      status,
      amount,
      scheduledAt,
      customer: {
        name: customerNames[customer.id],
        phone: customer.phone,
        address: customer.address,
      },
      vehicle,
      serviceCategory: category,
      mechanic: assignedMechanic
        ? {
            name: mechanicNames[assignedMechanic.id],
            specialty: assignedMechanic.specialty,
          }
        : undefined,
    };

    await prisma.booking.create({
      data: {
        customerId: customer.id,
        vehicleId: vehicle.id,
        mechanicId,
        serviceCategoryId: category.id,
        status,
        amount,
        scheduledAt,
        createdAt,
        preVisitSummary:
          status !== BookingStatus.PENDING
            ? buildTemplatePreVisitSummary(summaryContext)
            : null,
        postVisitSummary:
          status === BookingStatus.COMPLETED
            ? buildTemplatePostVisitSummary(summaryContext)
            : null,
      },
    });
  }

  console.log(`✅ Seeded:
  - ${categories.length} service categories
  - ${mechanics.length} mechanics
  - ${customers.length} customers
  - ${vehicles.length} vehicles
  - ${bookingCount} bookings (${todayCount} today)
  - Admin login: admin@instantmechanic.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
