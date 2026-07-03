import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  familyName: z.string().min(2, 'Family name must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { familyName, name, email, password } = result.data;

    // 1. Check if email exists globally
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    // 2. Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 3. Create Family and Admin User within a transaction
    const newAdminUser = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name: familyName },
      });

      const adminUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          familyId: family.id,
        },
      });

      return adminUser;
    });

    return NextResponse.json({ success: true, user: { email: newAdminUser.email, name: newAdminUser.name } }, { status: 201 });
  } catch (error) {
    console.error('Error during signup:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to register account' }, { status: 500 });
  }
}
