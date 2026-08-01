import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Loader, Smartphone, Award } from 'lucide-react';
import api from '../lib/api';

export default function VerifyCertificate() {
  const { certNumber } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      try {
        const res = await api.get(`/certificate/verify/${certNumber}`);
        if (res && res.success) {
          setCert(res.certificate);
        } else {
          setError(res?.message || 'Certificate verification failed');
        }
      } catch (err) {
        setError('Connection error or invalid certificate identifier');
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [certNumber]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 shadow-sm flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-emerald-600" />
          <span className="text-sm font-bold text-gray-900">SHREE RAAM MOBILE</span>
        </Link>
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Verification Service</span>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-12 flex items-center justify-center">
        {loading ? (
          <div className="text-center">
            <Loader className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
            <p className="text-gray-500 text-sm font-medium">Contacting verification ledger...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center w-full max-w-md animate-slideIn">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-red-600 mb-2">Invalid Certificate</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              We could not verify the certificate identifier: <strong className="text-gray-900 block mt-1">{certNumber}</strong>
            </p>
            <div className="text-xs text-gray-400 border-t border-gray-100 pt-4 leading-normal">
              This certificate may not have been issued by Shree Raam Mobile, or it may be awaiting approval.
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 text-center w-full max-w-md animate-slideIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 animate-bounce" />
            </div>
            
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              Verified Authenticity
            </span>
            
            <h2 className="text-2xl font-black text-slate-800 mb-4">Verification Successful</h2>
            
            <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-100 space-y-3 mb-6">
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase block">Certified Student</span>
                <span className="text-sm font-bold text-gray-800 capitalize block">{cert.student_name}</span>
              </div>
              
              <div>
                <span className="text-[9px] font-bold text-gray-400 uppercase block">Completed Training Course</span>
                <span className="text-sm font-bold text-gray-800 capitalize block">{cert.course_name}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Issue Date</span>
                  <span className="text-xs font-bold text-gray-800 block">
                    {new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block font-sans">Certificate Number</span>
                  <span className="text-xs font-bold text-gray-800 block font-mono">{cert.certificate_number}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Award className="w-4 h-4 text-amber-500" /> Shree Raam Mobile Certified Graduate.
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 bg-white border-t border-gray-100 text-center text-xs text-gray-400 flex-shrink-0">
        &copy; {new Date().getFullYear()} SHREE RAAM MOBILE. All rights reserved.
      </footer>
    </div>
  );
}
