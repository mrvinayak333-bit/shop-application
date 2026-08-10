import { forwardRef } from 'react';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

const DynamicCertificate = forwardRef(({ certData, scale = 1, showActions = false, onPrint, onDownloadPDF }, ref) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const {
    certificate_id = 'SRM-CERT-2026-000001',
    student_name = 'Rahul Patil',
    student_code = 'SRM-STU-2026-001',
    course_name = 'Android & iPhone IC-Level Repairing Course',
    course_duration = '25 Days',
    grade = 'A++',
    completion_date = '2026-08-10',
    issue_date = '2026-08-10',
    trainer_name = 'VINAYAK SANJAY KUMBHAR',
    trainer_signature,
    authorized_signatory_name = 'VINAYAK SANJAY KUMBHAR',
    authorized_signatory_signature,
    institute_name = 'SRM MOBAILE FIXIT',
    institute_address = 'Solapur, Maharashtra – 413002',
    certificate_status = 'Issued'
  } = certData || {};

  const formattedIssueDate = issue_date
    ? new Date(issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const formattedCompletionDate = completion_date
    ? new Date(completion_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : formattedIssueDate;

  useEffect(() => {
    const generateQR = async () => {
      try {
        const verifyUrl = `${window.location.origin}/verify-certificate/${certificate_id}`;
        const dataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 100 });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    };
    generateQR();
  }, [certificate_id]);

  return (
    <div className="flex flex-col items-center">
      {showActions && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 w-full max-w-[1123px] mb-4 bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold font-mono">Certificate ID: {certificate_id}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${certificate_status === 'Revoked' ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {certificate_status}
            </span>
          </div>
          <div className="flex gap-2">
            {onPrint && (
              <button onClick={onPrint} className="btn-primary py-2 px-4 text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                🖨️ Print Certificate
              </button>
            )}
            {onDownloadPDF && (
              <button onClick={onDownloadPDF} className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-2 px-4 text-xs rounded-xl transition border border-slate-700">
                📄 Download PDF
              </button>
            )}
          </div>
        </div>
      )}

      {/* A4 Landscape Printable Frame (1123px x 794px @ 96DPI / 297mm x 210mm) */}
      <div
        ref={ref}
        style={{
          width: '1123px',
          height: '794px',
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top center',
          fontFamily: "'Inter', 'Cinzel', 'Georgia', serif"
        }}
        className="relative bg-white text-slate-900 border-[16px] border-emerald-900 rounded-2xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden print:shadow-none print:border-[16px] print:m-0 print:rounded-none select-text"
      >
        {/* Decorative Corner Ornaments */}
        <div className="absolute top-0 left-0 w-24 h-24 border-t-8 border-l-8 border-emerald-600 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-24 border-t-8 border-r-8 border-emerald-600 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 border-b-8 border-l-8 border-emerald-600 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-b-8 border-r-8 border-emerald-600 rounded-br-xl pointer-events-none" />

        {/* Inner Thin Border Ribbon */}
        <div className="absolute inset-3 border-2 border-emerald-500/40 rounded-xl pointer-events-none" />

        {/* Revoked Watermark Stamp if Revoked */}
        {certificate_status === 'Revoked' && (
          <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none bg-red-950/20 backdrop-blur-[1px]">
            <div className="border-8 border-red-600 text-red-600 font-black text-6xl tracking-widest uppercase px-12 py-6 rounded-3xl transform -rotate-12 opacity-90 shadow-2xl bg-white/90">
              REVOKED
            </div>
          </div>
        )}

        {/* TOP HEADER SECTION: LOGO & INSTITUTE TITLE */}
        <div className="relative z-10 text-center pt-2">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src="/srm_navbar_logo.png"
              alt="SRM Logo"
              className="w-16 h-16 object-contain rounded-xl border border-emerald-500/30 p-1 bg-white shadow-sm"
            />
            <div className="text-left">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                {institute_name}
              </h1>
              <p className="text-xs font-extrabold text-emerald-700 tracking-wider uppercase mt-1">
                Mobile Repairing & Technical Training Institute
              </p>
              <p className="text-[10px] text-slate-500 font-medium">{institute_address}</p>
            </div>
          </div>

          <div className="w-64 h-1 bg-gradient-to-r from-transparent via-emerald-600 to-transparent mx-auto my-3" />

          {/* MAIN CERTIFICATE TITLE */}
          <h2 className="text-4xl font-black tracking-widest text-slate-900 uppercase font-serif">
            CERTIFICATE
          </h2>
          <span className="inline-block text-xs font-black tracking-[0.3em] uppercase bg-emerald-100 text-emerald-800 px-6 py-1 rounded-full border border-emerald-300 mt-1 shadow-2xs">
            OF COMPLETION
          </span>
        </div>

        {/* MIDDLE SECTION: STUDENT NAME & COURSE DETAILS */}
        <div className="relative z-10 text-center my-auto py-2 space-y-3">
          <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">PROUDLY PRESENTED TO</p>

          <div className="inline-block relative px-8">
            <h3 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-wide font-serif capitalize border-b-2 border-slate-900 pb-1 px-4">
              {student_name}
            </h3>
            {student_code && (
              <span className="block text-[11px] font-mono font-bold text-emerald-700 mt-1">
                Student ID: {student_code}
              </span>
            )}
          </div>

          <p className="text-xs font-medium text-slate-700 max-w-3xl mx-auto leading-relaxed px-4">
            This is to certify that <strong className="text-slate-900 font-bold">{student_name}</strong> has successfully completed the{' '}
            <strong className="text-emerald-800 font-bold underline decoration-emerald-500">{course_name}</strong> conducted by{' '}
            <strong className="text-slate-900 font-bold">SRM MOBAILE FIXIT</strong>.
          </p>

          <p className="text-[11px] italic text-slate-500 max-w-2xl mx-auto">
            "During the training, the student has demonstrated dedication, discipline, and excellent practical skills in mobile repairing and IC-level diagnosis."
          </p>

          {/* COURSE HIGHLIGHTS BAR */}
          <div className="inline-flex items-center justify-center gap-6 bg-slate-50 border border-slate-200 px-8 py-2 rounded-2xl text-xs font-bold text-slate-800 shadow-2xs">
            <div>
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Course Duration</span>
              <span className="text-emerald-800 font-black">{course_duration}</span>
            </div>
            <div className="w-px h-6 bg-slate-300" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Grade Secured</span>
              <span className="text-emerald-800 font-black">{grade}</span>
            </div>
            <div className="w-px h-6 bg-slate-300" />
            <div>
              <span className="text-[9px] text-slate-400 block uppercase font-bold">Completion Date</span>
              <span className="text-slate-900 font-bold">{formattedCompletionDate}</span>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER SECTION: SIGNATURES, QR CODE & SEAL */}
        <div className="relative z-10 pt-2 grid grid-cols-3 items-end text-center">
          
          {/* LEFT: FOUNDER & TRAINER SIGNATURE */}
          <div className="text-center flex flex-col items-center">
            <div className="h-14 flex items-center justify-center">
              {trainer_signature ? (
                <img src={trainer_signature} alt="Trainer Signature" className="h-12 max-w-[160px] object-contain" />
              ) : (
                <span className="font-serif italic text-lg font-bold text-slate-700 underline decoration-slate-400">
                  {trainer_name}
                </span>
              )}
            </div>
            <div className="w-44 border-t-2 border-slate-900 pt-1 mt-1">
              <h4 className="text-xs font-black text-slate-900 uppercase">{trainer_name}</h4>
              <p className="text-[10px] font-extrabold text-emerald-700 uppercase">FOUNDER & TRAINER</p>
            </div>
          </div>

          {/* CENTER: QR CODE VERIFICATION & EMBLEMIC SEAL */}
          <div className="text-center flex flex-col items-center justify-center">
            <div className="bg-white p-1.5 rounded-xl border border-slate-300 shadow-xs mb-1">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="Verify QR Code" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                  QR CODE
                </div>
              )}
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-600 uppercase">
              Cert No: {certificate_id}
            </span>
            <span className="text-[8px] text-slate-400">Scan QR Code to Verify Authenticity</span>
          </div>

          {/* RIGHT: AUTHORIZED SIGNATORY */}
          <div className="text-center flex flex-col items-center">
            <div className="h-14 flex items-center justify-center">
              {authorized_signatory_signature ? (
                <img src={authorized_signatory_signature} alt="Authorized Signature" className="h-12 max-w-[160px] object-contain" />
              ) : (
                <span className="font-serif italic text-lg font-bold text-slate-700 underline decoration-slate-400">
                  {authorized_signatory_name}
                </span>
              )}
            </div>
            <div className="w-44 border-t-2 border-slate-900 pt-1 mt-1">
              <h4 className="text-xs font-black text-slate-900 uppercase">{authorized_signatory_name}</h4>
              <p className="text-[10px] font-extrabold text-emerald-700 uppercase">AUTHORIZED SIGNATORY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DynamicCertificate.displayName = 'DynamicCertificate';

export default DynamicCertificate;
