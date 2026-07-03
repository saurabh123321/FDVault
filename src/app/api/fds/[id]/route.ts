import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  receiptNumber: z.string().min(1, 'Receipt number is required'),
  holderName: z.string().min(1, 'Holder name is required'),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  principalAmount: z.number().positive('Principal amount must be positive'),
  withdrawAmount: z.number().positive('Withdrawal amount must be positive'),
  interestRate: z.number().min(0, 'Interest rate must be non-negative'),
  status: z.enum(['ACTIVE', 'MATURED', 'RENEWED', 'WITHDRAWN']),
  remarks: z.string().optional().nullable(),
});

// GET /api/fds/[id] - Fetch single FD with renewal tree & transaction history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const fd = await prisma.fD.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        parentFd: true,
        childFds: {
          where: { isDeleted: false },
        },
      },
    });

    if (!fd || fd.isDeleted || fd.familyId !== (session.user as any).familyId) {
      return NextResponse.json({ error: 'FD not found' }, { status: 404 });
    }

    return NextResponse.json(fd);
  } catch (error: any) {
    console.error('Error fetching FD details:', error);
    return NextResponse.json({ error: 'Failed to fetch FD details' }, { status: 500 });
  }
}

// PUT /api/fds/[id] - Update FD fields (Admin only)
export async function PUT(
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
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Check if FD exists
    const currentFd = await prisma.fD.findUnique({
      where: { id },
    });

    if (!currentFd || currentFd.isDeleted || currentFd.familyId !== (session.user as any).familyId) {
      return NextResponse.json({ error: 'FD not found' }, { status: 404 });
    }

    // Check for duplicate account + receipt number on other active records
    if (
      data.accountNumber !== currentFd.accountNumber ||
      data.receiptNumber !== currentFd.receiptNumber
    ) {
      const duplicateFd = await prisma.fD.findFirst({
        where: {
          id: { not: id },
          accountNumber: data.accountNumber,
          receiptNumber: data.receiptNumber,
          familyId: (session.user as any).familyId,
          isDeleted: false,
        },
      });

      if (duplicateFd) {
        return NextResponse.json(
          { error: 'An FD with this account number and receipt number combination already exists.' },
          { status: 400 }
        );
      }
    }

    // Recalculate interest earned
    const interestEarned = Number((data.withdrawAmount - data.principalAmount).toFixed(2));

    // Update FD inside a transaction and log update
    const updatedFd = await prisma.$transaction(async (tx) => {
      const fd = await tx.fD.update({
        where: { id },
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
          status: data.status,
          remarks: data.remarks,
        },
      });

      // Log transaction if status has changed
      if (data.status !== currentFd.status) {
        let type: any = 'ADD';
        if (data.status === 'MATURED') type = 'ADD'; // just logged as status change
        else if (data.status === 'RENEWED') type = 'RENEW';
        else if (data.status === 'WITHDRAWN') type = 'WITHDRAW';

        await tx.fDTransaction.create({
          data: {
            fdId: id,
            transactionType: type,
            amount: data.withdrawAmount,
            notes: `Status manually updated from ${currentFd.status} to ${data.status}`,
            createdAt: new Date(),
          },
        });
      } else {
        // Just standard update log
        await tx.fDTransaction.create({
          data: {
            fdId: id,
            transactionType: 'ADD',
            amount: data.principalAmount,
            notes: 'FD details manually updated',
            createdAt: new Date(),
          },
        });
      }

      return fd;
    });

    return NextResponse.json(updatedFd);
  } catch (error: any) {
    console.error('Error updating FD:', error);
    return NextResponse.json({ error: 'Failed to update FD' }, { status: 500 });
  }
}

// DELETE /api/fds/[id] - Soft delete an FD (Admin only)
export async function DELETE(
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
    const currentFd = await prisma.fD.findUnique({
      where: { id },
    });

    if (!currentFd || currentFd.isDeleted || currentFd.familyId !== (session.user as any).familyId) {
      return NextResponse.json({ error: 'FD not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.fD.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true, message: 'FD soft-deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting FD:', error);
    return NextResponse.json({ error: 'Failed to delete FD' }, { status: 500 });
  }
}
