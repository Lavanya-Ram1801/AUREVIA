import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, SearchX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, Input, Spinner } from '../components/ui';
import { ApiError, get } from '../services/api';
import { formatDate } from '../utils/format';

export default function Verify() {
  const { certificateId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(certificateId ?? '');
  const q = useQuery({ queryKey: ['verify', certificateId], queryFn: () => get<{ certificateId: string; studentName: string; courseTitle: string; issuedAt: string; valid: boolean }>(`/certificates/verify/${encodeURIComponent(certificateId!)}`), enabled: Boolean(certificateId), retry: false });
  return (
    <div className="container-page max-w-xl py-16">
      <h1 className="text-3xl font-extrabold">Verify a certificate</h1>
      <p className="mt-1 text-subtle">Enter the certificate ID printed on the certificate.</p>
      <form className="mt-6 flex gap-3" onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/verify/${encodeURIComponent(code.trim())}`); }}>
        <div className="flex-1"><Input label="Certificate ID" placeholder="AUR-XXXXXXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <Button type="submit" className="mt-[26px]">Verify</Button>
      </form>
      <div className="mt-8" aria-live="polite">
        {q.isLoading && <Spinner label="Checking" />}
        {q.isError && (q.error instanceof ApiError && q.error.status === 404
          ? <div role="alert" className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-5"><SearchX className="h-6 w-6 text-danger" aria-hidden /><p className="font-semibold">No certificate found with that ID.</p></div>
          : <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />)}
        {q.data && (
          <div className="surface p-6"><p className="mb-3 flex items-center gap-2 font-bold text-success"><BadgeCheck className="h-6 w-6" aria-hidden />Valid certificate</p>
            <dl className="space-y-2 text-sm"><div><dt className="text-subtle">Awarded to</dt><dd className="font-bold">{q.data.studentName}</dd></div><div><dt className="text-subtle">Course</dt><dd className="font-bold">{q.data.courseTitle}</dd></div><div><dt className="text-subtle">Issued</dt><dd className="font-bold">{formatDate(q.data.issuedAt)}</dd></div><div><dt className="text-subtle">ID</dt><dd className="font-mono font-bold">{q.data.certificateId}</dd></div></dl></div>
        )}
      </div>
    </div>
  );
}
