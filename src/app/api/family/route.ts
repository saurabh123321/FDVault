import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

const newUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'VIEWER']).default('VIEWER'),
});

// GET /api/family - Fetch all members of the current user's family
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const familyId = (session.user as any).familyId;
    
    // Fetch users for this family
    const users = await prisma.user.findMany({
      where: { familyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    
    // Fetch family details
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      select: { name: true },
    });

    return NextResponse.json({ familyName: family?.name || 'Your Family', members: users });
  } catch (error) {
    console.error('Error fetching family members:', error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

// POST /api/family - Add a new family member
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only Admins can add new family members
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = newUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { name, email, password, role } = result.data;
    const familyId = (session.user as any).familyId;

    // Check if user with email already exists globally (email is @unique)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists.' },
        { status: 400 }
      );
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        familyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error adding family member:', error);
    return NextResponse.json({ error: 'Failed to add family member' }, { status: 500 });
  }
}
