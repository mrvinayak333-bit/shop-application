import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Loading from '../components/Loading';
import DynamicCertificate from '../components/DynamicCertificate';

export default function StudentPrintCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCertificateData() {
      try {
        const res = await api.get(`/certificate/verify/${id}`);
        if (res && (res.success || res.certificate)) {
          setCert(res.certificate);
        } else {
          // Fallback to print endpoint
          const res2 = await api.get(`/certificate/print/${id}`);
          if (res2 && res2.success) {
            setCert(res2.certificate);
          } else {
            throw new Error(res2?.message || 'Certificate data not found');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificateData();
  }, [id]);

  if (loading) return <Loading />;
  if (error || !cert) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-white">
        <div className="bg-slate-950 rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-red-500/40">
          <h2 className="text-2xl font-black text-red-500 mb-2">Certificate Not Found</h2>
          <p className="text-xs text-slate-300 mb-4">{error || 'No certificate record matches this ID.'}</p>
          <button onClick={() => navigate('/')} className="btn-primary py-2.5 px-6 text-xs font-black">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center">
      <DynamicCertificate
        certData={cert}
        scale={0.88}
        showActions={true}
        onPrint={() => window.print()}
        onDownloadPDF={() => window.print()}
      />
    </div>
  );
}
