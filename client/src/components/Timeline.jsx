import React from 'react';
import { 
  PackageCheck, Search, FileCheck, FileText, ThumbsUp, 
  Hourglass, Wrench, Cpu, Disc, FlaskConical, ShieldCheck, 
  ClipboardCheck, CheckCircle2, Clock, Sparkles, Check
} from 'lucide-react';

const STAGES = [
  {
    key: 'received_center',
    stepNum: 1,
    title: 'Device Received',
    desc: 'Device physically received at service center & logged into repair system',
    icon: PackageCheck,
    phase: 'Intake & Inspection',
  },
  {
    key: 'under_diagnosis',
    stepNum: 2,
    title: 'Inspection Started',
    desc: 'Senior technician initiated initial diagnostic check & fault testing',
    icon: Search,
    phase: 'Intake & Inspection',
  },
  {
    key: 'inspection_done',
    stepNum: 3,
    title: 'Inspection Completed',
    desc: 'Fault diagnosis complete. Issue details and required fixes verified',
    icon: FileCheck,
    phase: 'Intake & Inspection',
  },
  {
    key: 'quotation_sent',
    stepNum: 4,
    title: 'Quotation Sent',
    desc: 'Cost estimation and part breakdown sent to customer for review',
    icon: FileText,
    phase: 'Estimate & Approval',
  },
  {
    key: 'customer_approved',
    stepNum: 5,
    title: 'Customer Approved',
    desc: 'Customer approved quotation and authorized repair work',
    icon: ThumbsUp,
    phase: 'Estimate & Approval',
  },
  {
    key: 'waiting_parts',
    stepNum: 6,
    title: 'Waiting for Spare Parts',
    desc: 'Original replacement components requested & dispatched from inventory',
    icon: Hourglass,
    phase: 'Repair Execution',
  },
  {
    key: 'repair_started',
    stepNum: 7,
    title: 'Repair Started',
    desc: 'Hardware disassemble and repair execution initiated on ESD workbench',
    icon: Wrench,
    phase: 'Repair Execution',
  },
  {
    key: 'ic_repair',
    stepNum: 8,
    title: 'IC Level Repair',
    desc: 'Micro-soldering, motherboard BGA IC reballing & chip-level repair',
    icon: Cpu,
    phase: 'Repair Execution',
  },
  {
    key: 'software_install',
    stepNum: 9,
    title: 'Software Installation',
    desc: 'OS flashing, firmware update & software calibration in progress',
    icon: Disc,
    phase: 'Repair Execution',
  },
  {
    key: 'testing',
    stepNum: 10,
    title: 'Testing',
    desc: 'Functional testing of display, touch, camera, audio, network & battery',
    icon: FlaskConical,
    phase: 'Quality Assurance',
  },
  {
    key: 'quality_test',
    stepNum: 11,
    title: 'Quality Testing',
    desc: 'Final QC verification & multi-point checklist audit passed',
    icon: ShieldCheck,
    phase: 'Quality Assurance',
  },
  {
    key: 'ready_delivery',
    stepNum: 12,
    title: 'Ready for Delivery',
    desc: 'Device sanitized, packaged and ready for customer pickup / dispatch',
    icon: ClipboardCheck,
    phase: 'Handover & Delivery',
  },
  {
    key: 'delivered',
    stepNum: 13,
    title: 'Delivered',
    desc: 'Device handed over to customer with warranty certificate',
    icon: CheckCircle2,
    phase: 'Handover & Delivery',
  }
];

// Status Alias Mapping
const STATUS_ALIASES = {
  registered: 0,
  pickup_done: 0,
  received_center: 0,
  under_diagnosis: 1,
  inspection_done: 2,
  quotation_sent: 3,
  customer_approved: 4,
  waiting_parts: 5,
  repair_started: 6,
  ic_repair: 7,
  software_install: 8,
  testing: 9,
  quality_test: 10,
  ready_delivery: 11,
  ready_to_deliver: 11,
  admin_approved_delivery: 11,
  handed_to_admin: 11,
  customer_received: 12,
  customer_confirmed: 12,
  payment_done: 12,
  payment_verified: 12,
  successfully_delivered: 12,
  delivered: 12
};

