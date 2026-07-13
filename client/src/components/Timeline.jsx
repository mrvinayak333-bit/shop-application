import { CheckCircle, Circle } from 'lucide-react';

const stages = [
  'received_center',
  'under_diagnosis',
  'inspection_done',
  'quotation_sent',
  'customer_approved',
  'waiting_parts',
  'repair_started',
  'ic_repair',
  'software_install',
  'testing',
  'quality_test',
  'ready_delivery',
  'delivered'
];

const labels = {
  received_center: '1. Device Received',
  under_diagnosis: '2. Inspection Started',
  inspection_done: '3. Inspection Completed',
  quotation_sent: '4. Quotation Sent',
  customer_approved: '5. Customer Approved',
  waiting_parts: '6. Waiting for Spare Parts',
  repair_started: '7. Repair Started',
  ic_repair: '8. IC Level Repair',
  software_install: '9. Software Installation',
  testing: '10. Testing',
  quality_test: '11. Quality Testing',
  ready_delivery: '12. Ready for Delivery',
  delivered: '13. Delivered'
};

const icons = {
  received_center: '📦',
  under_diagnosis: '🔍',
  inspection_done: '✅',
  quotation_sent: '📄',
  customer_approved: '👍',
  waiting_parts: '⏳',
  repair_started: '🔧',
  ic_repair: '🔌',
  software_install: '💿',
  testing: '🧪',
  quality_test: '✓',
  ready_delivery: '📋',
  delivered: '🎉'
};

export default function Timeline({ currentStatus, statusLog = [] }) {
  const currentIdx = stages.indexOf(currentStatus);
  const logMap = {};
  statusLog.forEach(s => { logMap[s.status] = s.created_at; });

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
      {stages.map((stage, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={stage} className={`relative mb-4 ${active ? 'timeline-active' : ''}`}>
            <div className="absolute -left-5 top-1">
              {done ? (
                <CheckCircle className={`w-5 h-5 ${active ? 'text-blue-500' : 'text-emerald-500'}`} />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <div className={`flex items-center gap-2`}>
              <span className="text-sm">{icons[stage]}</span>
              <p className={`text-sm font-medium ${done ? (active ? 'text-blue-700' : 'text-emerald-700') : 'text-gray-400'}`}>
                {labels[stage] || stage}
              </p>
            </div>
            {logMap[stage] && (
              <p className="text-xs text-gray-400 ml-6">
                {new Date(logMap[stage]).toLocaleString()}
              </p>
            )}
            {active && (
              <p className="text-xs text-blue-600 ml-6 font-medium mt-1">
                ← Current Status
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
