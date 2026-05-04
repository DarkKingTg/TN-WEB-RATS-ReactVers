import { useEffect, useState } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "../../components/ui/BackButton";
import DeniedActionButton from "../../components/ui/DeniedActionButton";
import DownloadActionButton from "../../components/ui/DownloadActionButton";
import { useTemplates } from "../../hooks/useTemplates";

const formatPrice = (price, isFree) =>
  isFree ? "Free" : `Rs ${Number(price || 0).toLocaleString("en-IN")}`;

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTemplateById, getTemplateDownload, unlockFreeTemplate } = useTemplates();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);

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

  const openDownload = async () => {
    if (!template) return;

    setIsUnlocking(true);
    try {
      if (template.isFree && !template.isUnlocked) {
        await unlockFreeTemplate(template.id);
      }

      const fileUrl = await getTemplateDownload(template.id);
      if (!fileUrl) {
        throw new Error("Download is not available for this template yet.");
      }

      window.open(fileUrl, "_blank", "noopener,noreferrer");
      toast.success("Download unlocked");
    } catch (error) {
      toast.error(error.message || "Could not unlock the download.");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0B120C]" />;
  }

  if (!template) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#0B120C] px-6 text-center text-white">
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

  const images = template.images?.length
    ? template.images
    : ["/Images/Project_Preview/Project_Preview_1.png"];
  const selectedImage = images[selectedImageIndex] || images[0];
  const canDownload = template.isUnlocked || template.isFree;

  return (
    <section className="min-h-screen bg-[#0B120C] px-6 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <BackButton
          to="/templates"
          label="Back to catalog"
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[2.5rem] border border-white/8 bg-[#1B241A]">
              <img
                src={selectedImage}
                alt={template.title}
                className="h-full max-h-[620px] w-full object-cover"
                width="800"
                height="620"
                loading="eager"
              />
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-2xl border transition ${
                      selectedImageIndex === index
                        ? "border-cyan-primary/40"
                        : "border-white/8 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={image} alt={`${template.title} preview ${index + 1}`} className="aspect-[4/3] w-full object-cover" width="200" height="150" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-[2.5rem] border border-white/8 bg-[#1B241A] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/50">
                {template.category || "template"}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${
                  template.isFree
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary"
                }`}
              >
                {formatPrice(template.price, template.isFree)}
              </span>
              {template.isUnlocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300">
                  <CheckCircle2 size={12} />
                  Unlocked
                </span>
              )}
            </div>

            <h1 className="mt-5 text-4xl font-black text-white">{template.title}</h1>
            <p className="mt-4 text-base leading-8 text-white/56">{template.description}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(template.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-sm text-white/48"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-4 rounded-[2rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Access model</span>
                <span>{template.isFree ? "Free download" : "Paid unlock"}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Delivery</span>
                <span>Instant after payment success</span>
              </div>
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Keywords</span>
                <span>{template.keywords?.slice(0, 3).join(", ") || "template"}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {canDownload ? (
                <DownloadActionButton
                  onClick={openDownload}
                  disabled={isUnlocking}
                  label={isUnlocking ? "Opening..." : "Download"}
                  compactOnSmallScreens
                  desktopExpandedFull
                  className="lg:w-full"
                />
              ) : (
                <>
                  <DeniedActionButton label="Download Locked" className="w-full justify-center rounded-[1.35rem] py-4" />
                  <button
                    type="button"
                    onClick={() => navigate(`/checkout/${template.id}`)}
                    className="flex items-center justify-center gap-2 rounded-[1.35rem] border border-cyan-primary/22 bg-gradient-to-r from-cyan-primary to-teal-primary px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-primary-dark shadow-[0_18px_36px_rgba(155,255,87,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_46px_rgba(155,255,87,0.2)]"
                  >
                    <ShoppingCart size={18} />
                    Buy Now
                  </button>
                </>
              )}

              {!canDownload && (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/52">
                  Purchase unlocks the download button. Free templates skip payment and open immediately.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
