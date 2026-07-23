"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PhaseBanner } from "@/components/shared/phase-banner";

const INTRO_KEY = "oneflow-hackathon-intro-seen-v1";

type IntroPhase = "error404" | "gaps" | "init" | "done";

const ARCHITECTURE_NODES = [
  {
    label: "PPG Workday",
    tip: "Authoritative employee and hire data",
  },
  { label: "Dataverse", tip: "Shared enterprise data platform" },
  { label: "Power Automate", tip: "Orchestrates workflow and notifications" },
  { label: "OneFlow", tip: "Employee lifecycle experience" },
  { label: "Power BI", tip: "Reporting and operational insight" },
] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function HackathonIntro({
  onSkip,
  onDone,
}: {
  onSkip: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<IntroPhase>("error404");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("gaps"), 550);
    const t2 = window.setTimeout(() => setPhase("init"), 1100);
    const t3 = window.setTimeout(() => onDone(), 1750);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onDone]);

  const label =
    phase === "error404"
      ? "ERROR 404"
      : phase === "gaps"
        ? "Workflow gaps found."
        : "OneFlow initialized.";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b14] text-white"
      role="dialog"
      aria-label="OneFlow intro"
    >
      <p
        key={phase}
        className="font-display text-3xl tracking-[0.12em] text-cyan-100/95"
        style={{
          letterSpacing: phase === "error404" ? "0.28em" : "0.04em",
          animation: "oneflow-fade-in 0.45s ease",
        }}
      >
        {label}
      </p>
      <div className="mt-8 h-px w-40 overflow-hidden bg-white/10">
        <div
          className="h-full w-full origin-left bg-cyan-400/80"
          style={{ animation: "oneflow-progress-line 1.75s linear forwards" }}
        />
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="absolute bottom-8 rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        Skip Intro
      </button>
    </div>
  );
}

function WorkflowConnector({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div
      className="mx-auto flex w-full max-w-[20rem] flex-col items-center sm:max-w-[22rem]"
      aria-hidden="true"
    >
      {/* Desktop / tablet: horizontal — equal node widths for optical center */}
      <div className="hidden w-full items-center gap-2 sm:flex">
        <span className="w-[5.75rem] shrink-0 rounded border border-white/10 bg-white/[0.03] px-1 py-1 text-center text-[9px] font-medium uppercase tracking-wide text-slate-400">
          PPG Workday
        </span>
        <div className="relative h-px min-w-0 flex-1 bg-white/10">
          <span
            className={`absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.7)] ${
              reducedMotion ? "left-1/2 -translate-x-1/2" : "landing-flow-pulse"
            }`}
          />
        </div>
        <span className="w-[5.75rem] shrink-0 rounded border border-cyan-400/30 bg-cyan-500/5 px-1 py-1 text-center text-[9px] font-medium uppercase tracking-wide text-cyan-200/90">
          OneFlow
        </span>
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col items-center gap-2 sm:hidden">
        <span className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          PPG Workday
        </span>
        <div className="relative h-8 w-px bg-white/10">
          <span
            className={`absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.7)] ${
              reducedMotion ? "top-1/2 -translate-y-1/2" : "landing-flow-pulse-v"
            }`}
          />
        </div>
        <span className="rounded border border-cyan-400/30 bg-cyan-500/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-200/90">
          OneFlow
        </span>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Employee data becomes coordinated action.
      </p>
    </div>
  );
}

