import { useId, useState, type CSSProperties, type ReactElement } from "react";

import type { Issue, IssueArtKey } from "../data/issues";

export interface ProblemCardProps {
  issue: Issue;
  featured?: boolean;
}

type DetailTab = "causes" | "effects" | "solutions";

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "causes", label: "Causes" },
  { id: "effects", label: "Consequences" },
  { id: "solutions", label: "Solutions" },
];

/* -------------------------------------------------------------------------- */
/* Generated artwork                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Every card gets a hand-built SVG scene instead of stock photography, so the
 * site ships with zero external image requests and nothing ever 404s.
 * Provide `issue.photo` to swap in a real photograph.
 */
const ART: Record<IssueArtKey, ReactElement> = {
  heat: (
    <g>
      <circle cx="150" cy="78" r="34" className="art-sun" />
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <path
          key={row}
          d={`M12 ${120 + row * 22} q30 -14 60 0 t60 0 t60 0 t60 0 t36 0`}
          className="art-heat-line"
          style={{ opacity: 0.85 - row * 0.12 }}
        />
      ))}
    </g>
  ),
  air: (
    <g>
      <path d="M40 210h48l14-58h34l12 58h92" className="art-stroke" />
      <path d="M104 152c-6-30 4-52 22-58 20-6 30 10 26 30" className="art-stroke art-stroke--thin" />
      {[54, 96, 142, 188, 226].map((cx, index) => (
        <circle key={cx} cx={cx} cy={58 + (index % 3) * 30} r={5 + (index % 3) * 3} className="art-dot" />
      ))}
      <circle cx="212" cy="120" r="14" className="art-dot art-dot--soft" />
      <circle cx="76" cy="104" r="9" className="art-dot art-dot--soft" />
    </g>
  ),
  water: (
    <g>
      <path d="M20 96q34 -30 70 0t70 0 70 0 50 0" className="art-stroke" />
      <path d="M20 132q34 -30 70 0t70 0 70 0 50 0" className="art-stroke art-stroke--thin" />
      <path d="M20 168q34 -30 70 0t70 0 70 0 50 0" className="art-stroke art-stroke--thin" />
      <path d="M118 34c14 20 24 34 24 46a24 24 0 1 1-48 0c0-12 10-26 24-46Z" className="art-fill" />
      <rect x="186" y="178" width="58" height="44" rx="8" className="art-stroke art-stroke--thin" />
    </g>
  ),
  plastic: (
    <g>
      <path d="M118 44h44v22l16 26v106a20 20 0 0 1-20 20h-36a20 20 0 0 1-20-20V92l16-26Z" className="art-stroke" />
      <path d="M112 128h56" className="art-stroke art-stroke--thin" />
      <path d="M112 158h56" className="art-stroke art-stroke--thin" />
      {[36, 62, 214, 244].map((cx, index) => (
        <rect
          key={cx}
          x={cx}
          y={70 + index * 34}
          width="26"
          height="14"
          rx="7"
          className="art-fill"
          style={{ opacity: 0.5 + index * 0.12 }}
        />
      ))}
      <path d="M20 214h260" className="art-stroke art-stroke--thin" />
    </g>
  ),
  forest: (
    <g>
      {[46, 96, 200, 250].map((x, index) => (
        <g key={x}>
          <path d={`M${x} 200V132`} className="art-stroke" />
          <path d={`M${x - 30} 138l30-72 30 72Z`} className="art-fill" style={{ opacity: 0.9 - index * 0.08 }} />
        </g>
      ))}
      <path d="M132 200v-26" className="art-stroke art-stroke--thin" />
      <path d="M164 200v-38" className="art-stroke art-stroke--thin" />
      <path d="M18 202h264" className="art-stroke" />
      <path d="M126 168l14-12 14 12" className="art-stroke art-stroke--thin" />
    </g>
  ),
  species: (
    <g>
      <path d="M150 176c-46 0-78-30-78-64 0-24 18-42 40-42 16 0 28 8 38 22 10-14 22-22 38-22 22 0 40 18 40 42 0 34-32 64-78 64Z" className="art-fill" />
      <circle cx="120" cy="96" r="6" className="art-dot" />
      <circle cx="180" cy="96" r="6" className="art-dot" />
      <path d="M40 214q40 -22 80 0t80 0 60 0" className="art-stroke art-stroke--thin" />
      <path d="M64 60l12 18M236 60l-12 18" className="art-stroke art-stroke--thin" />
    </g>
  ),
  energy: (
    <g>
      <path d="M150 40v70M150 110l-56 34M150 110l56 34" className="art-stroke" />
      <circle cx="150" cy="110" r="11" className="art-fill" />
      <path d="M110 214h80" className="art-stroke art-stroke--thin" />
      <path d="M150 110v104" className="art-stroke art-stroke--thin" />
      <g className="art-panel">
        <path d="M30 196l16-56h58l-8 56Z" className="art-stroke art-stroke--thin" />
        <path d="M196 196l8-56h58l16 56Z" className="art-stroke art-stroke--thin" />
      </g>
    </g>
  ),
  ocean: (
    <g>
      <path d="M18 128q36 -26 72 0t72 0 72 0 48 0v96H18Z" className="art-fill" style={{ opacity: 0.34 }} />
      <path d="M18 128q36 -26 72 0t72 0 72 0 48 0" className="art-stroke" />
      <path d="M60 178q26 -18 52 0t52 0 52 0" className="art-stroke art-stroke--thin" />
      <path d="M96 90c18-20 40-30 62-30s44 10 62 30" className="art-stroke art-stroke--thin" />
      <circle cx="158" cy="52" r="12" className="art-dot" />
      <path d="M112 214q22 -16 44 0t44 0" className="art-stroke art-stroke--thin" />
    </g>
  ),
};

const IssueArt = ({ issue }: { issue: Issue }) => {
  if (issue.photo) {
    return (
      <div className="issue__art issue__art--photo">
        <img src={issue.photo} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className="issue__art">
      <svg viewBox="0 0 300 240" role="img" aria-label={`Illustration for ${issue.title}`} focusable="false">
        {ART[issue.art]}
      </svg>
      <span className="issue__group">{issue.group}</span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProblemCard({ issue, featured = false }: ProblemCardProps) {
  const [tab, setTab] = useState<DetailTab>("causes");
  const panelId = useId();

  const style: CSSProperties & Record<string, string | number> = {
    "--issue-h": issue.hue,
  };
  const items = issue[tab];

  return (
    <article
      className={`issue${featured ? " issue--featured" : ""}`}
      style={style}
      id={issue.id}
      aria-labelledby={`${panelId}-title`}
    >
      <IssueArt issue={issue} />

      <div className="issue__body">
        <div className="issue__head">
          <span className="issue__kicker">{issue.kicker}</span>
          <h3 className="issue__title" id={`${panelId}-title`}>
            {issue.title}
          </h3>
          <p className="issue__headline">{issue.headline}</p>
        </div>

        <p className="issue__description">{issue.description}</p>

        <p className="issue__metric">
          <strong>{issue.metric.value}</strong>
          <span>
            {issue.metric.label} <em>({issue.metric.source})</em>
          </span>
        </p>

        <div className="issue__tabs" role="tablist" aria-label={`${issue.title} details`}>
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`${panelId}-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls={`${panelId}-panel`}
              className={`issue__tab${tab === entry.id ? " is-active" : ""}`}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <ul
          className="issue__list"
          id={`${panelId}-panel`}
          role="tabpanel"
          aria-labelledby={`${panelId}-tab-${tab}`}
          key={tab}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
