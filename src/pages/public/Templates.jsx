import { useState, useMemo, useRef, useCallback } from "react";

import {
  Crown,
  Download,
  Eye,
  Gift,
  Search,
  ShoppingCart,
  Sparkles,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Lock,
} from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button, Card } from "../../components/ui/Primitives";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_ITEMS,
  formatTemplatePrice,
} from "../../data/templateData";
import { apiRequest, isBackendConfigured } from "../../services/apiClient";

const Templates = () => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [purchaseTemplate, setPurchaseTemplate] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const filtered = useMemo(() => {
    let results = TEMPLATE_ITEMS;
    if (activeCategory !== "all") {
      results = results.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    }
    return results;
  }, [activeCategory, searchQuery]);

  const handleGetTemplate = async (template) => {
    if (!user) {
      setPurchaseTemplate(template);
      return;
    }

    if (template.isFree) {
      // Free template — record and "download" via backend
      try {
        if (isBackendConfigured()) {
          const response = await apiRequest("/templates/unlock", {
            method: "POST",
            body: {
              templateId: template.id,
              templateTitle: template.title,
              isFree: true,
              price: 0,
            },
          });

          if (response?.success) {
            setPurchaseSuccess(true);
            setPurchaseTemplate(template);
          }
        } else {
          // Fallback to direct Firestore (for local dev without backend)
          await addDoc(collection(db, "templatePurchases"), {
            userId: user.uid,
            templateId: template.id,
            templateTitle: template.title,
            price: 0,
            type: "free",
            createdAt: serverTimestamp(),
          });
          setPurchaseSuccess(true);
          setPurchaseTemplate(template);
        }
      } catch (error) {
        console.error("Template record error:", error);
        if (error.status === 429) {
          alert(error.message || "Daily free template limit reached (3/day).");
        }
      }
    } else {
      setPurchaseTemplate(template);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseTemplate || !user) return;
    setPurchasing(true);
    try {
      if (isBackendConfigured()) {
        const response = await apiRequest("/templates/unlock", {
          method: "POST",
          body: {
            templateId: purchaseTemplate.id,
            templateTitle: purchaseTemplate.title,
            isFree: false,
            price: purchaseTemplate.price,
          },
        });
        if (response?.success) {
          setPurchaseSuccess(true);
        }
      } else {
        await addDoc(collection(db, "templatePurchases"), {
          userId: user.uid,
          templateId: purchaseTemplate.id,
          templateTitle: purchaseTemplate.title,
          price: purchaseTemplate.price,
          type: "paid",
          status: "completed",
          createdAt: serverTimestamp(),
        });
        setPurchaseSuccess(true);
      }
    } catch (error) {
      console.error("Purchase error:", error);
    } finally {
      setPurchasing(false);
    }
  };

  const closePurchaseModal = () => {
    setPurchaseTemplate(null);
    setPurchaseSuccess(false);
    setPurchasing(false);
  };

  return (
    <div className="min-h-screen bg-primary-dark text-light-gray">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-primary/5 via-transparent to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-primary/20 bg-cyan-primary/5 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-primary">
            <Sparkles size={12} /> Templates & Assets
          </div>
          <h1 className="text-4xl font-black text-white md:text-5xl lg:text-6xl">
            Ready-Made{" "}
            <span className="text-cyan-primary">Templates</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-light-gray/50">
            Browse our curated collection of website, portfolio, presentation,
            and graphic templates. Free & premium — all built by the Rynix
            studio.
          </p>
        </motion.div>
      </section>

      {/* Filters */}
      <section className="sticky top-0 z-20 border-b border-white/6 bg-primary-dark/92 px-6 py-4 backdrop-blur lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? "border border-cyan-primary/20 bg-cyan-primary/10 text-cyan-primary"
                    : "border border-white/8 text-light-gray/50 hover:border-white/14 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-light-gray/30"
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/35 py-2.5 pl-9 pr-4 text-sm text-white outline-none transition-colors placeholder:text-light-gray/30 focus:border-cyan-primary"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-xl font-black text-white">No templates found</div>
            <p className="mt-3 text-sm text-light-gray/40">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <TemplateCard
                  template={template}
                  onPreview={() => setPreviewTemplate(template)}
                  onGet={() => handleGetTemplate(template)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <InteractivePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onGet={() => {
              setPreviewTemplate(null);
              handleGetTemplate(previewTemplate);
            }}
          />
        )}
      </AnimatePresence>

      {/* Purchase Modal */}
      <AnimatePresence>
        {purchaseTemplate && (
          <PurchaseModal
            template={purchaseTemplate}
            user={user}
            purchasing={purchasing}
            success={purchaseSuccess}
            onConfirm={handleConfirmPurchase}
            onClose={closePurchaseModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Template Card ─────────────────────────────────────── */
const TemplateCard = ({ template, onPreview, onGet }) => (
  <Card
    className="group relative overflow-hidden border-white/8 bg-[#10141a] transition-all hover:border-cyan-primary/18"
  >
    {/* Image */}
    <div className="relative aspect-[16/10] overflow-hidden bg-black/50">
      <img
        src={template.image}
        alt={template.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {/* Badges */}
      <div className="absolute left-3 top-3 flex gap-2">
        {template.isFree && (
          <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-accent/15 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-accent">
            <Gift size={10} /> Free
          </span>
        )}
        {template.isPro && (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-accent/15 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300">
            <Crown size={10} /> Pro
          </span>
        )}
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          <Eye size={14} /> Preview
        </button>
        <button
          onClick={onGet}
          className="flex items-center gap-1.5 rounded-full border border-cyan-primary/30 bg-cyan-primary/15 px-4 py-2 text-xs font-semibold text-cyan-primary backdrop-blur transition-colors hover:bg-cyan-primary/25"
        >
          <ShoppingCart size={14} /> Get
        </button>
      </div>
    </div>

    {/* Content */}
    <div className="p-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-light-gray/40">
          {template.category}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-white">{template.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-light-gray/45">
        {template.description}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <div
          className={`text-lg font-black ${
            template.isFree ? "text-accent" : "text-cyan-primary"
          }`}
        >
          {formatTemplatePrice(template.price)}
        </div>
        <div className="flex gap-1.5">
          {template.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-white/6 bg-white/3 px-2 py-0.5 text-[9px] text-light-gray/30"
            >
              <Tag size={8} /> {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  </Card>
);

/* ─── Interactive Preview Modal ─────────────────────────── */
const InteractivePreviewModal = ({ template, onClose, onGet }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // Anti-download handlers
  const preventDownload = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, MIN_SCALE));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, MIN_SCALE), MAX_SCALE));
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative h-[90vh] w-[95vw] max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#10141a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-white/8 bg-[#10141a]/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
              Interactive Preview
            </div>
            {template.isFree && (
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-accent/10 px-2 py-0.5 text-[9px] font-mono text-accent">
                <Gift size={9} /> Free
              </span>
            )}
            {template.isPro && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-accent/10 px-2 py-0.5 text-[9px] font-mono text-amber-300">
                <Crown size={9} /> Pro
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-light-gray/62 transition-colors hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#10141a]/95 px-4 py-2 backdrop-blur">
          <button
            onClick={handleZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="min-w-[60px] text-center text-xs font-mono text-white/50">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <div className="mx-2 h-5 w-px bg-white/10" />
          <button
            onClick={resetView}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Reset View"
          >
            <Move size={18} />
          </button>
        </div>

        {/* Anti-download overlay message */}
        <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full border border-amber-500/20 bg-accent/10 px-4 py-2 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <Lock size={12} />
            <span>Purchase or sign in to download</span>
          </div>
        </div>

        {/* Preview Container */}
        <div
          ref={containerRef}
          className="relative mt-[72px] h-[calc(100%-72px)] w-full cursor-move overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onContextMenu={handleContextMenu}
          onDragStart={preventDownload}
        >
          {/* Watermark overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0cmFuc2Zvcm09InJvdGF0ZSgtNDUpIj5UTldlYlJhdHMgUHJldmlldzwvdGV4dD48L3N2Zz4=')] opacity-50" />
          </div>

          {/* Image with transform */}
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              src={template.image}
              alt={template.title}
              className="max-h-full max-w-full select-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
                filter: 'brightness(0.95)',
              }}
              draggable={false}
              onContextMenu={handleContextMenu}
            />
          </div>

          {/* Dark gradient overlay at edges */}
          <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
        </div>

        {/* CTA Button */}
        <div className="absolute right-6 top-1/2 z-30 -translate-y-1/2">
          <Button onClick={onGet} className="shadow-lg shadow-cyan-primary/20">
            <ShoppingCart size={16} />
            <span className="ml-2 hidden sm:inline">
              {template.isFree ? 'Get Free' : 'Purchase'}
            </span>
          </Button>
        </div>

        {/* Instructions */}
        <div className="absolute left-6 top-1/2 z-30 -translate-y-1/2 text-xs text-white/40">
          <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Move size={12} />
              <span>Drag to pan</span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomIn size={12} />
              <span>Scroll to zoom</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Purchase Modal ─────────────────────────────────────── */
const PurchaseModal = ({
  template,
  user,
  purchasing,
  success,
  onConfirm,
  onClose,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-4 backdrop-blur"
  >
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#10141a] p-6 shadow-2xl"
    >
      {!user ? (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-primary/20 bg-cyan-primary/10">
              <ShoppingCart size={24} className="text-cyan-primary" />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">
              Sign in Required
            </h3>
            <p className="mt-2 text-sm text-light-gray/50">
              Create an account or sign in to get this template.
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <a href="/join?login=1" className="flex-1">
              <Button className="w-full">Sign In</Button>
            </a>
          </div>
        </>
      ) : success ? (
        <>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/20 bg-accent/10">
              <Download size={24} className="text-accent" />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">
              {template.isFree ? "Template Unlocked!" : "Purchase Complete!"}
            </h3>
            <p className="mt-2 text-sm text-light-gray/50">
              {template.isFree
                ? "This free template has been added to your account."
                : "Your purchase is confirmed. The template is now available."}
            </p>
          </div>
          <div className="mt-6">
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-primary/72">
                Confirm Purchase
              </div>
              <h3 className="mt-2 text-xl font-black text-white">
                {template.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-light-gray/62 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-white/8 bg-black/30 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-gray/50">Template</span>
              <span className="font-semibold text-white">{template.title}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/6 pt-3">
              <span className="text-sm text-light-gray/50">Price</span>
              <span className="text-xl font-black text-cyan-primary">
                {formatTemplatePrice(template.price)}
              </span>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={purchasing}
              className="flex-1"
            >
              {purchasing ? "Processing..." : "Confirm Purchase"}
            </Button>
          </div>
        </>
      )}
    </motion.div>
  </motion.div>
);

export default Templates;
