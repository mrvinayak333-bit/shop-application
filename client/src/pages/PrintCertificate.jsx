import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Loading from '../components/Loading';

export default function PrintCertificate() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCertificate() {
      try {
        const { data, error: fetchErr } = await supabase
          .from('generated_certificates')
          .select('*, students(name), courses(title)')
          .eq('id', id)
          .single();

        if (fetchErr || !data) {
          throw new Error('Certificate not found');
        }
        setCert(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificate();
  }, [id]);

  useEffect(() => {
    if (cert && !loading) {
      // Trigger print dialog on load
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cert, loading]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
          <h2 className="text-2xl font-black text-red-600 mb-2">Printing Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => window.close()} className="btn-primary py-2 px-6">Close Window</button>
        </div>
      </div>
    );
  }

  const issueDate = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : new Date().toLocaleDateString();

  return (
    <div className="print-body min-h-screen flex items-center justify-center bg-zinc-900 print:bg-white p-4 font-serif">
      <style>{`
        @media print {
          body {
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Floating print instructions in browser view */}
      <div className="no-print absolute top-4 left-4 z-50 flex gap-2">
        <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-lg transition">
          Print Certificate
        </button>
        <button onClick={() => window.close()} className="bg-gray-700 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-lg transition">
          Close
        </button>
      </div>

      {/* Certificate layout */}
      <div className="relative w-[842px] h-[595px] bg-white border-[16px] border-double border-amber-800 rounded-lg p-12 text-center shadow-2xl flex flex-col justify-between overflow-hidden print:shadow-none print:border-[16px]">
        {/* Decorative corner borders */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

        <div>
          {/* Header */}
          <div className="text-amber-800 tracking-[0.2em] font-sans font-bold text-xs uppercase mb-2">Certificate of Completion</div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-wide font-sans mb-1">SHREE RAAM MOBILE</h1>
          <div className="text-slate-500 font-sans text-xs tracking-wider uppercase mb-6">Institute of Mobile Repairing & Technology</div>
          
          <div className="w-32 h-0.5 bg-amber-500 mx-auto mb-6"></div>

          {/* Recipient */}
          <p className="text-sm italic text-gray-500 mb-2">This is to proudly certify that</p>
          <h2 className="text-3xl font-black text-slate-900 border-b border-gray-100 pb-2 inline-block px-12 capitalize mb-3">
            {cert.students?.name || 'Valued Student'}
          </h2>

          {/* Achievement */}
          <p className="text-sm italic text-gray-500 max-w-lg mx-auto mb-2">
            has successfully completed all training curriculum, assessments, and practical exercises for the professional course
          </p>
          <h3 className="text-2xl font-bold text-amber-900 tracking-wide mb-8 capitalize">
            {cert.courses?.title || 'Mobile Repairing Course'}
          </h3>
        </div>

        {/* Footer info (Signatures & Date) */}
        <div className="flex justify-between items-end px-8">
          <div className="text-left font-sans">
            <p className="text-xs text-gray-400 font-bold mb-1">Date of Issue</p>
            <p className="text-sm text-slate-800 font-semibold border-t border-gray-300 pt-1 w-32">{issueDate}</p>
          </div>

          {/* Golden Badge Seal */}
          <div className="relative w-20 h-20 bg-amber-500 rounded-full border-4 border-amber-600 flex items-center justify-center shadow-md select-none print:shadow-none">
            <div className="absolute inset-1.5 border border-dashed border-white rounded-full"></div>
            <div className="text-center font-sans text-white text-[8px] font-black uppercase tracking-wider">
              SRM<br/>SEAL
            </div>
            {/* Ribbon cuts */}
            <div className="absolute -bottom-4 -left-1 w-6 h-10 bg-amber-600 clip-ribbon transform rotate-12 -z-10"></div>
            <div className="absolute -bottom-4 -right-1 w-6 h-10 bg-amber-600 clip-ribbon transform -rotate-12 -z-10"></div>
          </div>

          <div className="text-right font-sans">
            <p className="text-xs text-gray-400 font-bold mb-1">Authorized Signatory</p>
            <p className="text-sm text-slate-800 font-semibold border-t border-gray-300 pt-1 w-32">Shree Raam Mobile</p>
          </div>
        </div>

        {/* Certificate Number */}
        <div className="absolute bottom-4 left-0 right-0 text-[10px] font-sans tracking-widest text-gray-400 uppercase">
          Certificate ID: {cert.certificate_number || `SRM-CERT-${cert.id}`}
        </div>
      </div>
    </div>
  );
}
