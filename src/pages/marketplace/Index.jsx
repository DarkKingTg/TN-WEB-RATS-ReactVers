import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import MarketplaceLayout from "../../components/marketplace/MarketplaceLayout";
import TemplateCard from "../../components/marketplace/TemplateCard";
import { useTemplates } from "../../hooks/useTemplates";

export default function Index() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [filters, setFilters] = useState({
    search: initialQuery,
    categories: [],
    tag: "",
    price: "all",
    sort: "popular",
  });

  const { templates, loading, error, fetchTemplates } = useTemplates();

  useEffect(() => {
    fetchTemplates(filters);
  }, [filters, fetchTemplates]);

  const resultsLabel = useMemo(() => {
    if (loading) return "Syncing catalog";
    return `${templates.length} templates`;
  }, [loading, templates.length]);

  return (
    <MarketplaceLayout filters={filters} setFilters={setFilters}>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(var(--rgb-accent),0.18),transparent_35%),linear-gradient(180deg,rgba(var(--rgb-primary-dark),0.98),rgba(var(--rgb-control-default),0.98))] p-8 shadow-[0_40px_90px_rgba(0,0,0,0.32)]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-primary/20 bg-cyan-primary/10 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-primary">
              <Sparkles size={12} />
              Template Marketplace
            </div>
            <h1 className="mt-5 text-4xl font-black text-white md:text-5xl">
              Ready-to-sell assets built in the Rynix style.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/56">
              Search by keyword, filter by category, preview the pack, then buy once and unlock the download permanently.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/26">
              Catalog Status
            </div>
            <div className="mt-1 text-2xl font-black text-white">{resultsLabel}</div>
          </div>
          <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-white/48">
            Search matches keywords, tags, and template titles.
          </div>
        </div>

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[360px] animate-pulse rounded-[2rem] border border-white/6 bg-white/[0.03]"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-[2rem] border border-red-500/20 bg-red-500/10 px-6 py-5 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && templates.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="rounded-[2rem] border border-white/8 bg-control-default px-8 py-16 text-center">
            <div className="text-2xl font-black text-white">No templates matched</div>
            <p className="mt-3 text-sm text-white/48">
              Try a broader keyword or remove one of the filters from the sidebar.
            </p>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}
