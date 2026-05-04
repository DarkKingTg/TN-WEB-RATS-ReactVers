import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card, SectionHeading } from "../../components/ui/Primitives";
import { ScrollReveal, StaggerContainer, StaggerItem, GradientText } from "../../components/ui/ScrollReveal";
import {
  FEATURED_PROJECTS,
  PORTFOLIO_GALLERY,
} from "../../data/siteData";

const Projects = () => {
  const [previewIndex, setPreviewIndex] = useState(null);
  const previewItem =
    previewIndex === null ? null : PORTFOLIO_GALLERY[previewIndex] ?? null;

  const closePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const showPreviousPreview = useCallback(() => {
    setPreviewIndex((current) => {
      if (current === null) return current;
      return (current - 1 + PORTFOLIO_GALLERY.length) % PORTFOLIO_GALLERY.length;
    });
  }, []);

  const showNextPreview = useCallback(() => {
    setPreviewIndex((current) => {
      if (current === null) return current;
      return (current + 1) % PORTFOLIO_GALLERY.length;
    });
  }, []);

  useEffect(() => {
    if (!previewItem) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closePreview();
      if (event.key === "ArrowLeft") showPreviousPreview();
      if (event.key === "ArrowRight") showNextPreview();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewItem, closePreview, showPreviousPreview, showNextPreview]);

  return (
    <div className="flex flex-col py-20">
      <section className="pb-18">
        <div className="container mx-auto grid items-center gap-12 px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <ScrollReveal direction="up" delay={0.1}>
              <div className="mb-6 inline-flex rounded-full border border-cyan-primary/20 bg-cyan-primary/8 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary">
                Our Work
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <h1 className="text-5xl font-black leading-[1.05] text-white md:text-6xl">
                We let the <GradientText>work</GradientText> do the talking.
              </h1>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.3}>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-light-gray/68">
                Every project here started with a problem and ended with
                something we were genuinely proud to ship. Real briefs, real
                builds, and a lot more currently in the pipeline.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.4}>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="#featured-projects">
                  <Button>
                    View Projects <ArrowRight size={16} />
                  </Button>
                </a>
                <Link to="/book">
                  <Button variant="outline">Start A Project With Us</Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PORTFOLIO_GALLERY.slice(0, 4).map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setPreviewIndex(index)}
                className="group relative overflow-hidden rounded-[24px] border border-white/8 text-left transition-transform duration-300 hover:-translate-y-1"
                aria-label={`Preview ${item.title}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-64 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
                    <Eye size={14} /> Preview
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-sm font-semibold text-white">
                  {item.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="featured-projects" className="bg-secondary-dark/28 py-20">
        <div className="container mx-auto px-6">
          <SectionHeading subtitle="Current featured builds and active project slots.">
            Featured <span className="text-white">Projects</span>
          </SectionHeading>

          <div className="grid gap-6 lg:grid-cols-3">
            {FEATURED_PROJECTS.map((project) => (
              <div key={project.id}>
                <Card className="flex h-full flex-col overflow-hidden border-white/8 bg-black/72 p-0">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-64 w-full object-cover"
                    width="400"
                    height="256"
                    loading="lazy"
                  />
                  <div className="flex flex-1 flex-col p-7">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                        {project.category}
                      </div>
                      <div className="rounded-full border border-cyan-primary/18 bg-cyan-primary/8 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-primary">
                        {project.status}
                      </div>
                    </div>
                    <h3 className="mt-4 text-2xl font-black text-white">
                      {project.title}
                    </h3>
                    <p className="mt-4 flex-1 text-sm leading-7 text-light-gray/66">
                      {project.description}
                    </p>
                    <div className="mt-6 text-sm text-light-gray/56">
                      Built by: {project.builtBy}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-primary/72">
              Portfolio Vault
            </div>
            <h2 className="mt-3 text-4xl font-black text-white">
              Past work, snapshots, and public-ready previews
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PORTFOLIO_GALLERY.map((item, index) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setPreviewIndex(index)}
                className="group overflow-hidden rounded-[26px] border border-white/8 bg-black/70 text-left transition-transform duration-300 hover:-translate-y-1"
                aria-label={`Preview ${item.title}`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-60 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  width="400"
                  height="240"
                  loading="lazy"
                />
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                    <Eye size={14} /> Portfolio Preview
                  </div>
                  <div className="mt-3 text-lg font-bold text-white">
                    {item.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10 pt-4">
        <div className="container mx-auto px-6">
          <Card className="border-cyan-primary/12 bg-black/75 py-14 text-center">
            <h2 className="text-4xl font-black text-white">
              We are always building.
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-light-gray/68">
              Check back for updates, or skip the waiting and start a project
              with us now.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/book">
                <Button>
                  Start A Project <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline">See Service Options</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {previewItem && (
        <PortfolioPreviewModal
          items={PORTFOLIO_GALLERY}
          activeIndex={previewIndex}
          onClose={closePreview}
          onPrevious={showPreviousPreview}
          onNext={showNextPreview}
          onSelect={setPreviewIndex}
        />
      )}
    </div>
  );
};

const PortfolioPreviewModal = ({
  items,
  activeIndex,
  onClose,
  onPrevious,
  onNext,
  onSelect,
}) => {
  const activeItem = items[activeIndex] ?? items[0];

  if (!activeItem) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#10141a] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 bg-[#10141a]/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
              Portfolio Preview
            </div>
            <h3 className="mt-2 text-2xl font-black text-white">
              {activeItem.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-light-gray/60 transition-colors hover:text-white"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-black/40">
            <img
              src={activeItem.image}
              alt={activeItem.title}
              className="aspect-[16/10] w-full object-contain bg-black/25"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-6">
              <p className="max-w-2xl text-sm leading-7 text-light-gray/70">
                Browse the portfolio directly here without leaving the Projects
                page. Use the arrows or the thumbnail rail to move between
                previews.
              </p>
            </div>

            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={onPrevious}
                  className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
                  aria-label="Show previous preview"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
                  aria-label="Show next preview"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[24px] border border-white/8 bg-black/25 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                Current Frame
              </div>
              <div className="mt-3 text-lg font-bold text-white">
                {activeItem.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-light-gray/62">
                These previews stay inside the site now, matching the template
                browsing flow instead of opening an external gallery.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/25 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                Gallery
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {items.map((item, index) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onSelect(index)}
                    className={`overflow-hidden rounded-[18px] border transition-all ${
                      activeIndex === index
                        ? "border-cyan-primary shadow-[0_0_0_1px_rgba(155,255,87,0.3)]"
                        : "border-white/8 hover:border-white/14"
                    }`}
                    aria-label={`Preview ${item.title}`}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
