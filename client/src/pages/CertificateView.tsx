import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Printer } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button, ErrorState, Spinner } from '../components/ui';
import { Logo } from '../components/visual';
import { ApiError, get } from '../services/api';
import { formatDate } from '../utils/format';

interface Cert { certificateId: string; studentName: string; courseTitle: string; issuedAt: string; valid: boolean }

/** Print-friendly certificate. Use the browser's Print dialog → "Save as PDF" to export. */
export default function CertificateView() {
  const { certificateId } = useParams();
  const reduce = useReducedMotion();
  const q = useQuery({ queryKey: ['certificate', certificateId], queryFn: () => get<Cert>(`/certificates/verify/${encodeURIComponent(certificateId!)}`), enabled: Boolean(certificateId), retry: false });

  if (q.isLoading) return <Spinner label="Loading certificate" />;
  if (q.isError || !q.data) {
    const missing = q.error instanceof ApiError && q.error.status === 404;
    return <div className="container-page max-w-xl py-16"><ErrorState message={missing ? 'We could not find a certificate with that ID.' : (q.error as Error | null)?.message} onRetry={missing ? undefined : () => void q.refetch()} /><p className="mt-4 text-center"><Link className="font-semibold text-violet" to="/verify">Verify a certificate ID</Link></p></div>;
  }
  const c = q.data;
  const verifyUrl = `${window.location.origin}/verify/${c.certificateId}`;
  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between gap-3">
        <Link to="/certificates" className="text-sm font-semibold text-violet">← Back to certificates</Link>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print / Save as PDF</Button>
      </div>
      <motion.article initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6 }}
        aria-label={`Certificate of completion for ${c.studentName}`} className="mx-auto max-w-4xl rounded-3xl border-[6px] border-gold bg-white p-3 text-midnight shadow-card print:max-w-none print:rounded-none print:shadow-none">
        <div className="rounded-2xl border border-gold/60 px-6 py-12 text-center sm:px-16">
          <div className="flex justify-center"><Logo /></div>
          <Award className="mx-auto mt-6 h-12 w-12 text-gold" aria-hidden />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-violet">Certificate of completion</p>
          <p className="mt-8 text-sm text-[#55556f]">This certifies that</p>
          <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{c.studentName}</h1>
          <p className="mt-6 text-sm text-[#55556f]">has successfully completed every lesson of</p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold">{c.courseTitle}</h2>
          <div className="mt-10 grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="text-[#55556f]">Date of completion</p><p className="font-bold">{formatDate(c.issuedAt)}</p></div>
            <div><p className="text-[#55556f]">Certificate ID</p><p className="font-mono font-bold">{c.certificateId}</p></div>
          </div>
          <p className="mt-8 break-all text-xs text-[#55556f]">Verify authenticity at {verifyUrl}</p>
          <p className="mt-1 text-xs italic text-[#55556f]">Learn. Evolve. Excel.</p>
        </div>
      </motion.article>
    </div>
  );
}