export default function Timeline({ currentStatus = 'received_center', statusLog = [] }) {
  // Determine current stage index
  let currentIdx = STATUS_ALIASES[currentStatus];
  if (currentIdx === undefined) {
    currentIdx = STAGES.findIndex(s => s.key === currentStatus);
    if (currentIdx === -1) currentIdx = 0;
  }

  // Map status timestamps
  const logMap = {};
  if (Array.isArray(statusLog)) {
    statusLog.forEach(log => {
      if (log.status) {
        logMap[log.status] = log.created_at || log.timestamp;
      }
    });
  }

  const activeStage = STAGES[currentIdx] || STAGES[0];
  const progressPercentage = Math.round(((currentIdx + 1) / STAGES.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 🚀 ELEGANT PROGRESS HEADER BOARD */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow backdrop effect */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE TIMELINE
              </span>
              <span className="text-xs text-slate-400 font-mono">Phase: {activeStage.phase}</span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              {activeStage.title}
            </h3>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs text-slate-400 font-medium">Repair Progress</div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 font-mono">
              {progressPercentage}% <span className="text-xs font-normal text-slate-400">({currentIdx + 1}/13 Steps)</span>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="relative w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50 shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1"><PackageCheck className="w-3.5 h-3.5 text-emerald-400" /> Device Intake</span>
          <span className="hidden md:inline flex items-center gap-1"><Wrench className="w-3.5 h-3.5 text-cyan-400" /> Repair & Testing</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Handover</span>
        </div>
      </div>

      {/* 📜 PROFESSIONAL VERTICAL TIMELINE LIST */}
      <div className="relative pl-3 sm:pl-6 space-y-3 before:absolute before:left-7 sm:before:left-10 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;
          const IconComponent = stage.icon;

          // Timestamp logic
          const timeString = logMap[stage.key] 
            ? new Date(logMap[stage.key]).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : null;

          return (
            <div 
              key={stage.key} 
              className={`relative flex items-start gap-4 p-3.5 sm:p-4 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/80 border-2 border-indigo-500 shadow-md ring-4 ring-indigo-500/10' 
                  : isCompleted 
                    ? 'bg-white hover:bg-slate-50/90 border border-slate-200/80 shadow-sm' 
                    : 'bg-slate-50/60 opacity-60 hover:opacity-80 border border-slate-200/40'
              }`}
            >
              {/* NODE ICON BADGE */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-100' 
                    : isActive 
                      ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-200 animate-pulse' 
                      : 'bg-slate-200 text-slate-400 border border-slate-300'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <IconComponent className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                  )}
                </div>
              </div>

              {/* STAGE CONTENT DETAILS */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                      isActive 
                        ? 'bg-indigo-600 text-white' 
                        : isCompleted 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                    }`}>
                      Step {String(stage.stepNum).padStart(2, '0')}
                    </span>
                    <h4 className={`text-sm font-bold tracking-tight ${
                      isActive ? 'text-indigo-950 text-base' : isCompleted ? 'text-slate-900' : 'text-slate-500'
                    }`}>
                      {stage.title}
                    </h4>
                  </div>

                  {/* STATUS BADGE / TIMESTAMP */}
                  <div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-bounce">
                        <Clock className="w-3 h-3" /> Current Status
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {timeString || 'Completed'}
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[11px] font-medium text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <p className={`text-xs mt-1 leading-relaxed ${
                  isActive ? 'text-slate-700 font-medium' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {stage.desc}
                </p>

                {/* Additional timestamp for active state if available */}
                {isActive && timeString && (
                  <div className="mt-2 text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Started at: {timeString}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
