import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BackButton({
  label = "Go Back",
  to,
  href,
  onClick,
  className = "",
  compact = false,
  type = "button",
  ...props
}) {
  const baseClassName = [
    "group relative inline-flex h-14 items-center overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0d1418]/92 px-1 text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition-[border-color,box-shadow,transform] duration-300 hover:border-cyan-primary/26 hover:shadow-[0_22px_50px_rgba(155,255,87,0.16)]",
    compact ? "w-12 hover:w-[152px] focus-visible:w-[152px] active:w-[152px]" : "min-w-[188px]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="absolute left-1 top-1 bottom-1 z-10 flex w-10 items-center justify-center rounded-[1rem] bg-gradient-to-r from-cyan-primary to-teal-primary text-primary-dark transition-[width,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[calc(100%-8px)] group-focus-visible:w-[calc(100%-8px)] group-active:w-[calc(100%-8px)]">
        <ArrowLeft size={20} />
      </div>
      <span
        className={`relative z-20 flex w-full items-center justify-center font-semibold tracking-[0.08em] transition-[opacity,transform] duration-300 ${
          compact
            ? "pl-14 pr-4 text-sm opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
            : "pl-14 pr-6 text-sm opacity-100 group-hover:opacity-0 group-focus-visible:opacity-0 group-active:opacity-0"
        }`}
      >
        {label}
      </span>
    </>
  );

  if (to) {
    return (
      <div className="inline-flex">
        <Link to={to} className={baseClassName} {...props}>
          {content}
        </Link>
      </div>
    );
  }

  if (href) {
    return (
      <div className="inline-flex">
        <a href={href} className={baseClassName} {...props}>
          {content}
        </a>
      </div>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={baseClassName}
      {...props}
    >
      {content}
    </button>
  );
}
