import { useCallback, useEffect, useMemo, useState } from "react";

import AIChat from "./components/AIChat";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ProblemCard from "./components/ProblemCard";
import { issueGroups, issues, type IssueGroup } from "./data/issues";

type Filter = IssueGroup | "All";

const scrollToSection = (sectionId: string) => {
  if (sectionId === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const target = document.getElementById(sectionId);
  if (!target) return;
  const offset = target.getBoundingClientRect().top + window.scrollY - 76;
  window.scrollTo({ top: offset, behavior: "smooth" });
};

export default function App() {
  const [filter, setFilter] = useState<Filter>("All");
  const [activeSection, setActiveSection] = useState("top");

  const visibleIssues = useMemo(
    () => (filter === "All" ? issues : issues.filter((issue) => issue.group === filter)),
    [filter]
  );

  /* Track the section in view to light up the nav. */
  useEffect(() => {
    const sections = ["issues", "planet-ai", "act"]
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0.01, 0.2, 0.5] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  /* Reveal-on-scroll, disabled when the user prefers reduced motion. */
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visibleIssues.length]);

  const navigate = useCallback((sectionId: string) => scrollToSection(sectionId), []);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Header onNavigate={navigate} activeSection={activeSection} />

      <main>
        <Hero onExplore={() => navigate("issues")} onAskAI={() => navigate("planet-ai")} />

        <section className="issues-section" id="issues">
          <div className="issues-section__head" data-reveal>
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              Eight issues, no filler
            </p>
            <h2 className="section-title">
              What is breaking,
              <br />
              why, and what fixes it
            </h2>
            <p className="section-lede">
              Each card carries the same four things: the state of play, the causes, the
              consequences and the solutions with a track record. Switch tabs inside a card to move
              between them.
            </p>

            <div className="filters" role="group" aria-label="Filter issues by theme">
              {issueGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`chip${filter === group ? " is-active" : ""}`}
                  aria-pressed={filter === group}
                  onClick={() => setFilter(group)}
                >
                  {group}
                  {group !== "All" && (
                    <span className="chip__count">
                      {issues.filter((issue) => issue.group === group).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {visibleIssues.length === 0 ? (
            <p className="issues-empty">Nothing under this theme yet. Try another filter.</p>
          ) : (
            <div className="issues-grid">
              {visibleIssues.map((issue, index) => (
                <div
                  className={`issues-grid__cell${index === 0 && filter === "All" ? " issues-grid__cell--wide" : ""}`}
                  key={issue.id}
                  data-reveal
                  style={{ transitionDelay: `${Math.min(index, 6) * 55}ms` }}
                >
                  <ProblemCard issue={issue} featured={index === 0 && filter === "All"} />
                </div>
              ))}
            </div>
          )}
        </section>

        <div data-reveal>
          <AIChat />
        </div>
      </main>

      <Footer onNavigate={navigate} />
    </>
  );
}
