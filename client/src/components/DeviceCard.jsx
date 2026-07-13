import { Smartphone } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function DeviceCard({ repair, link }) {
  return (
    <div className="card hover:shadow-lg transition animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg"><Smartphone className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="font-semibold text-gray-900">{repair.brand} {repair.model}</p>
            <p className="text-xs text-gray-500">{repair.tracking_number}</p>
          </div>
        </div>
        <StatusBadge status={repair.status} />
      </div>
      <div className="mt-3 text-sm text-gray-600">
        <p>Issue: {repair.issue_description}</p>
        {repair.customer_name && <p>Customer: {repair.customer_name}</p>}
      </div>
      {link && <a href={link} className="text-emerald-600 text-sm font-medium mt-2 block hover:underline">View Details &rarr;</a>}
    </div>
  );
}
