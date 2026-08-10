import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeGenerator({
  value,
  width = 1.8,
  height = 45,
  fontSize = 12,
  displayValue = true,
  className = ''
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          fontOptions: 'bold',
          font: 'monospace',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          margin: 4,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [value, width, height, fontSize, displayValue]);

  if (!value) return null;

  return (
    <div className={`inline-block text-center bg-white p-1 rounded border border-gray-300 shadow-2xs ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto mx-auto select-none"></svg>
    </div>
  );
}
