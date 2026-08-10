import { useState } from 'react';
import { Printer, X, Shield, Smartphone, FileText, CheckCircle2 } from 'lucide-react';

import BarcodeGenerator from './BarcodeGenerator';

export default function ThermalPrintModal({ record, onClose }) {
  const [paperWidth, setPaperWidth] = useState('80mm'); // '58mm' | '80mm'

  if (!record) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('thermal-print-area');
    if (!printContent) return window.print();

    const win = window.open('', '_blank', 'width=450,height=650');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>POS Thermal Receipt - ${trackingVal}</title>
            <style>
              @page { margin: 0; size: auto; }
              body {
                margin: 0;
                padding: 4mm;
                font-family: 'Courier New', Courier, monospace;
                font-size: ${paperWidth === '58mm' ? '10px' : '12px'};
                color: black;
                background: white;
                width: ${paperWidth === '58mm' ? '58mm' : '80mm'};
                line-height: 1.3;
              }
              .text-center { text-align: center; }
              .font-black { font-weight: 900; }
              .font-bold { font-weight: 700; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 13px; }
              .text-\\[10px\\] { font-size: 10px; }
              .text-\\[9px\\] { font-size: 9px; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-start { align-items: flex-start; }
              .border-b { border-bottom: 1px solid #ccc; }
              .border-t { border-top: 1px solid #ccc; }
              .uppercase { text-transform: uppercase; }
              .my-2 { margin-top: 6px; margin-bottom: 6px; }
              .space-y-1 > * + * { margin-top: 4px; }
              img { max-width: 48px; max-height: 48px; width: auto; height: auto; display: block; margin: 0 auto 4px auto; object-fit: contain; }
              svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      win.document.close();
    } else {
      window.print();
    }
  };

  const formattedDate = record.created_at
    ? new Date(record.created_at).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-IN');

  const formattedExpectedDate = record.expected_delivery_date
    ? new Date(record.expected_delivery_date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      })
    : 'N/A';

  const isAccessoryOrder = record.record_type === 'accessory_order';
  const trackingVal = record.token_number || record.tracking_number;

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-print-area, #thermal-print-area * {
            visibility: visible;
          }
          #thermal-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'} !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: ${paperWidth === '58mm' ? '10px' : '12px'} !important;
            line-height: 1.3 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl no-print">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-white text-base">
              {isAccessoryOrder ? 'Accessory Receipt Print Preview' : 'Thermal Print Preview'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Selector Controls */}
        <div className="flex items-center justify-between bg-gray-950 p-2 rounded-2xl border border-gray-800 text-xs">
          <span className="font-bold text-gray-400 px-2">Printer Paper Width:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition ${paperWidth === '58mm' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              58mm POS
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition ${paperWidth === '80mm' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              80mm POS
            </button>
          </div>
        </div>

        {/* Thermal Print Preview Container */}
        <div className="flex justify-center bg-gray-950 p-4 rounded-2xl border border-gray-800 overflow-x-auto">
          <div
            id="thermal-print-area"
            style={{ width: paperWidth === '58mm' ? '240px' : '320px' }}
            className="bg-white text-black p-4 rounded-lg font-mono shadow-md text-xs leading-relaxed transition-all duration-300 select-text"
          >
            {/* Header Title & Logo */}
            <div className="text-center space-y-1 mb-2">
              <div className="flex justify-center mb-1">
                <img 
                  src="/srm_navbar_logo.png" 
                  alt="SRM Mobaile Fixit" 
                  className="w-12 h-12 object-contain mx-auto border border-emerald-500/30 p-0.5 rounded-lg bg-white" 
                />
              </div>
              <h2 className="font-black text-sm uppercase tracking-wide">SRM Mobaile Fixit</h2>
              <p className="text-[9px] font-semibold text-gray-600">IC Level Repairing Specialist • Solapur</p>
              <p className="text-[9px] font-semibold text-gray-600">Ph: +91 91305 21333</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-800 mt-1">
                {isAccessoryOrder ? 'ACCESSORIES ORDER BILL' : 'REPAIR / CUSTOMER DETAILS'}
              </p>
              <p className="text-[9px] text-gray-600">------------------------------------------</p>
            </div>

            {/* CRISP BARCODE SCANNER SLIP PRINT */}
            <div className="my-2 text-center bg-gray-50 p-1.5 rounded border border-gray-200">
              <BarcodeGenerator
                value={trackingVal}
                width={paperWidth === '58mm' ? 1.4 : 1.8}
                height={paperWidth === '58mm' ? 36 : 45}
                fontSize={10}
              />
            </div>

            <p className="text-[9px] text-gray-600">------------------------------------------</p>

            {/* Customer Details */}
            <div className="space-y-1 my-2">
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">Customer Name:</span>
                <span className="text-right font-black break-words max-w-[170px]">{record.customer_name}</span>
              </div>

              <div className="flex justify-between items-start gap-1">
                <span className="font-bold shrink-0">Phone Number:</span>
                <span className="text-right font-black">{record.phone_number}</span>
              </div>

              {record.alt_phone_number && record.alt_phone_number !== 'N/A' && (
                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Alt Phone:</span>
                  <span className="text-right">{record.alt_phone_number}</span>
                </div>
              )}

              <div className="space-y-0.5 pt-1">
                <span className="font-bold block">Customer Address:</span>
                <p className="text-[11px] font-medium leading-snug whitespace-normal break-words pl-1 border-l-2 border-gray-400">
                  {record.customer_address || 'N/A'}
                </p>
              </div>
            </div>

            <p className="text-[9px] text-gray-600">------------------------------------------</p>

            {/* Device or Accessory Order Details */}
            {isAccessoryOrder ? (
              <div className="space-y-1 my-2">
                <div className="flex justify-between items-start gap-1 border-b border-gray-300 pb-1 font-bold text-[10px]">
                  <span>Item Description</span>
                  <span>Qty x Price</span>
                </div>
                {record.order_items && record.order_items.length > 0 ? (
                  record.order_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-1 py-0.5 text-[11px]">
                      <span className="font-bold break-words max-w-[170px]">{item.name} ({item.brand})</span>
                      <span className="text-right shrink-0">{item.quantity} x ₹{item.price}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold">Items:</span>
                    <span className="text-right font-bold">{record.device_brand} ({record.device_model})</span>
                  </div>
                )}
                <div className="flex justify-between items-start gap-1 pt-1 border-t border-dashed border-gray-300">
                  <span className="font-bold shrink-0">Order Status:</span>
                  <span className="text-right font-extrabold uppercase text-[10px] bg-gray-200 px-1 rounded">
                    {record.repair_status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Est Delivery:</span>
                  <span className="text-right">{formattedExpectedDate}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 my-2">
                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Device Brand:</span>
                  <span className="text-right font-bold">{record.device_brand}</span>
                </div>

                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Device Model:</span>
                  <span className="text-right font-black">{record.device_model}</span>
                </div>

                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">IMEI:</span>
                  <span className="text-right font-mono text-[10px] break-all">{record.imei}</span>
                </div>

                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Repair Status:</span>
                  <span className="text-right font-extrabold uppercase text-[10px] bg-gray-200 px-1 rounded">
                    {record.repair_status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Technician:</span>
                  <span className="text-right font-bold">{record.technician_name}</span>
                </div>

                <div className="flex justify-between items-start gap-1">
                  <span className="font-bold shrink-0">Expected Delivery:</span>
                  <span className="text-right">{formattedExpectedDate}</span>
                </div>
              </div>
            )}

            <p className="text-[9px] text-gray-600">------------------------------------------</p>

            {/* Billing & Balance Details */}
            <div className="space-y-1 my-2">
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold">Total Amount:</span>
                <span className="font-black text-right">₹{record.total_amount}</span>
              </div>

              <div className="flex justify-between items-start gap-1">
                <span className="font-bold">Advance Paid:</span>
                <span className="font-bold text-right text-gray-700">₹{record.paid_amount}</span>
              </div>

              <div className="flex justify-between items-start gap-1 pt-1 border-t border-dashed border-gray-400">
                <span className="font-black text-sm">Balance Due:</span>
                <span className="font-black text-sm text-right text-black">₹{record.remaining_balance}</span>
              </div>

              <div className="flex justify-between items-start gap-1 pt-1 text-[10px]">
                <span className="font-bold">Payment Status:</span>
                <span className="font-black uppercase">{record.payment_status}</span>
              </div>
            </div>

            <p className="text-[9px] text-gray-600">------------------------------------------</p>

            {/* Footer Date & Sign */}
            <div className="text-center text-[9px] space-y-1 mt-2">
              <p>Date: {formattedDate}</p>
              <p className="font-bold">Thank you for choosing SRM Mobaile Fixit!</p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-950/40"
          >
            <Printer className="w-4 h-4" /> Print Thermal Slip ({paperWidth})
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-5 py-3 rounded-2xl transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
