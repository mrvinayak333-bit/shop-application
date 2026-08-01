import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Loading from '../components/Loading';

export default function StudentPrintCertificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [template, setTemplate] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCertificateData() {
      try {
        const res = await api.get(`/certificate/print/${id}`);
        if (res && res.success) {
          setCert(res.certificate);
          setTemplate(res.template);
          setQrCodeDataUrl(res.qrCodeDataUrl || '');
        } else {
          throw new Error(res?.message || 'Certificate data not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCertificateData();
  }, [id]);

  // Render certificate preview without forcing instant print dialog
  useEffect(() => {
    // Certificate preview ready
  }, [cert, loading]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-red-100">
          <h2 className="text-2xl font-black text-red-600 mb-2">Printing Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => window.close()} className="btn-primary py-2 px-6">Close Window</button>
        </div>
      </div>
    );
  }

  const issueDate = cert.issue_date 
    ? new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : new Date().toLocaleDateString();

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
        .clip-ribbon {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
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

      {/* Certificate container with optional background template */}
      <div 
        className="relative w-[842px] h-[595px] bg-white border-[16px] border-double border-amber-800 rounded-lg p-12 text-center shadow-2xl flex flex-col justify-between overflow-hidden print:shadow-none print:border-[16px]"
        style={template?.template_file ? {
          backgroundImage: `url(${template.template_file})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderColor: 'transparent',
          borderWidth: 0
        } : {}}
      >
        {/* Decorative corner borders (only shown when no template) */}
        {!template?.template_file && (
          <>
            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>
          </>
        )}

        <div>
          {/* Header */}
          <div className="flex items-center justify-center gap-4 mb-2">
            {template?.institute_logo ? (
              <img src={template.institute_logo} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="text-amber-800 tracking-[0.2em] font-sans font-bold text-xs uppercase">Certificate of Completion</div>
            )}
          </div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-wide font-sans mb-1">SHREE RAAM MOBILE</h1>
          <div className="text-slate-500 font-sans text-xs tracking-wider uppercase mb-6">Institute of Mobile Repairing & Technology</div>
          
          <div className="w-32 h-0.5 bg-amber-500 mx-auto mb-6"></div>

          {/* Recipient */}
          <p className="text-sm italic text-gray-500 mb-2">This is to proudly certify that</p>
          <h2 className="text-3xl font-black text-slate-900 border-b border-gray-100 pb-2 inline-block px-12 capitalize mb-3 font-sans">
            {cert.student_name || 'Valued Student'}
          </h2>

          {/* Achievement */}
          <p className="text-sm italic text-gray-500 max-w-lg mx-auto mb-2">
            has successfully completed all training curriculum, assessments, and practical exercises for the professional course
          </p>
          <h3 className="text-2xl font-bold text-amber-900 tracking-wide mb-6 capitalize font-sans">
            {cert.course_name || 'Mobile Repairing Course'}
          </h3>
        </div>

        {/* Footer info (Signatures & Date & QR code) */}
        <div className="flex justify-between items-end px-8 mb-4">
          <div className="text-left font-sans flex flex-col items-center">
            <p className="text-xs text-gray-400 font-bold mb-1">Date of Issue</p>
            <p className="text-sm text-slate-800 font-semibold border-t border-gray-300 pt-1 w-32 text-center">{issueDate}</p>
          </div>

          {/* Golden Badge Seal or QR Code */}
          <div className="flex items-center gap-6">
            {/* Ribbon Seal Badge */}
            <div className="relative w-16 h-16 bg-amber-500 rounded-full border-4 border-amber-600 flex items-center justify-center shadow-md select-none print:shadow-none">
              <div className="absolute inset-1 border border-dashed border-white rounded-full"></div>
              <div className="text-center font-sans text-white text-[7px] font-black uppercase tracking-wider">
                SRM<br/>SEAL
              </div>
              <div className="absolute -bottom-3 -left-1 w-5 h-8 bg-amber-600 clip-ribbon transform rotate-12 -z-10"></div>
              <div className="absolute -bottom-3 -right-1 w-5 h-8 bg-amber-600 clip-ribbon transform -rotate-12 -z-10"></div>
            </div>
            
            {/* Dynamic QR Code */}
            {qrCodeDataUrl && (
              <div className="bg-white p-1 border rounded shadow-sm flex flex-col items-center">
                <img src={qrCodeDataUrl} alt="Verification QR" className="w-16 h-16" />
                <span className="text-[6px] text-gray-400 font-sans mt-0.5 font-bold uppercase tracking-wider">Verify QR</span>
              </div>
            )}
          </div>

          <div className="text-right font-sans flex flex-col items-center">
            <p className="text-xs text-gray-400 font-bold mb-1">Authorized Signatory</p>
            <div className="h-10 flex items-end justify-center mb-1">
              {template?.institute_signature ? (
                <img src={template.institute_signature} alt="Signature" className="h-8 object-contain" />
              ) : (
                <span className="italic text-xs text-gray-400">Shree Raam Mobile</span>
              )}
            </div>
            <p className="text-sm text-slate-800 font-semibold border-t border-gray-300 pt-1 w-36 text-center">Director Signatory</p>
          </div>
        </div>

        {/* Certificate Number */}
        <div className="absolute bottom-4 left-0 right-0 text-[10px] font-sans tracking-widest text-gray-400 uppercase">
          Certificate ID: {cert.certificate_number}
        </div>
      </div>
    </div>
  );
}
