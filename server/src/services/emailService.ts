import net from 'node:net';
import tls from 'node:tls';
import { env } from '../config/env.js';

export interface MailInput {
  to: string;
  subject: string;
  text: string;
}

/**
 * Minimal SMTP sender (AUTH LOGIN, implicit TLS on 465 or plain/STARTTLS-less on other ports).
 * Used only when SMTP_HOST is configured. In development without SMTP, the message is
 * written to the server console instead (see README: "Password reset in development").
 */
export async function sendMail(mail: MailInput): Promise<{ delivered: boolean; mode: 'smtp' | 'console' }> {
  if (!env.emailEnabled) {
    if (!env.isTest) {
      console.log(`\n[mail:dev-fallback] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    }
    return { delivered: false, mode: 'console' };
  }
  await smtpSend(mail);
  return { delivered: true, mode: 'smtp' };
}

function smtpSend(mail: MailInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = env.SMTP_PORT ?? 465;
    const host = env.SMTP_HOST as string;
    const socket: net.Socket = port === 465 ? tls.connect(port, host) : net.connect(port, host);
    socket.setTimeout(15000, () => {
      socket.destroy();
      reject(new Error('SMTP timeout'));
    });
    const steps: string[] = [
      'EHLO aurevia',
      ...(env.SMTP_USER
        ? [
            'AUTH LOGIN',
            Buffer.from(env.SMTP_USER).toString('base64'),
            Buffer.from(env.SMTP_PASS ?? '').toString('base64'),
          ]
        : []),
      `MAIL FROM:<${extractAddress(env.EMAIL_FROM)}>`,
      `RCPT TO:<${mail.to}>`,
      'DATA',
      `From: ${env.EMAIL_FROM}\r\nTo: ${mail.to}\r\nSubject: ${mail.subject.replace(/[\r\n]/g, ' ')}\r\n\r\n${mail.text.replace(/\r?\n\./g, '\n..')}\r\n.`,
      'QUIT',
    ];
    let i = -1;
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      if (!/\r?\n$/.test(buffer)) return;
      const lines = buffer.trim().split(/\r?\n/);
      const last = lines[lines.length - 1] ?? '';
      buffer = '';
      if (/^\d{3}-/.test(last)) return; // multi-line reply continues
      const code = Number(last.slice(0, 3));
      if (code >= 400) {
        socket.destroy();
        return reject(new Error(`SMTP error ${code}`));
      }
      i += 1;
      const step = steps[i];
      if (step === undefined) {
        socket.end();
        return resolve();
      }
      socket.write(`${step}\r\n`);
      if (step === 'QUIT') {
        socket.end();
        resolve();
      }
    });
    socket.on('error', reject);
  });
}

function extractAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return m?.[1] ?? from;
}
