import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle, Home, ShoppingBag, Sparkles, ArrowRight, Receipt } from "lucide-react";

export default function PaymentSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      navigate("/marketplace");
    }
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Main Card */}
        <div className="rounded-[30px] border border-white/10 bg-control-default p-8 shadow-2xl">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-secondary-dark/10 border border-accent/30">
            <CheckCircle className="h-12 w-12 text-accent" strokeWidth={1.5} />
          </div>

          {/* Sparkles */}
          <div className="flex justify-center gap-2 mb-4">
            {[...Array(3)].map((_, i) => (
              <Sparkles key={i} className="h-4 w-4 text-cyan-primary animate-pulse" />
            ))}
          </div>

          {/* Title */}
          <h1 className="mb-2 text-center text-3xl font-black text-white tracking-tight">
            Payment Successful!
          </h1>
          
          <p className="mb-8 text-center text-sm text-white/50">
            Thank you for your purchase. Your order has been confirmed and is being processed.
          </p>

          {/* Order Details Card */}
          {orderId && (
            <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-primary/10">
                  <Receipt className="h-5 w-5 text-cyan-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/30">Order ID</p>
                  <p className="font-mono text-sm font-medium text-white">{orderId}</p>
                </div>
              </div>
              
              <div className="h-px bg-white/10 mb-4" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Status</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent border border-accent/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  Confirmed
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              to="/my-orders"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-primary px-6 py-4 text-sm font-black uppercase tracking-[0.1em] text-primary-dark transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-primary/20"
            >
              <ShoppingBag className="h-5 w-5" />
              View My Orders
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <Link
              to="/marketplace"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-transparent px-6 py-4 text-sm font-medium text-white transition-all hover:bg-white/5"
            >
              <Home className="h-5 w-5" />
              Continue Shopping
            </Link>
          </div>

          {/* Auto-redirect notice */}
          <p className="mt-6 text-center text-xs text-white/30">
            Redirecting to marketplace in{" "}
            <span className="text-cyan-primary font-mono">{countdown}s</span>
          </p>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-center text-xs text-white/30">
          Need help?{" "}
          <Link to="/contact" className="text-cyan-primary hover:underline">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}
