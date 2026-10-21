export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function formatPrice(cents: number, currency = 'USD'): string {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const units: Array<[number, string]> = [[86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [secs, label] of units) if (s >= secs) return `${Math.floor(s / secs)}${label} ago`;
  return 'just now';
}

export const LEVEL_LABEL = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' } as const;

/** Password strength 0-4 for the sign-up indicator. */
export function passwordStrength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return { score, label: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score]! };
}

/** Converts a YouTube/Vimeo watch URL to an embeddable one; returns null for direct files. */
export function embedUrl(url: string): { kind: 'embed' | 'file'; src: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${u.searchParams.get('v')}` };
    if (u.hostname === 'youtu.be') return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed${u.pathname}` };
    if (u.hostname.includes('vimeo.com')) return { kind: 'embed', src: `https://player.vimeo.com/video${u.pathname}` };
  } catch {
    /* invalid URL: fall through to treating it as a direct file URL, the player shows its own error state */
  }
  return { kind: 'file', src: url };
}
