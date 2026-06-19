import React, { useState } from 'react';
import { Order, PrinterState } from '../types';
import { generateTextReceipt } from '../utils/printer';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  FileText, 
  Globe, 
  Cpu, 
  AlertTriangle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  printerState: PrinterState;
  usbError: string | null;
  onPrintToUsb: (order: Order) => Promise<boolean>;
  onClose: () => void;
  onConnectPrinter: () => void;
}

export default function ReceiptModal({ 
  order, 
  printerState, 
  usbError, 
  onPrintToUsb, 
  onClose,
  onConnectPrinter
}: ReceiptModalProps) {
  
  const [printSuccess, setPrintSuccess] = useState<boolean | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Generate simulated receipt text for preview on screen
  const simulatedReceiptText = React.useMemo(() => {
    return generateTextReceipt(order, printerState.printWidth, printerState.printerEncoding);
  }, [order, printerState.printWidth, printerState.printerEncoding]);

  const handleSystemPrint = () => {
    window.print();
  };

  const handleDirectUsbPrint = async () => {
    setIsPrinting(true);
    setPrintSuccess(null);
    try {
      const ok = await onPrintToUsb(order);
      setPrintSuccess(ok);
    } catch {
      setPrintSuccess(false);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Container wrapper */}
      <div className="relative w-full max-w-4xl rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
        
        {/* Left Side: Order success info & printer commands */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto border-b md:border-b-0 md:border-r border-stone-200">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-gold-650 tracking-wider uppercase">Order Complete</span>
                <h2 className="text-xl font-display font-bold text-stone-900 tracking-tight">
                  ჩეკი #{order.orderNumber} გაფორმდა
                </h2>
              </div>
            </div>

            {/* Quick Pricing Summary Banner */}
            <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200/80 mb-6 flex items-center justify-between text-left">
              <div>
                <p className="text-[10px] text-stone-400 uppercase font-bold">სულ გადასახდელი / Total Amount</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-mono font-bold text-stone-900">{order.total.toFixed(0)}</span>
                  <span className="text-sm font-bold text-slate-500">₾ GEL</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold leading-none ${
                  order.paymentMethod === 'card' 
                    ? 'bg-sky-50 text-sky-700 border border-sky-100' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {order.paymentMethod === 'card' ? '💳 CARD' : '💵 CASH'}
                </span>
                <p className="text-[10px] text-stone-500 mt-1.5 font-mono font-bold">Table: {order.tableNumber}</p>
              </div>
            </div>

            {/* Hardware Direct USB Printing Section */}
            <div className="space-y-4 mb-6 text-left">
              <div className="rounded-2xl border border-stone-205 bg-[#FAF9F6] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-gold-600" />
                    <span className="text-xs font-bold text-stone-800">USB თერმო პრინტერი</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    printerState.isConnected 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-105'
                      : 'bg-stone-100 text-stone-450 border border-stone-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${printerState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                    {printerState.isConnected ? 'დაკავშირებულია' : 'არ არის დაკავშირებული'}
                  </span>
                </div>

                {printerState.isConnected ? (
                  <div className="flex flex-col gap-2">
                    <div className="rounded-xl bg-white p-3 text-xs text-stone-600 font-mono flex flex-col gap-1 border border-stone-200">
                      <div className="flex justify-between">
                        <span className="text-stone-400">Device:</span>
                        <span className="text-gold-750 tracking-tight text-right shrink truncate ml-2 max-w-[200px] font-bold">{printerState.deviceName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400 font-bold">Encoding:</span>
                        <span>{printerState.printerEncoding === 'translit' ? 'Transliterated (Latin)' : printerState.printerEncoding === 'utf8' ? 'UTF-8' : 'English Only'}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDirectUsbPrint}
                      disabled={isPrinting}
                      className="mt-2 w-full py-3 px-4 rounded-xl font-bold bg-gold-500 hover:bg-gold-650 text-white shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Printer className="h-4 w-4" />
                      {isPrinting ? 'იბეჭდება...' : 'Direct USB Print (პრინტერიდან ბეჭდვა)'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs text-stone-500 leading-relaxed font-medium">
                      You can connect a standard thermal receipt printer (USB ESC/POS) directly to your computer.
                    </p>
                    <button
                      onClick={onConnectPrinter}
                      className="w-full py-2.5 px-4 rounded-xl font-bold border border-gold-400 bg-amber-500/10 hover:bg-amber-500/20 text-gold-700 transition-all text-xs flex items-center justify-center gap-2"
                    >
                      <span>USB პრინტერის დაკავშირება</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Display browser permission helper if WebUSB is blocked in sandboxed iframe */}
                {usbError && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-650 shrink-0 mt-0.5" />
                    <div className="text-xs text-stone-700 space-y-1">
                      <p className="font-bold text-amber-800">პრინტერის შეცდომა / Permission Warning</p>
                      <p className="text-[11px] text-stone-600 leading-relaxed">
                        {usbError}
                      </p>
                      {usbError.includes('SecurityError') && (
                        <p className="text-[10px] text-gold-700 font-bold mt-1">
                          👉 Look for the "Open in raw" / "Open in new tab" icon on the top right corner.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {printSuccess === true && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-250 p-3 text-xs text-emerald-705 font-mono font-bold text-center">
                    ✓ Print command successfully piped to {printerState.deviceName}!
                  </div>
                )}
                {printSuccess === false && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-605 font-mono font-bold text-center">
                    ✗ Printing transfer failed. Please make sure the physical printer is turned on and paper is fed.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSystemPrint}
              className="flex-1 py-3 px-4 rounded-xl font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-all text-xs flex items-center justify-center gap-2 shadow-xs"
            >
              <FileText className="h-4 w-4 text-stone-500" />
              Browser PDF / Print (A4 ან PDF)
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-bold bg-stone-900 hover:bg-stone-850 text-white shadow-xs active:scale-[0.98] transition-all text-xs flex items-center justify-center"
            >
              დასრულება / Close
            </button>
          </div>
        </div>

        {/* Right Side: Virtual Thermal Paper Receipt Render preview */}
        <div className="w-full md:w-[360px] bg-stone-800 p-6 flex flex-col justify-center items-center overflow-y-auto border-t md:border-t-0 md:border-l border-stone-200">
          <div className="w-full text-center mb-3">
            <span className="text-[10px] font-bold text-stone-200 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Globe className="h-3 w-3 text-gold-400 animate-pulse" />
              ჩეკის პრევიუ / Receipt Paper Preview
            </span>
          </div>

          {/* Virtual thermal tape rollup sheet roll */}
          <div className="relative w-full max-w-[290px] bg-white text-stone-900 font-mono text-[10px] p-5 shadow-2xl rounded-sm border-t-8 border-dashed border-stone-300 select-all overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-[#eae7df]/40" />
            <pre className="whitespace-pre-wrap break-all text-left font-mono leading-relaxed text-stone-850 selection:bg-amber-100">
              {simulatedReceiptText}
            </pre>
            <div className="w-full border-t border-dashed border-stone-200 my-4" />
            <div className="text-[8px] text-center text-stone-400 tracking-wider uppercase">
              • Simulated Thermal Tape •
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
