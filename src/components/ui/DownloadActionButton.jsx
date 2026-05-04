import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";

export default function DownloadActionButton({
  label = "Download",
  to,
  href,
  onClick,
  disabled = false,
  className = "",
  compactOnSmallScreens = false,
  desktopExpandedFull = false,
  type = "button",
  icon: Icon = Download,
  ...props
}) {
  const [touchExpanded, setTouchExpanded] = useState(false);
  const collapseTimerRef = useRef(null);

  useEffect(() => () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
  }, []);

  const queueCollapse = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }

    collapseTimerRef.current = setTimeout(() => {
      setTouchExpanded(false);
    }, 900);
  };

  const handleTouchStart = () => {
    if (!compactOnSmallScreens || disabled) return;
    setTouchExpanded(true);
    queueCollapse();
  };

  const widthClassName = compactOnSmallScreens
    ? desktopExpandedFull
      ? "w-14 lg:w-full hover:w-[190px] focus-visible:w-[190px] active:w-[190px]"
      : "w-14 lg:w-[190px] hover:w-[190px] focus-visible:w-[190px] active:w-[190px]"
    : desktopExpandedFull
      ? "w-full"
      : "w-[190px]";

  const content = (
    <>
      <div
        className={`absolute left-1 top-1 bottom-1 z-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-primary to-teal-primary text-primary-dark shadow-[0_12px_24px_rgba(155,255,87,0.18)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          compactOnSmallScreens
            ? "w-12 lg:w-[calc(100%-8px)] group-hover:w-[calc(100%-8px)] group-focus-visible:w-[calc(100%-8px)] group-active:w-[calc(100%-8px)]"
            : "w-[calc(100%-8px)]"
        }`}
      >
        <Icon size={20} />
      </div>
      <span
        className={`relative z-20 flex w-full items-center justify-center pl-14 pr-5 text-sm font-black uppercase tracking-[0.16em] transition-[max-width,opacity,transform] duration-300 ${
          compactOnSmallScreens
            ? "max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-visible:max-w-[120px] group-focus-visible:opacity-100 group-active:max-w-[120px] group-active:opacity-100 lg:max-w-[120px] lg:opacity-100"
            : "max-w-[120px] opacity-100"
        }`}
      >
        {label}
      </span>
    </>
  );

  const baseClassName = [
    "group relative inline-flex h-14 items-center overflow-hidden rounded-[1.35rem] border border-cyan-primary/18 bg-[#10161c]/94 text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition-[width,border-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-cyan-primary/34 hover:shadow-[0_22px_46px_rgba(155,255,87,0.16)]",
    widthClassName,
    disabled ? "pointer-events-none opacity-45" : "",
    touchExpanded ? "w-[190px]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (to) {
    return (
      <div className="inline-flex">
        <Link
          to={to}
          onTouchStart={handleTouchStart}
          className={baseClassName}
          aria-disabled={disabled}
          {...props}
        >
          {content}
        </Link>
      </div>
    );
  }

  if (href) {
    return (
      <div className="inline-flex">
        <a
          href={href}
          onTouchStart={handleTouchStart}
          className={baseClassName}
          aria-disabled={disabled}
          {...props}
        >
          {content}
        </a>
      </div>
    );
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onTouchStart={handleTouchStart}
      className={baseClassName}
      disabled={disabled}
      {...props}
    >
      {content}
    </button>
  );
}
