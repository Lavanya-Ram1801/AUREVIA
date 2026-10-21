/**
 * Secure admin provisioning (there is no public admin sign-up).
 * Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run admin:create
 * Credentials come from environment variables only; nothing is hardcoded.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) in the environment or .env first.');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    create: { email: env.ADMIN_EMAIL.toLowerCase(), name: env.ADMIN_NAME ?? 'Platform Admin', passwordHash, role: 'ADMIN' },
    update: { passwordHash, role: 'ADMIN', isActive: true, tokenVersion: { increment: 1 } },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
