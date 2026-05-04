import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import AnimatedPaymentButton from "../../components/ui/AnimatedPaymentButton";
import BackButton from "../../components/ui/BackButton";
import DownloadActionButton from "../../components/ui/DownloadActionButton";
import { useAuth } from "../../context/AuthContext";
import { useTemplates } from "../../hooks/useTemplates";
import { apiRequest } from "../../services/apiClient";
import { getEligibleReferralDiscount } from "../../utils/systemRules";

const formatPrice = (price, isFree) =>
  isFree ? "Free" : `Rs ${Number(price || 0).toLocaleString("en-IN")}`;

export default function Checkout() {
  const { id } = useParams();
  const { userProfile } = useAuth();
  const { getTemplateById, getTemplateDownload, unlockFreeTemplate } = useTemplates();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState("");

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const response = await getTemplateById(id);
        setTemplate(response);
      } catch (error) {
        console.error("Failed to load template:", error);
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [getTemplateById, id]);

  const studentReferralDiscount = getEligibleReferralDiscount(userProfile);
  const discountAmount =
    template && !template.isFree
      ? Math.round(Number(template.price || 0) * (studentReferralDiscount / 100))
      : 0;
  const finalTemplatePrice =
    template && !template.isFree
      ? Math.max(Number(template.price || 0) - discountAmount, 0)
      : Number(template?.price || 0);

  const handleContinue = async () => {
    if (!template) return;

    setProcessing(true);
    try {
      if (template.isUnlocked) {
        const fileUrl = await getTemplateDownload(template.id);
        if (fileUrl) {
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }

      if (template.isFree) {
        await unlockFreeTemplate(template.id);
        const fileUrl = await getTemplateDownload(template.id);
        if (fileUrl) {
          window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
        toast.success("Free template unlocked");
        return;
      }

      const response = await apiRequest("/payment/create-intent", {
        method: "POST",
        authMode: "required",
        body: {
          kind: "template",
          referenceId: template.id,
        },
      });

      setPaymentRequestId(response?.requestId || "");

      if (!response?.paymentSessionId) {
        throw new Error("Payment session could not be created.");
      }

      window.location.href = `https://payments.cashfree.com/checkout?session_id=${response.paymentSessionId}`;
    } catch (error) {
      toast.error(error.message || "Could not start the payment flow.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-primary-dark" />;
  }

  if (!template) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-primary-dark px-6 text-center text-white">
        <div>
          <h1 className="text-3xl font-black">Template not found</h1>
          <BackButton
            to="/templates"
            label="Back to catalog"
            className="mt-4"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-primary-dark px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-5xl">
        <BackButton
          to={`/template/${template.id}`}
          label="Back to template"
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-hidden rounded-[2.5rem] border border-white/8 bg-control-default">
            <img
              src={template.images?.[0] || "/Images/Project_Preview/Project_Preview_1.png"}
              alt={template.title}
              className="h-full max-h-[560px] w-full object-cover"
            />
          </div>

          <aside className="rounded-[2.5rem] border border-white/8 bg-control-default p-8 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Checkout
            </div>
            <h1 className="mt-3 text-3xl font-black text-white">{template.title}</h1>
            <p className="mt-3 text-sm leading-7 text-white/56">{template.description}</p>

            <div className="mt-8 rounded-[2rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Template price</span>
                <span className="text-lg font-black text-cyan-primary">
                  {formatPrice(template.price, template.isFree)}
                </span>
              </div>
              {!template.isFree && (
                <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                  <span>Student referral</span>
                  <span className={studentReferralDiscount ? "font-semibold text-emerald-300" : ""}>
                    {studentReferralDiscount
                      ? `- ${formatPrice(discountAmount, false)}`
                      : "Not applied"}
                  </span>
                </div>
              )}
              {!template.isFree && (
                <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                  <span>Amount to pay</span>
                  <span className="text-lg font-black text-white">
                    {formatPrice(finalTemplatePrice, false)}
                  </span>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                <span>Unlock model</span>
                <span>{template.isFree ? "Instant access" : "Cashfree payment"}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                <ShieldCheck size={16} />
                Download unlocks only after successful payment confirmation.
              </div>
            </div>

            {template.isUnlocked || template.isFree ? (
              <DownloadActionButton
                onClick={handleContinue}
                disabled={processing}
                label={template.isUnlocked ? "Open Download" : "Free Download"}
                compactOnSmallScreens
                desktopExpandedFull
                className="mt-8 lg:w-full"
              />
            ) : (
              <AnimatedPaymentButton
                type="button"
                onClick={handleContinue}
                processing={processing}
                idleIcon={CheckCircle2}
                idleLabel="Continue to Payment"
                processingLabel="Starting payment..."
                className="mt-8 w-full"
              />
            )}

            {!template.isFree && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/48">
                You will be redirected to the existing Cashfree checkout page for QR or UPI payment. After payment success, reopen the template page and the download button will unlock.
                {studentReferralDiscount ? (
                  <span className="mt-2 block text-emerald-300">
                    Student referral discount applied: {studentReferralDiscount}% off.
                  </span>
                ) : null}
              </div>
            )}

            {paymentRequestId && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan-primary/15 bg-cyan-primary/10 px-4 py-3 text-sm text-cyan-primary">
                <ExternalLink size={16} />
                Payment request created: {paymentRequestId}
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
