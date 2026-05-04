import { Wallet } from "lucide-react";

const PARTICLES = [
  { top: "18%", left: "16%", size: 4 },
  { top: "22%", left: "36%", size: 5 },
  { top: "24%", left: "68%", size: 4 },
  { top: "34%", left: "84%", size: 5 },
  { top: "52%", left: "18%", size: 4 },
  { top: "56%", left: "44%", size: 6 },
  { top: "48%", left: "70%", size: 4 },
  { top: "74%", left: "24%", size: 5 },
  { top: "78%", left: "56%", size: 4 },
  { top: "72%", left: "82%", size: 5 },
];

function CardGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M20 8H4V6H20M20 18H4V12H20M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4Z" />
    </svg>
  );
}

function PaymentSlipGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M2 17H22V21H2V17M6.25 7H9V6H6V3H18V6H15V7H17.75L19 17H5L6.25 7M9 10H15V8H9V10M9 13H15V11H9V13Z" />
    </svg>
  );
}

function MoneyGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.48 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.49 11.8 10.9Z" />
    </svg>
  );
}

function WalletGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M21 18V19A2 2 0 0 1 19 21H5C3.89 21 3 20.1 3 19V5A2 2 0 0 1 5 3H19A2 2 0 0 1 21 5V6H12C10.89 6 10 6.9 10 8V16A2 2 0 0 0 12 18M12 16H22V8H12M16 13.5A1.5 1.5 0 0 1 14.5 12A1.5 1.5 0 0 1 16 10.5A1.5 1.5 0 0 1 17.5 12A1.5 1.5 0 0 1 16 13.5Z" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" />
    </svg>
  );
}

export default function AnimatedPaymentButton({
  type = "button",
  onClick,
  processing = false,
  disabled = false,
  idleLabel,
  processingLabel = "Processing payment...",
  idleIcon: IdleIcon = Wallet,
  className = "",
}) {
  const isDisabled = disabled || processing;
  const activeLabel = processing ? processingLabel : idleLabel;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={processing}
      data-processing={processing}
      className={`tn-pay-btn relative isolate inline-flex min-h-[68px] items-center justify-center overflow-hidden rounded-[1.55rem] border border-white/12 bg-[#0e151a]/96 px-6 py-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.28)] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-cyan-primary/35 hover:shadow-[0_24px_52px_rgba(155,255,87,0.14)] disabled:cursor-not-allowed disabled:opacity-65 ${className}`}
    >
      {/* Processing fill bar */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-cyan-primary via-teal-primary to-cyan-primary transition-transform duration-500"
        style={{
          transformOrigin: "left",
          transform: processing ? "scaleX(1)" : "scaleX(0)",
        }}
      />

      {/* Shimmer on processing */}
      {processing && (
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_12%,rgba(255,255,255,0.42)_48%,transparent_88%)] animate-[shimmer_1.3s_linear_infinite]" />
      )}

      {/* Particles */}
      {processing && (
        <div className="pointer-events-none absolute inset-0">
          {PARTICLES.map((particle, index) => (
            <span
              key={`${particle.left}-${particle.top}-${index}`}
              className="absolute rounded-full bg-white/70 animate-pulse"
              style={{
                top: particle.top,
                left: particle.left,
                width: particle.size,
                height: particle.size,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-[1px] rounded-[calc(1.55rem-1px)] border border-white/[0.06]" />

      <div className={`relative z-10 flex items-center justify-center gap-3 ${processing ? "text-primary-dark" : "text-white"}`}>
        <span className="tn-pay-icon-stack">
          <span className="tn-pay-icon tn-pay-icon--default">
            {IdleIcon ? <IdleIcon size={18} /> : <WalletGlyph />}
          </span>
          <span className="tn-pay-icon tn-pay-icon--card">
            <CardGlyph />
          </span>
          <span className="tn-pay-icon tn-pay-icon--slip">
            <PaymentSlipGlyph />
          </span>
          <span className="tn-pay-icon tn-pay-icon--money">
            <MoneyGlyph />
          </span>
          <span className="tn-pay-icon tn-pay-icon--check">
            <CheckGlyph />
          </span>
        </span>
        <span className="text-sm font-black uppercase tracking-[0.16em]">{activeLabel}</span>
      </div>
    </button>
  );
}
