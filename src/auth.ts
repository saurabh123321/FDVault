import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          // Query user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });
          
          if (!user) {
            return null;
          }

          // Compare passwords
          const passwordsMatch = bcrypt.compareSync(password, user.password);
          if (passwordsMatch) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              familyId: user.familyId,
            };
          }
        }

        return null;
      },
    }),
  ],
});
