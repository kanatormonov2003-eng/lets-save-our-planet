export interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

const SOURCES = [
  { label: "IPCC AR6", href: "https://www.ipcc.ch/assessment-report/ar6/" },
  { label: "WMO State of the Climate", href: "https://wmo.int/publication-series/state-of-global-climate" },
  { label: "IEA", href: "https://www.iea.org/" },
  { label: "Global Forest Watch", href: "https://www.globalforestwatch.org/" },
  { label: "IUCN Red List", href: "https://www.iucnredlist.org/" },
  { label: "UNEP", href: "https://www.unep.org/" },
];

export default function Footer({ onNavigate }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" id="act">
      <div className="site-footer__call">
        <h2 className="site-footer__title">
          Start with one thing.
          <br />
          Then tell someone about it.
        </h2>
        <p className="site-footer__lede">
          Individual choices matter most when they stack into collective ones: how your city moves,
          what your employer buys, what your government funds. Pick a lever with reach.
        </p>
        <div className="site-footer__actions">
          <button type="button" className="btn btn--ink" onClick={() => onNavigate("planet-ai")}>
            Ask Planet AI where to start
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => onNavigate("issues")}>
            Re-read the issues
          </button>
        </div>
      </div>

      <div className="site-footer__meta">
        <div>
          <p className="site-footer__label">Data sources</p>
          <ul className="site-footer__links">
            {SOURCES.map((source) => (
              <li key={source.label}>
                <a href={source.href} target="_blank" rel="noreferrer noopener">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="site-footer__label">About</p>
          <p className="site-footer__note">
            Let&rsquo;s Save Our Planet is an independent, non-commercial explainer. Figures are cited
            with their year; where evidence is contested, the page says so. Planet AI answers with
            Google Gemini and only discusses environmental topics.
          </p>
        </div>
      </div>

      <div className="site-footer__base">
        <span>&copy; {year} Let&rsquo;s Save Our Planet</span>
        <button type="button" className="site-footer__top" onClick={() => onNavigate("top")}>
          Back to top
        </button>
      </div>
    </footer>
  );
}
