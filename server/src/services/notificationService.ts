import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { sendMail } from './emailService.js';

type Db = Prisma.TransactionClient | typeof prisma;

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  db: Db = prisma,
) {
  return db.notification.create({ data: { userId, type, title, message, link } });
}

/** Sends an email only if the user opted in AND an email provider is configured. Failures are logged, not thrown. */
export async function notifyByEmail(userId: string, subject: string, text: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.emailNotifs) return;
    await sendMail({ to: user.email, subject, text });
  } catch (err) {
    console.error('[mail] failed to send notification email:', err instanceof Error ? err.message : 'unknown');
  }
}
