import { ArrowRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CONTACT_INFO, SERVICE_CATEGORIES } from "../../data/siteData";

const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="relative z-10 mt-auto border-t border-cyan-primary/10 bg-[#1B241A]/95 pb-8 pt-16 backdrop-blur-md">
      <div className="container mx-auto px-6">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr_1fr]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary/72">
              Rynix
            </div>
            <h2 className="mt-4 text-3xl font-black text-white">
              A small studio with a sharp focus.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-light-gray/66">
              Websites, presentations, posters, quick fixes, and reusable
              digital assets - built directly with the people asking for them.
            </p>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary/72">
              Contact
            </div>
            <div className="mt-5 space-y-4">
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="flex items-center gap-3 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <Mail size={18} className="text-cyan-primary" />
                <span>{CONTACT_INFO.email}</span>
              </a>
              <a
                href={`https://wa.me/${CONTACT_INFO.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <MessageCircle size={18} className="text-cyan-primary" />
                <span>{CONTACT_INFO.whatsappDisplay}</span>
              </a>
              <a
                href={CONTACT_INFO.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <Instagram size={18} className="text-cyan-primary" />
                <span>{CONTACT_INFO.instagramHandle}</span>
              </a>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-cyan-primary/72">
              Explore
            </div>
            <div className="mt-5 grid gap-3">
              <Link
                to="/services"
                className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
                Services
              </Link>
              <Link
                to="/projects"
                className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
                Projects
              </Link>
              <Link
                to="/templates"
                className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
                Templates
              </Link>
              <Link
                to="/about"
                className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
                About
              </Link>
              <Link
                to="/book"
                className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
              >
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-1"
                />
                Book Service
              </Link>
              {user ? (
                <Link
                  to="/profile"
                  className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
                >
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                  Profile
                </Link>
              ) : (
                <>
                  <Link
                    to="/join?tab=register"
                    className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
                  >
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                    Join
                  </Link>
                  <Link
                    to="/join?login=1"
                    className="group flex items-center gap-2 text-light-gray/68 transition-colors hover:text-cyan-primary"
                  >
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="mt-14 border-t border-white/8 pt-8 text-sm text-light-gray/45">
          2026 Rynix. Built for direct collaboration, faster delivery, and
          cleaner project handoffs.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
