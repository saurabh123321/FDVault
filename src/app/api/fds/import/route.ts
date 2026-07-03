import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const importItemSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  holderName: z.string().min(1, 'Holder name is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  principalAmount: z.number().positive('Principal amount must be positive'),
  withdrawAmount: z.number().positive('Withdrawal amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate must be non-negative'),
  remarks: z.string().optional().nullable(),
});

const importBatchSchema = z.array(importItemSchema);

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = importBatchSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const importItems = result.data;
    
    // Fetch all active FDs to check duplicates efficiently
    const activeFds = await prisma.fD.findMany({
      where: { 
        isDeleted: false,
        familyId: (session.user as any).familyId
      },
      select: { accountNumber: true, receiptNumber: true },
    });

    const activeSet = new Set(
      activeFds.map((fd) => `${fd.accountNumber.trim().toLowerCase()}-${fd.receiptNumber.trim().toLowerCase()}`)
    );

    const toInsert: any[] = [];
    let duplicateCount = 0;

    // Filter duplicates within the imported list and against database
    const localSeen = new Set<string>();

    for (const item of importItems) {
      const key = `${item.accountNumber.trim().toLowerCase()}-${item.receiptNumber.trim().toLowerCase()}`;
      
      if (activeSet.has(key) || localSeen.has(key)) {
        duplicateCount++;
        continue;
      }

      localSeen.add(key);
      
      const interestEarned = Number((item.withdrawAmount - item.principalAmount).toFixed(2));

      toInsert.push({
        ...item,
        interestEarned,
        status: 'ACTIVE',
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No records imported. All rows were either duplicates or already existed.',
        imported: 0,
        skipped: duplicateCount,
      });
    }

    // Insert inside a transaction and log transactions
    const importedCount = await prisma.$transaction(async (tx) => {
      // 1. Create all FDs at once and get their created data back
      const createdFds = await tx.fD.createManyAndReturn({
        data: toInsert.map((item) => ({
          accountNumber: item.accountNumber,
          receiptNumber: item.receiptNumber,
          holderName: item.holderName,
          startDate: item.startDate,
          endDate: item.endDate,
          principalAmount: item.principalAmount,
          withdrawAmount: item.withdrawAmount,
          interestEarned: item.interestEarned,
          interestRate: item.interestRate,
          status: 'ACTIVE',
          remarks: item.remarks || 'Imported from Excel spreadsheet',
          familyId: (session.user as any).familyId,
        })),
      });

      // 2. Create all FDTransactions at once using createMany
      await tx.fDTransaction.createMany({
        data: createdFds.map((fd) => ({
          fdId: fd.id,
          transactionType: 'CREATE',
          amount: fd.principalAmount,
          notes: 'Imported via spreadsheet upload',
          createdAt: new Date(),
        })),
      });

      return createdFds.length;
    }, {
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} fixed deposits.`,
      imported: importedCount,
      skipped: duplicateCount,
    });

  } catch (error: any) {
    console.error('Error importing bulk FDs:', error);
    return NextResponse.json({ error: 'Failed to process import request' }, { status: 500 });
  }
}
