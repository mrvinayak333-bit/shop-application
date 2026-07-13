import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, User, Phone, Package, AlertCircle, Camera, Navigation } from 'lucide-react';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import Timeline from '../components/Timeline';
import StatusBadge from '../components/StatusBadge';
import Loading from '../components/Loading';

export default function TrackingPage() {
  const { trackingNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/repair/track/' + trackingNumber).then(res => {
      if (res.success) setData(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [trackingNumber]);

  if (loading) return <div className="min-h-screen"><Navbar /><Loading text="Tracking repair..." /></div>;
  if (!data) return <div className="min-h-screen"><Navbar /><p className="text-center py-20 text-gray-500">Repair not found</p></div>;

  const { repair, statusLog } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-emerald-600 hover:underline mb-6 text-sm"><ArrowLeft className="w-4 h-4" /> Back</Link>
        
        {/* Main Device Info */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{repair.brand} {repair.model}</h1>
              <p className="text-sm text-gray-500 font-mono">{repair.tracking_number}</p>
            </div>
            <StatusBadge status={repair.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Device:</span> <span className="font-medium">{repair.device_type}</span></div>
            <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{repair.customer}</span></div>
            <div><span className="text-gray-500">Mobile:</span> <span className="font-medium">{repair.customer_mobile || 'N/A'}</span></div>
            <div><span className="text-gray-500">Registered:</span> <span className="font-medium">{new Date(repair.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>

        {/* Live Tracking Data */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" /> Live Tracking Data
          </h2>
          <div className="space-y-4">
            {/* Device Condition */}
            {repair.device_condition && (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">Device Condition</p>
                  <p className="font-semibold text-amber-900">{repair.device_condition}</p>
                </div>
              </div>
            )}

            {/* GPS Location */}
            {repair.gps_location && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium">GPS Location</p>
                  <p className="font-semibold text-blue-900">{repair.gps_location}</p>
                  {repair.gps_lat && repair.gps_lng && (
                    <a 
                      href={`https://www.google.com/maps?q=${repair.gps_lat},${repair.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View on Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Details */}
            {repair.pickup_by && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Package className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Pickup Details</p>
                  <p className="font-semibold text-green-900">Picked up by: {repair.pickup_by}</p>
                  {repair.pickup_date && (
                    <p className="text-sm text-green-700">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(repair.pickup_date).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Problem Notes */}
            {repair.notes && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 font-medium">Problem Notes</p>
                  <p className="text-sm text-gray-900">{repair.notes}</p>
                </div>
              </div>
            )}

            {/* Photos */}
            <div className="grid grid-cols-2 gap-4">
              {repair.submission_photo && (
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-2 flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Device Photo
                  </p>
                  <img 
                    src={repair.submission_photo} 
                    alt="Device" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              {repair.customer_selfie && (
                <div>
                  <p className="text-xs text-gray-600 font-medium mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> Customer Selfie
                  </p>
                  <img 
                    src={repair.customer_selfie} 
                    alt="Customer" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repair Timeline */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Repair Timeline</h2>
          <Timeline currentStatus={repair.status} statusLog={statusLog} />
        </div>
      </main>
    </div>
  );
}
