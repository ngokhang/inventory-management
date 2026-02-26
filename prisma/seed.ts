import 'dotenv/config';

import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';
import { Provider, Role } from './generated/enums';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function ensureDefaultAdmin() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  if (existingAdmin) {
    console.log('[seed] ADMIN user already exists, skip default admin bootstrap');
    return;
  }

  const username = process.env.DEFAULT_ADMIN_USERNAME ?? 'admin';
  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@local.dev';
  const password = process.env.DEFAULT_ADMIN_PASSWORD ?? 'Admin@123456';
  const name = process.env.DEFAULT_ADMIN_NAME ?? 'System Administrator';

  const existingAccount = await prisma.account.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    include: { user: true },
  });

  if (existingAccount?.user) {
    await prisma.user.update({
      where: { id: existingAccount.user.id },
      data: { role: Role.ADMIN },
    });

    console.log('[seed] Promoted existing user to ADMIN as default admin');
    return;
  }

  if (existingAccount && !existingAccount.user) {
    await prisma.user.create({
      data: {
        name,
        accountId: existingAccount.id,
        role: Role.ADMIN,
      },
    });

    console.log('[seed] Created default admin user for existing account');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        username,
        email,
        password: hashedPassword,
        provider: Provider.LOCAL,
      },
    });

    await tx.user.create({
      data: {
        name,
        accountId: account.id,
        role: Role.ADMIN,
      },
    });
  });

  console.log(`[seed] Created default admin account: ${email}`);
}

async function main() {
  await ensureDefaultAdmin();
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
