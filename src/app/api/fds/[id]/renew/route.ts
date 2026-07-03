import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const renewalSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  principalAmount: z.number().positive('Principal amount must be positive'),
  withdrawAmount: z.number().positive('Maturity amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate must be non-negative'),
  remarks: z.string().optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
  }

  const { id } = await params; // Parent FD ID

  try {
    const body = await request.json();
    const result = renewalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Check if the parent FD exists and is active/matured
    const parentFd = await prisma.fD.findUnique({
      where: { id },
    });

    if (!parentFd || parentFd.isDeleted) {
      return NextResponse.json({ error: 'Parent FD not found' }, { status: 404 });
    }

    if (parentFd.status === 'RENEWED' || parentFd.status === 'WITHDRAWN') {
      return NextResponse.json(
        { error: `Cannot renew an FD that is already ${parentFd.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Verify uniqueness of the new FD's Account + Receipt number
    const duplicateFd = await prisma.fD.findFirst({
      where: {
        accountNumber: data.accountNumber,
        receiptNumber: data.receiptNumber,
        isDeleted: false,
      },
    });

    if (duplicateFd) {
      return NextResponse.json(
        { error: 'An FD with this account number and receipt number combination already exists.' },
        { status: 400 }
      );
    }

    const interestEarned = Number((data.withdrawAmount - data.principalAmount).toFixed(2));

    const resultData = await prisma.$transaction(async (tx) => {
      // 1. Update the parent FD status to RENEWED
      await tx.fD.update({
        where: { id },
        data: {
          status: 'RENEWED',
          remarks: `${parentFd.remarks || ''}\nRenewed into ${data.receiptNumber} on ${new Date(data.startDate).toLocaleDateString()}`.trim(),
        },
      });

      // 2. Log RENEW transaction on the parent FD
      await tx.fDTransaction.create({
        data: {
          fdId: id,
          transactionType: 'RENEW',
          amount: data.principalAmount,
          notes: `Renewed into FD account ${data.accountNumber} (Receipt: ${data.receiptNumber})`,
          createdAt: new Date(),
        },
      });

      // 3. Create the new child FD
      const childFd = await tx.fD.create({
        data: {
          accountNumber: data.accountNumber,
          receiptNumber: data.receiptNumber,
          holderName: parentFd.holderName, // Holder stays the same
          startDate: data.startDate,
          endDate: data.endDate,
          principalAmount: data.principalAmount,
          withdrawAmount: data.withdrawAmount,
          interestEarned,
          interestRate: data.interestRate,
          status: 'ACTIVE',
          remarks: data.remarks || `Renewed from parent FD ${parentFd.receiptNumber}`,
          parentFdId: id,
          familyId: (session.user as any).familyId,
        },
      });

      // 4. Log CREATE transaction on the child FD
      await tx.fDTransaction.create({
        data: {
          fdId: childFd.id,
          transactionType: 'CREATE',
          amount: data.principalAmount,
          notes: `Created via renewal of parent FD ${parentFd.receiptNumber}`,
          createdAt: new Date(),
        },
      });

      return childFd;
    });

    return NextResponse.json(resultData, { status: 201 });
  } catch (error: any) {
    console.error('Error renewing FD:', error);
    return NextResponse.json({ error: 'Failed to renew FD' }, { status: 500 });
  }
}
