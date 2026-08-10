import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, AlertTriangle, Search, Award, CheckCircle2, User, BookOpen, Calendar, ArrowLeft, Building, Smartphone } from 'lucide-react';
import api from '../lib/api';

export default function PublicCertificateVerification() {
  const { id } = useParams();
  const [searchId, setSearchId] = useState(id || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fetchVerification = async (certId) => {
    if (!certId || !certId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/certificate/verify/${encodeURIComponent(certId.trim())}`);
      setResult(res);
    } catch (err) {
      console.error('Verification query error:', err);
      setResult({
        success: false,
        status: 'INVALID',
        message: 'Unable to connect to verification database'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      setSearchId(id);
      fetchVerification(id);
    }
  }, [id]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      fetchVerification(searchId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-emerald-500 selection:text-white">
      {/* HEADER */}
      <header className="bg-slate-950 border-b border-slate-800 py-4 px-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/srm_navbar_logo.png" alt="SRM Logo" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 border border-emerald-500/40" />
            <div>
              <h1 className="text-base font-black text-white leading-none">SRM MOBAILE FIXIT</h1>
              <span className="text-[9px] font-extrabold text-emerald-400 tracking-wider uppercase mt-0.5 block">
                Official Digital Certificate Verification System
              </span>
            </div>
          </Link>
          <Link to="/" className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto py-12 px-4 space-y-8">
        
        {/* SEARCH BAR */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            100% SECURE OFFICIAL VERIFICATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Verify Student Certificate</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Enter Certificate ID or Verification Code to verify student credentials issued by SRM MOBAILE FIXIT.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 shadow-xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="e.g. SRM-CERT-2026-000001"
                className="w-full bg-slate-900 text-white placeholder-slate-500 pl-11 pr-4 py-3 rounded-xl border border-slate-800 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3 px-6 text-xs font-extrabold flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950/40"
            >
              {loading ? 'Verifying...' : 'Verify Now'}
            </button>
          </form>
        </div>

        {/* RESULTS CARD */}
        {loading && (
          <div className="text-center py-12 bg-slate-950 rounded-3xl border border-slate-800">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400">Checking SRM Certificate Database...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            
            {/* STATUS BANNER */}
            {result.status === 'VALID' && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-2 shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/40 shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <span className="text-xs font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  OFFICIAL & VALID CERTIFICATE
                </span>
                <h3 className="text-2xl font-black text-white">Certificate Authenticated</h3>
                <p className="text-xs text-slate-300">
                  This document is officially registered and issued by <strong className="text-emerald-300">SRM MOBAILE FIXIT</strong>.
                </p>
              </div>
            )}

            {result.status === 'REVOKED' && (
              <div className="bg-red-950/40 border border-red-500/40 rounded-3xl p-6 text-center space-y-2 shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-2 border border-red-500/40 shadow-inner">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <span className="text-xs font-black tracking-widest text-red-400 uppercase bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                  CERTIFICATE REVOKED
                </span>
                <h3 className="text-2xl font-black text-white">Certificate Invalid / Cancelled</h3>
                <p className="text-xs text-slate-300">
                  This certificate ({searchId}) was officially revoked by SRM MOBAILE FIXIT management.
                </p>
              </div>
            )}

            {(result.status === 'INVALID' || (!result.success && result.status !== 'REVOKED')) && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-6 text-center space-y-2 shadow-2xl backdrop-blur-md">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/40 shadow-inner">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <span className="text-xs font-black tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  NOT FOUND / INVALID CERTIFICATE
                </span>
                <h3 className="text-2xl font-black text-white">Invalid Certificate Record</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  No certificate record exists matching ID "{searchId}". Please check the ID and try again.
                </p>
              </div>
            )}

            {/* DETAILS GRID */}
            {result.certificate && (
              <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h4 className="text-base font-extrabold text-white">Certificate Information</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {result.certificate.certificate_id}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-black uppercase ${result.certificate.certificate_status === 'Revoked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                    Status: {result.certificate.certificate_status}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Student Name
                    </span>
                    <p className="text-base font-black text-white">{result.certificate.student_name}</p>
                    {result.certificate.student_code && (
                      <p className="text-[11px] font-mono text-emerald-400">ID: {result.certificate.student_code}</p>
                    )}
                  </div>

                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Course Name
                    </span>
                    <p className="text-sm font-extrabold text-white">{result.certificate.course_name}</p>
                    <p className="text-[11px] text-slate-400">Duration: {result.certificate.course_duration} | Grade: {result.certificate.grade}</p>
                  </div>

                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Issue & Completion Dates
                    </span>
                    <p className="text-xs font-bold text-white">Issued: {new Date(result.certificate.issue_date).toLocaleDateString('en-IN')}</p>
                    {result.certificate.completion_date && (
                      <p className="text-[11px] text-slate-400">Completed: {new Date(result.certificate.completion_date).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>

                  <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-extrabold block flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-emerald-400" /> Issuer & Signatories
                    </span>
                    <p className="text-xs font-bold text-white">SRM MOBAILE FIXIT</p>
                    <p className="text-[11px] text-slate-300">Trainer: {result.certificate.trainer_name}</p>
                    <p className="text-[11px] text-slate-300">Authorized: {result.certificate.authorized_signatory_name}</p>
                  </div>
                </div>

                <div className="text-center pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                  Institute Address: Solapur, Maharashtra – 413002
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
