import { useEffect, useState } from "react";

export interface HeaderProps {
  onNavigate: (sectionId: string) => void;
  activeSection: string;
}

const NAV_ITEMS = [
  { id: "issues", label: "Issues" },
  { id: "planet-ai", label: "Planet AI" },
  { id: "act", label: "Act" },
] as const;

const Wordmark = () => (
  <span className="wordmark" aria-hidden="true">
    <svg viewBox="0 0 34 34" className="wordmark__mark" focusable="false">
      <circle cx="17" cy="17" r="15" className="wordmark__globe" />
      <path d="M4 20.5c5.5 3.4 9.5-2.2 14-.4 2.4 1 4.6.4 6.6-1.6" className="wordmark__wave" />
      <path d="M8 12c4.4-2.3 9 1 14.4-1.2" className="wordmark__wave wordmark__wave--thin" />
    </svg>
    <span className="wordmark__text">
      Let&rsquo;s Save <em>Our Planet</em>
    </span>
  </span>
);

export default function Header({ onNavigate, activeSection }: HeaderProps) {
  const [condensed, setCondensed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-locked", menuOpen);
    return () => document.body.classList.remove("is-locked");
  }, [menuOpen]);

  const go = (sectionId: string) => {
    setMenuOpen(false);
    onNavigate(sectionId);
  };

  return (
    <header className={`site-header${condensed ? " site-header--condensed" : ""}`}>
      <a className="skip-link" href="#issues">
        Skip to content
      </a>

      <div className="site-header__inner">
        <button type="button" className="site-header__brand" onClick={() => go("top")}>
          <Wordmark />
          <span className="sr-only">Back to top</span>
        </button>

        <nav className="site-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`site-nav__link${activeSection === item.id ? " is-active" : ""}`}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="site-header__actions">
          <button type="button" className="btn btn--ink btn--sm" onClick={() => go("planet-ai")}>
            Ask Planet AI
          </button>
          <button
            type="button"
            className={`burger${menuOpen ? " is-open" : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu${menuOpen ? " is-open" : ""}`} hidden={!menuOpen}>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} type="button" className="mobile-menu__link" onClick={() => go(item.id)}>
            {item.label}
          </button>
        ))}
        <button type="button" className="btn btn--ink" onClick={() => go("planet-ai")}>
          Ask Planet AI
        </button>
      </div>
    </header>
  );
}
