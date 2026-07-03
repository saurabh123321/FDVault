import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to set a new password',
  path: ['currentPassword'],
});

export async function PUT(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = settingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { name, currentPassword, newPassword } = result.data;

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (newPassword && currentPassword) {
      // Validate current password
      const passwordsMatch = bcrypt.compareSync(currentPassword, user.password);
      if (!passwordsMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      // Hash and set new password
      updateData.password = bcrypt.hashSync(newPassword, 10);
    }

    // Perform update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      }
    });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
