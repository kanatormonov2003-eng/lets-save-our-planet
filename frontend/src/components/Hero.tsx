export interface HeroProps {
  onExplore: () => void;
  onAskAI: () => void;
}

const VITALS = [
  { value: "424 ppm", label: "atmospheric CO2", note: "2024 average, NOAA" },
  { value: "+1.55 C", label: "above pre-industrial", note: "2024, WMO" },
  { value: "6.7 Mha", label: "primary forest lost", note: "2024, Global Forest Watch" },
];

/** Generated artwork: a warming planet drawn as stacked latitude bands. */
const PlanetFigure = () => (
  <figure className="hero__figure" aria-labelledby="hero-figure-caption">
    <svg viewBox="0 0 420 420" className="planet" role="img" aria-label="Stylised globe with warming latitude bands">
      <defs>
        <clipPath id="planet-clip">
          <circle cx="210" cy="210" r="150" />
        </clipPath>
        <radialGradient id="planet-shade" cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="oklch(0.62 0.09 190)" />
          <stop offset="62%" stopColor="oklch(0.42 0.08 185)" />
          <stop offset="100%" stopColor="oklch(0.24 0.05 190)" />
        </radialGradient>
      </defs>

      <g className="planet__orbits">
        <circle cx="210" cy="210" r="188" />
        <circle cx="210" cy="210" r="170" />
      </g>

      <circle cx="210" cy="210" r="150" fill="url(#planet-shade)" />

      <g clipPath="url(#planet-clip)" className="planet__bands">
        {Array.from({ length: 13 }, (_, index) => {
          const y = 66 + index * 22;
          const heat = Math.abs(6 - index) / 6;
          return (
            <rect
              key={y}
              x="56"
              y={y}
              width="308"
              height="13"
              rx="6.5"
              style={{
                fill: `oklch(${0.68 - heat * 0.12} ${0.14 + (1 - heat) * 0.06} ${28 + heat * 130})`,
                opacity: 0.72 - heat * 0.28,
              }}
            />
          );
        })}
      </g>

      <g clipPath="url(#planet-clip)" className="planet__land">
        <path d="M92 168c26-24 52-8 74-22 20-13 44 4 62-8 16-10 34 6 52-2 12-6 26 4 34 14-14 20-40 24-58 40-22 20-52 10-74 26-20 14-48 6-66-6-14-9-22-26-24-42Z" />
        <path d="M138 268c22-10 40 8 62 2 18-5 34 10 54 4 14-4 28 4 36 16-16 16-42 20-62 30-24 12-52 6-72-10-10-8-18-24-18-42Z" />
      </g>

      <circle cx="210" cy="210" r="150" className="planet__rim" />
      <circle cx="210" cy="210" r="166" className="planet__halo" />
    </svg>

    <figcaption id="hero-figure-caption" className="hero__caption">
      Latitude bands shaded by temperature anomaly. The equator warms slowly; the poles do not.
    </figcaption>
  </figure>
);

export default function Hero({ onExplore, onAskAI }: HeroProps) {
  return (
    <section className="hero" id="top">
      <div className="hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="eyebrow__dot" aria-hidden="true" />
            An open field guide to the state of the Earth
          </p>

          <h1 className="hero__title">
            Let&rsquo;s Save
            <span className="hero__title-line">Our Planet</span>
          </h1>

          <p className="hero__lede">
            Eight problems decide what the next century looks like. Each one has causes we can name,
            consequences we can measure and solutions that already work somewhere. This is that
            briefing, without the guilt trip.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--ink" onClick={onExplore}>
              Explore Issues
              <svg viewBox="0 0 20 20" className="btn__icon" aria-hidden="true">
                <path d="M10 3.5v13M4.5 11l5.5 5.5L15.5 11" />
              </svg>
            </button>
            <button type="button" className="btn btn--outline" onClick={onAskAI}>
              Ask Planet AI
              <span className="btn__pulse" aria-hidden="true" />
            </button>
          </div>

          <dl className="vitals">
            {VITALS.map((vital) => (
              <div className="vitals__item" key={vital.label}>
                <dt>{vital.label}</dt>
                <dd>
                  <strong>{vital.value}</strong>
                  <span>{vital.note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <PlanetFigure />
      </div>
    </section>
  );
}
