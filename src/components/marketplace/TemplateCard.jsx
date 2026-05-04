import { ArrowRight, Download, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import DownloadActionButton from "../ui/DownloadActionButton";

const formatPrice = (price, isFree) =>
  isFree ? "Free" : `Rs ${Number(price || 0).toLocaleString("en-IN")}`;

export default function TemplateCard({ template }) {
  const image = template.images?.[0] || "/Images/Project_Preview/Project_Preview_1.png";

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/8 bg-[#1B241A] shadow-[0_30px_60px_rgba(0,0,0,0.25)] transition hover:-translate-y-1 hover:border-cyan-primary/20">
      <Link to={`/template/${template.id}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
          <img
            src={image}
            alt={template.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            width="320"
            height="200"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B120C] via-transparent to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/65">
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
          </div>
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-black text-white">{template.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/52">
            {template.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(template.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-white/48"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/template/${template.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/78 transition hover:border-white/18 hover:text-white"
          >
            Explore <ArrowRight size={16} />
          </Link>
          {template.isUnlocked || template.isFree ? (
            <DownloadActionButton
              to={`/template/${template.id}`}
              label="Download"
              className="w-full sm:w-[190px]"
            />
          ) : (
            <Link
              to={`/checkout/${template.id}`}
              className="flex items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-cyan-primary to-teal-primary px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-primary-dark transition hover:-translate-y-0.5 sm:w-[190px]"
            >
              <ShoppingCart size={16} />
              Buy Now
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
