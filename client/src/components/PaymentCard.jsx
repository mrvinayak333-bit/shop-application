import { CreditCard } from 'lucide-react';

export default function PaymentCard({ quotation, onApprove, onReject }) {
  if (!quotation) return null;
  return (
    <div className="card border border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Quotation</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Parts Cost</span><span>₹{quotation.parts_cost}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Labor Cost</span><span>₹{quotation.labor_cost}</span></div>
        <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span className="text-emerald-600">₹{quotation.total_cost}</span></div>
        {quotation.spare_parts && <p className="text-gray-500">Spare Parts: {quotation.spare_parts}</p>}
        {quotation.diagnosis && <p className="text-gray-500">Diagnosis: {quotation.diagnosis}</p>}
      </div>
      {(onApprove || onReject) && (
        <div className="flex gap-3 mt-4">
          {onApprove && <button onClick={() => onApprove(true)} className="btn-primary flex-1">Approve</button>}
          {onReject && <button onClick={() => onReject(false)} className="btn-secondary flex-1">Reject</button>}
        </div>
      )}
    </div>
  );
}