export default function HubPage() {
  const reducedMotion = usePrefersReducedMotion();
  const [showIntro, setShowIntro] = useState(false);
  const [ready, setReady] = useState(false);
  const [teamHovered, setTeamHovered] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(INTRO_KEY) === "1";
      if (seen || reducedMotion) {
        setShowIntro(false);
      } else {
        setShowIntro(true);
      }
    } catch {
      setShowIntro(false);
    }
    setReady(true);
  }, [reducedMotion]);

  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowIntro(false);
  }, []);

  const scrollToApps = () => {
    const el = document.getElementById("applications");
    if (!el) return;
    el.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b14] text-slate-100">
      <PhaseBanner />

      {/* Atmosphere — soft depth centered on the OneFlow title axis */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(34,211,238,0.11),transparent_42%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(148,163,184,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.4)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] h-40 w-56 -translate-x-1/2 rounded-full bg-cyan-400/[0.05] blur-3xl"
      />

      {ready && showIntro && (
        <HackathonIntro onSkip={finishIntro} onDone={finishIntro} />
      )}

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-12 pt-14 text-center sm:pt-20">
        {/* Tight hero column — visual center aligns with OneFlow heading */}
        <div className="mx-auto flex w-full max-w-sm flex-col items-center sm:max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/70">
            PPG AEN Hackathon 2026
          </p>

          <h1 className="mt-5 font-display text-5xl tracking-tight text-white sm:text-6xl">
            OneFlow
          </h1>

          <p className="mt-3 max-w-[18rem] text-lg leading-snug text-slate-300 sm:max-w-xs sm:text-xl">
            One employee journey.
            <br />
            One connected workflow.
          </p>

          <p className="mt-3 max-w-[20rem] text-sm leading-relaxed text-slate-500 sm:max-w-sm">
            A unified employee-lifecycle prototype connecting onboarding,
            offboarding, tasks, forms, approvals and automation.
          </p>

          <div
            className="group/team mt-5 inline-flex flex-col items-center"
            onMouseEnter={() => setTeamHovered(true)}
            onMouseLeave={() => setTeamHovered(false)}
            onFocus={() => setTeamHovered(true)}
            onBlur={() => setTeamHovered(false)}
            tabIndex={0}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 transition group-hover/team:border-cyan-400/30 group-focus-visible/team:outline group-focus-visible/team:outline-2 group-focus-visible/team:outline-offset-2 group-focus-visible/team:outline-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
              Built by Team Error 404
            </div>
            <p className="mt-1.5 min-h-[1rem] text-[11px] text-slate-500 transition-colors">
              {teamHovered
                ? "Status: Workflow found."
                : "We found the workflow gaps."}
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToApps}
            className="mt-4 rounded-md border border-white/15 bg-transparent px-3.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-cyan-400/35 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Explore the Prototype ↓
          </button>

          <div className="mt-5 flex w-full justify-center">
            <WorkflowConnector reducedMotion={reducedMotion} />
          </div>
        </div>

        <div
          id="applications"
          className="mt-6 grid w-full scroll-mt-8 gap-4 text-left sm:grid-cols-2 sm:items-stretch"
        >
          <Link
            href="/workday"
            className="group flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.03] p-5 transition duration-200 hover:-translate-y-[3px] hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Source System (Workday)
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">PPG Workday</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              Create and manage employee records, initiate hiring, and trigger
              automated onboarding and offboarding workflows into OneFlow.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-300 group-hover:text-cyan-200">
              Open Workday
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </Link>

          <Link
            href="/oneflow"
            className="group relative flex h-full flex-col rounded-xl border border-cyan-400/45 bg-gradient-to-b from-cyan-500/[0.14] to-cyan-500/[0.02] p-5 shadow-[0_0_40px_-18px_rgba(34,211,238,0.55)] transition duration-200 hover:-translate-y-[3px] hover:border-cyan-400/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Employee Lifecycle Platform
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">OneFlow</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
              Manage onboarding, offboarding, tasks, forms, reminders and
              workflow automation.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200">
              Enter OneFlow
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </Link>
        </div>

        <div
          id="architecture"
          className="mt-10 w-full border-t border-white/10 pt-6"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Future Microsoft Architecture
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 text-[11px] sm:text-xs">
            {ARCHITECTURE_NODES.map((node, i) => (
              <span key={node.label} className="flex items-center gap-1.5">
                <span
                  title={node.tip}
                  className="cursor-default rounded border border-white/10 bg-[#0c1220]/80 px-2 py-1 text-slate-300 transition hover:border-cyan-400/30 hover:text-slate-100"
                >
                  {node.label}
                </span>
                {i < ARCHITECTURE_NODES.length - 1 && (
                  <span className="text-cyan-400/45" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <footer className="mt-12 text-[11px] text-slate-600">
          PPG AEN Hackathon 2026 · Team Error 404
        </footer>
      </main>
    </div>
  );
}
