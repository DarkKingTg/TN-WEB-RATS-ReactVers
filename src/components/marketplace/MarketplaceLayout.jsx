import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import FilterSidebar from "./FilterSidebar";

export default function MarketplaceLayout({ children, filters, setFilters }) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );

  useEffect(() => {
    const syncLayout = () => {
      const desktopViewport = window.innerWidth >= 1024;
      setIsDesktopViewport(desktopViewport);
      setIsSidebarOpen(desktopViewport);
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  useEffect(() => {
    if (isDesktopViewport || !isSidebarOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDesktopViewport, isSidebarOpen]);

  const closeSidebar = () => {
    if (!isDesktopViewport) {
      setIsSidebarOpen(false);
    }
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  return (
    <section className="min-h-screen bg-[#0B120C] text-white">
      {!isDesktopViewport && !isSidebarOpen && (
        <button
          type="button"
          onClick={openSidebar}
          className="fixed left-4 top-28 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1B241A]/92 px-4 py-3 text-xs font-semibold text-white shadow-[0_24px_50px_rgba(0,0,0,0.32)] backdrop-blur transition hover:border-cyan-primary/30 hover:text-cyan-primary md:left-6"
          aria-label="Open template filters"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
      )}

      {!isDesktopViewport && isSidebarOpen && (
        <button
          type="button"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          aria-label="Close filter sidebar"
        />
      )}

      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10">
        <aside
          className={`fixed bottom-4 left-0 top-24 z-50 w-[min(320px,84vw)] overflow-y-auto rounded-r-[2rem] border-r border-white/8 bg-[#1B241A]/95 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur transition-transform duration-300 ease-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-[105%]"
          } lg:sticky lg:top-28 lg:z-auto lg:h-fit lg:w-auto lg:translate-x-0 lg:rounded-[2rem] lg:border lg:border-white/8 lg:border-r lg:bg-[#1B241A]/90`}
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/6 pb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary/70">
                Template Filters
              </div>
              <h2 className="mt-2 text-xl font-black text-white">
                Find the right asset fast
              </h2>
            </div>

            {!isDesktopViewport && (
              <button
                type="button"
                onClick={closeSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-white/60 transition hover:border-white/14 hover:text-white"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            onRequestClose={closeSidebar}
          />
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </section>
  );
}
