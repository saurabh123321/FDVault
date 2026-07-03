import { PrismaClient, Role, FdStatus, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.fDTransaction.deleteMany({});
  await prisma.fD.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.family.deleteMany({});

  console.log('Seeding family...');
  const defaultFamily = await prisma.family.create({
    data: {
      name: 'Sharma Family',
    },
  });

  console.log('Seeding users...');
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const viewerPassword = bcrypt.hashSync('viewer123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@family.com',
      password: adminPassword,
      name: 'Admin Member',
      role: Role.ADMIN,
      familyId: defaultFamily.id,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@family.com',
      password: viewerPassword,
      name: 'Family Member',
      role: Role.VIEWER,
      familyId: defaultFamily.id,
    },
  });

  console.log('Seeding FDs and Transactions...');

  // Date anchors relative to May 22, 2026

  // 1. Ramesh Sharma - Old Matured & Renewed FD
  const oldFd1 = await prisma.fD.create({
    data: {
      accountNumber: '1092837465',
      receiptNumber: 'FD/2025/001',
      holderName: 'Ramesh Sharma',
      startDate: new Date('2025-01-10T00:00:00.000Z'),
      endDate: new Date('2026-01-10T00:00:00.000Z'),
      principalAmount: 500000.0,
      withdrawAmount: 536250.0,
      interestEarned: 36250.0,
      interestRate: 7.25,
      status: FdStatus.RENEWED,
      remarks: 'Renewed fully into FD/2026/001',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.createMany({
    data: [
      {
        fdId: oldFd1.id,
        transactionType: TransactionType.CREATE,
        amount: 500000.0,
        notes: 'Initial deposit',
        createdAt: new Date('2025-01-10T00:00:00.000Z'),
      },
      {
        fdId: oldFd1.id,
        transactionType: TransactionType.RENEW,
        amount: 536250.0,
        notes: 'Renewed full maturity amount',
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
      },
    ],
  });

  // 1b. Ramesh Sharma - Active Renewed FD (Linked to oldFd1)
  const newFd1 = await prisma.fD.create({
    data: {
      accountNumber: '1092837465',
      receiptNumber: 'FD/2026/001',
      holderName: 'Ramesh Sharma',
      startDate: new Date('2026-01-10T00:00:00.000Z'),
      endDate: new Date('2027-01-10T00:00:00.000Z'),
      principalAmount: 536250.0,
      withdrawAmount: 576468.75, // Projected maturity amount
      interestEarned: 40218.75,
      interestRate: 7.5,
      status: FdStatus.ACTIVE,
      parentFdId: oldFd1.id,
      remarks: 'Renewed from FD/2025/001',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.create({
    data: {
      fdId: newFd1.id,
      transactionType: TransactionType.CREATE,
      amount: 536250.0,
      notes: 'Created via renewal of FD/2025/001',
      createdAt: new Date('2026-01-10T00:00:00.000Z'),
    },
  });

  // 2. Sita Sharma - Large Matured FD
  const fd2 = await prisma.fD.create({
    data: {
      accountNumber: '9876543210',
      receiptNumber: 'FD/2024/099',
      holderName: 'Sita Sharma',
      startDate: new Date('2024-05-15T00:00:00.000Z'),
      endDate: new Date('2026-05-15T00:00:00.000Z'), // Matured 7 days ago
      principalAmount: 1000000.0,
      withdrawAmount: 1140560.0,
      interestEarned: 140560.0,
      interestRate: 6.8,
      status: FdStatus.MATURED,
      remarks: 'Awaiting instructions for renewal or withdrawal',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.create({
    data: {
      fdId: fd2.id,
      transactionType: TransactionType.CREATE,
      amount: 1000000.0,
      notes: 'Initial lump sum deposit',
      createdAt: new Date('2024-05-15T00:00:00.000Z'),
    },
  });

  // 3. Sita Sharma - Active FD Maturing Soon (next 6 days)
  const fd3 = await prisma.fD.create({
    data: {
      accountNumber: '9876543211',
      receiptNumber: 'FD/2026/012',
      holderName: 'Sita Sharma',
      startDate: new Date('2026-03-01T00:00:00.000Z'),
      endDate: new Date('2026-05-28T00:00:00.000Z'), // Maturing May 28, 2026
      principalAmount: 300000.0,
      withdrawAmount: 305100.0,
      interestEarned: 5100.0,
      interestRate: 7.1,
      status: FdStatus.ACTIVE,
      remarks: 'Short-term deposit',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.create({
    data: {
      fdId: fd3.id,
      transactionType: TransactionType.CREATE,
      amount: 300000.0,
      notes: 'Created short-term FD',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
    },
  });

  // 4. Sita Sharma - Active FD Maturing in ~30 days
  const fd4 = await prisma.fD.create({
    data: {
      accountNumber: '9876543212',
      receiptNumber: 'FD/2026/015',
      holderName: 'Sita Sharma',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: new Date('2026-06-20T00:00:00.000Z'), // Maturing June 20, 2026
      principalAmount: 200000.0,
      withdrawAmount: 201944.44,
      interestEarned: 1944.44,
      interestRate: 7.0,
      status: FdStatus.ACTIVE,
      remarks: 'Regular deposit',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.create({
    data: {
      fdId: fd4.id,
      transactionType: TransactionType.CREATE,
      amount: 200000.0,
      notes: 'Created new FD',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    },
  });

  // 5. Rahul Sharma - Withdrawn FD
  const fd5 = await prisma.fD.create({
    data: {
      accountNumber: '5566778899',
      receiptNumber: 'FD/2025/110',
      holderName: 'Rahul Sharma',
      startDate: new Date('2025-08-01T00:00:00.000Z'),
      endDate: new Date('2026-02-01T00:00:00.000Z'), // Withdrawn on maturity
      principalAmount: 150000.0,
      withdrawAmount: 154875.0,
      interestEarned: 4875.0,
      interestRate: 6.5,
      status: FdStatus.WITHDRAWN,
      remarks: 'Withdrawn to bank account',
      familyId: defaultFamily.id,
    },
  });

  await prisma.fDTransaction.createMany({
    data: [
      {
        fdId: fd5.id,
        transactionType: TransactionType.CREATE,
        amount: 150000.0,
        notes: 'Deposit for higher education fund',
        createdAt: new Date('2025-08-01T00:00:00.000Z'),
      },
      {
        fdId: fd5.id,
        transactionType: TransactionType.WITHDRAW,
        amount: 154875.0,
        notes: 'Withdrawn in full upon maturity',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ],
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
