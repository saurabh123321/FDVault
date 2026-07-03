import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const withdrawSchema = z.object({
  withdrawAmount: z.number().positive('Withdrawal amount must be positive'),
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

  const { id } = await params;

  try {
    const body = await request.json();
    const result = withdrawSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { withdrawAmount, remarks } = result.data;

    // Check if FD exists
    const fd = await prisma.fD.findUnique({
      where: { id },
    });

    if (!fd || fd.isDeleted) {
      return NextResponse.json({ error: 'FD not found' }, { status: 404 });
    }

    if (fd.status === 'WITHDRAWN' || fd.status === 'RENEWED') {
      return NextResponse.json(
        { error: `Cannot withdraw an FD that is already ${fd.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Calculate interest earned based on the actual withdrawal amount
    const interestEarned = Number((withdrawAmount - fd.principalAmount).toFixed(2));

    const updatedFd = await prisma.$transaction(async (tx) => {
      // 1. Update FD status and actual withdrawal amount
      const updated = await tx.fD.update({
        where: { id },
        data: {
          status: 'WITHDRAWN',
          withdrawAmount: withdrawAmount,
          interestEarned: interestEarned,
          remarks: `${fd.remarks || ''}\nWithdrawn on ${new Date().toLocaleDateString()}: Actual received: ${withdrawAmount}. ${remarks || ''}`.trim(),
        },
      });

      // 2. Log withdrawal transaction
      await tx.fDTransaction.create({
        data: {
          fdId: id,
          transactionType: 'WITHDRAW',
          amount: withdrawAmount,
          notes: `Withdrawn from account. Actual amount received: ${withdrawAmount}. Notes: ${remarks || 'None'}`,
          createdAt: new Date(),
        },
      });

      return updated;
    });

    return NextResponse.json(updatedFd);
  } catch (error: any) {
    console.error('Error withdrawing FD:', error);
    return NextResponse.json({ error: 'Failed to withdraw FD' }, { status: 500 });
  }
}
