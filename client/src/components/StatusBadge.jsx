const statusMap = {
  registered: { label: 'Registered', cls: 'bg-blue-100 text-blue-800' },
  pickup_done: { label: 'Pickup Done', cls: 'bg-indigo-100 text-indigo-800' },
  admin_verified: { label: 'Admin Verified', cls: 'bg-purple-100 text-purple-800' },
  received_center: { label: 'Device Received', cls: 'bg-cyan-100 text-cyan-800' },
  under_diagnosis: { label: 'Inspection Started', cls: 'bg-amber-100 text-amber-800' },
  inspection_done: { label: 'Inspection Completed', cls: 'bg-teal-100 text-teal-800' },
  quotation_sent: { label: 'Quotation Sent', cls: 'bg-violet-100 text-violet-800' },
  customer_approved: { label: 'Customer Approved', cls: 'bg-lime-100 text-lime-800' },
  waiting_parts: { label: 'Waiting Parts', cls: 'bg-yellow-100 text-yellow-800' },
  repair_started: { label: 'Repair Started', cls: 'bg-orange-100 text-orange-800' },
  ic_repair: { label: 'IC Level Repair', cls: 'bg-rose-100 text-rose-800' },
  software_install: { label: 'Software Installation', cls: 'bg-fuchsia-100 text-fuchsia-800' },
  testing: { label: 'Testing', cls: 'bg-emerald-100 text-emerald-800' },
  quality_test: { label: 'Quality Testing', cls: 'bg-green-100 text-green-800' },
  ready_delivery: { label: 'Ready for Delivery', cls: 'bg-sky-100 text-sky-800' },
  repair_completed: { label: 'Repair Completed', cls: 'bg-green-100 text-green-800' },
  admin_approved_delivery: { label: 'Admin Approved', cls: 'bg-emerald-100 text-emerald-800' },
  admin_rejected_delivery: { label: 'Admin Rejected', cls: 'bg-red-100 text-red-800' },
  handed_to_admin: { label: 'Handed to Admin', cls: 'bg-indigo-100 text-indigo-800' },
  ready_to_deliver: { label: 'Ready to Deliver', cls: 'bg-teal-100 text-teal-800' },
  out_delivery: { label: 'Out for Delivery', cls: 'bg-blue-100 text-blue-800' },
  customer_received: { label: 'Customer Received', cls: 'bg-purple-100 text-purple-800' },
  customer_confirmed: { label: 'Confirmed Working', cls: 'bg-green-200 text-green-900' },
  customer_issue_reported: { label: 'Issue Reported', cls: 'bg-orange-100 text-orange-800' },
  payment_done: { label: 'Payment Done', cls: 'bg-emerald-100 text-emerald-800' },
  payment_verified: { label: 'Payment Verified', cls: 'bg-green-200 text-green-900' },
  successfully_delivered: { label: 'Delivered', cls: 'bg-emerald-200 text-emerald-900' },
  feedback_given: { label: 'Feedback Given', cls: 'bg-yellow-100 text-yellow-800' },
  delivered: { label: 'Delivered', cls: 'bg-emerald-200 text-emerald-900' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
};

export default function StatusBadge({ status }) {
  const s = statusMap[status] || { label: status, cls: 'bg-gray-100 text-gray-800' };
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}
