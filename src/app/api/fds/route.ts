import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const fdSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  holderName: z.string().min(1, 'Holder name is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  principalAmount: z.number().positive('Principal amount must be positive'),
  withdrawAmount: z.number().positive('Maturity/Withdrawal amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate must be non-negative'),
  remarks: z.string().optional().nullable(),
  parentFdId: z.string().optional().nullable(),
});

// GET /api/fds - Fetch all FDs with filtering, searching, and sorting
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status'); // comma-separated status list, e.g., "ACTIVE,MATURED"
  const holderName = searchParams.get('holderName');
  const sortBy = searchParams.get('sortBy') || 'endDate'; // endDate, principalAmount, interestRate, createdAt
  const sortOrder = searchParams.get('sortOrder') || 'asc'; // asc, desc
  
  // Date ranges
  const startRangeFrom = searchParams.get('startRangeFrom');
  const startRangeTo = searchParams.get('startRangeTo');
  const endRangeFrom = searchParams.get('endRangeFrom');
  const endRangeTo = searchParams.get('endRangeTo');

  // Build prisma query conditions
  const where: any = {
    isDeleted: false,
    familyId: (session.user as any).familyId,
  };

  // Search filter (Account No, Receipt No, Holder Name)
  if (search) {
    where.OR = [
      { accountNumber: { contains: search, mode: 'insensitive' } },
      { receiptNumber: { contains: search, mode: 'insensitive' } },
      { holderName: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Status filter
  if (status) {
    where.status = { in: status.split(',') };
  }

  // Holder name filter (direct selection)
  if (holderName) {
    where.holderName = holderName;
  }

  // Start Date filter range
  if (startRangeFrom || startRangeTo) {
    where.startDate = {};
    if (startRangeFrom) where.startDate.gte = new Date(startRangeFrom);
    if (startRangeTo) where.startDate.lte = new Date(startRangeTo);
  }

  // End Date (Maturity) filter range
  if (endRangeFrom || endRangeTo) {
    where.endDate = {};
    if (endRangeFrom) where.endDate.gte = new Date(endRangeFrom);
    if (endRangeTo) where.endDate.lte = new Date(endRangeTo);
  }

  try {
    const fds = await prisma.fD.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        transactions: true,
      },
    });

    return NextResponse.json(fds);
  } catch (error: any) {
    console.error('Error fetching FDs:', error);
    return NextResponse.json({ error: 'Failed to fetch FDs' }, { status: 500 });
  }
}

// POST /api/fds - Create a new FD
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Restrict to ADMIN
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = fdSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Check for duplicate account number + receipt number combination
    const existingFd = await prisma.fD.findFirst({
      where: {
        accountNumber: data.accountNumber,
        receiptNumber: data.receiptNumber,
        familyId: (session.user as any).familyId,
        isDeleted: false,
      },
    });

    if (existingFd) {
      return NextResponse.json(
        { error: 'An FD with this account number and receipt number combination already exists.' },
        { status: 400 }
      );
    }

    // Calculate interest earned: withdrawAmount - principalAmount
    const interestEarned = Number((data.withdrawAmount - data.principalAmount).toFixed(2));

    // Create the FD and record a Transaction
    const newFd = await prisma.$transaction(async (tx) => {
      const createdFd = await tx.fD.create({
        data: {
          accountNumber: data.accountNumber,
          receiptNumber: data.receiptNumber,
          holderName: data.holderName,
          startDate: data.startDate,
          endDate: data.endDate,
          principalAmount: data.principalAmount,
          withdrawAmount: data.withdrawAmount,
          interestEarned,
          interestRate: data.interestRate,
          status: 'ACTIVE',
          remarks: data.remarks,
          parentFdId: data.parentFdId || null,
          familyId: (session.user as any).familyId,
        },
      });

      // Create transaction log
      await tx.fDTransaction.create({
        data: {
          fdId: createdFd.id,
          transactionType: 'CREATE',
          amount: data.principalAmount,
          notes: data.parentFdId 
            ? `Created via renewal of parent FD ID ${data.parentFdId}`
            : 'Initial FD investment created',
          createdAt: new Date(),
        },
      });

      return createdFd;
    });

    return NextResponse.json(newFd, { status: 201 });
  } catch (error: any) {
    console.error('Error creating FD:', error);
    return NextResponse.json({ error: 'Failed to create FD' }, { status: 500 });
  }
}
