import { useState, useMemo } from "react";
import { Copy, CheckCircle2, QrCode, Info, ExternalLink } from "lucide-react";
import { Card } from "../ui/Primitives";
import AnimatedPaymentButton from "../ui/AnimatedPaymentButton";
import { CONTACT_INFO } from "../../data/siteData";

/**
 * TEMPORARY COMPONENT for QR Payments
 * To be removed once a formal payment gateway is integrated.
 */
const QRPaymentStep = ({ 
  amount, 
  orderId = "NEW_ORDER", 
  onUtrSubmit, 
  isSubmitting = false 
}) => {
  const [utr, setUtr] = useState("");
  const [copied, setCopied] = useState(false);

  const upiId = CONTACT_INFO.upiId || "rynix@okaxis";
  const businessName = "Rynix";
  
  // UPI URI Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
  const upiUri = useMemo(() => {
    const params = new URLSearchParams({
      pa: upiId,
      pn: businessName,
      am: amount.toFixed(2),
      cu: "INR",
      tn: `Order-${orderId}`.slice(0, 50),
    });
    return `upi://pay?${params.toString()}`;
  }, [upiId, amount, orderId]);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-cyan-primary/20 bg-cyan-primary/5 p-6 md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-cyan-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-primary">
            <QrCode size={12} /> Scan to Pay Advance
          </div>
          
          <h3 className="text-xl font-black text-white">
            Pay <span className="text-cyan-primary">₹{amount.toLocaleString()}</span>
          </h3>
          <p className="mt-2 text-sm text-light-gray/60">
            Scan the QR code below using any UPI app (GPay, PhonePe, Paytm, etc.)
          </p>

          <div className="relative mt-8 group">
            <div className="absolute -inset-1 rounded-3xl bg-cyan-primary/20 blur-xl transition-all group-hover:bg-cyan-primary/30" />
            <div className="relative rounded-2xl border-4 border-white bg-white p-3 shadow-2xl">
              <img 
                src={qrImageUrl} 
                alt="UPI QR Code" 
                className="h-48 w-48 md:h-56 md:w-56"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
            <a 
              href={upiUri}
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-light-gray/90 transition-all shadow-lg md:hidden"
            >
              <ExternalLink size={18} /> Pay via UPI App
            </a>
            
            <div className="rounded-xl border border-white/8 bg-black/40 p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono text-light-gray/40">UPI ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white text-xs">{upiId}</span>
                  <button 
                    onClick={handleCopy}
                    className="text-cyan-primary transition-transform active:scale-90"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-accent" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-accent/5 p-4 text-left text-[11px] leading-relaxed text-amber-200/60">
              <Info size={14} className="mt-0.5 shrink-0 text-accent" />
              <p>
                Please ensure you pay the <strong className="text-amber-300 underline">exact amount</strong>. 
                Keep the Transaction/UTR number ready after payment.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <label className="block text-sm font-semibold text-white">
          Enter Transaction ID (UTR Number)
        </label>
        <div className="relative">
          <input 
            type="text"
            placeholder="e.g. 412345678901"
            value={utr}
            onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
            className="w-full rounded-xl border border-white/10 bg-black/35 py-4 pl-5 pr-4 text-base text-white outline-none transition-all placeholder:text-light-gray/20 focus:border-cyan-primary focus:ring-1 focus:ring-cyan-primary/20"
          />
        </div>
        <p className="flex items-center gap-2 text-[10px] font-medium text-light-gray/40 uppercase tracking-wide">
          <CheckCircle2 size={12} /> Your order will be placed instantly after submitting
        </p>

        <div className="flex flex-col gap-3">
          <AnimatedPaymentButton
            className="w-full py-6 text-base"
            disabled={utr.length < 12}
            processing={isSubmitting}
            onClick={() => onUtrSubmit(utr)}
            idleIcon={CheckCircle2}
            idleLabel="Confirm & Place Order"
            processingLabel="Submitting payment..."
          />

          {import.meta.env.DEV ? (
            <button
              type="button"
              onClick={() => onUtrSubmit("TEST_BYPASS")}
              className="text-[10px] font-mono uppercase tracking-widest text-white/10 transition-colors hover:text-cyan-primary/40"
            >
              [ Developer Bypass: Create Test Order ]
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default QRPaymentStep;
