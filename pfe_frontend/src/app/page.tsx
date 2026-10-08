import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  Sparkles,
  Briefcase,
  FileText,
  TrendingUp,
  Diamond,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("landing");

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 pt-18 pb-24 lg:pt-24 lg:pb-30">
        <div className="hero-grid absolute inset-0 opacity-40" />
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <div className="hero-orb hero-orb-bottom" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="text-left">
              <div className="hero-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                {t("hero.badge")}
              </div>

              <h1 className="hero-fade-up hero-delay-1 mb-6 max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("hero.titleLine1")}{" "}
                <span className="hero-gradient-text block">
                  {t("hero.titleLine2")}
                </span>
              </h1>

              <p className="hero-fade-up hero-delay-2 mb-8 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
                {t("hero.description")}
              </p>

              <div className="hero-fade-up hero-delay-3 mb-10 flex flex-wrap items-center gap-3">
                <Link href="/register">
                  <Button className="group flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.32)] transition hover:-translate-y-px hover:bg-cyan-300">
                    <Sparkles className="h-4 w-4" />
                    {t("hero.buildCv")}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button
                    variant="outline"
                    className="rounded-full border-slate-600 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                  >
                    <Briefcase className="h-4 w-4" />
                    {t("hero.exploreJobs")}
                  </Button>
                </Link>
              </div>

              <div className="hero-fade-up hero-delay-4 flex flex-wrap items-center gap-6 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t("hero.statCvsOptimized")}
                </div>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-cyan-300" />
                  {t("hero.statInterviewRate")}
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="hero-float relative w-full max-w-105 rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-[0_24px_80px_rgba(10,15,25,0.55)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t("hero.card.matchEngine")}
                  </p>
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                    {t("hero.card.live")}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-cyan-400/35 bg-cyan-400/10 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-cyan-100">
                      <span className="font-semibold">
                        {t("hero.card.role1")}
                      </span>
                      <span className="font-black">96%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cyan-900/70">
                      <div className="hero-shimmer h-full w-[96%] rounded-full bg-cyan-300" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-indigo-400/25 bg-indigo-400/10 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-indigo-100">
                      <span className="font-semibold">{t("hero.card.role2")}</span>
                      <span className="font-black">82%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-indigo-900/70">
                      <div className="hero-shimmer h-full w-[82%] rounded-full bg-indigo-300" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-600 bg-slate-800/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-200">
                      <span className="font-semibold">{t("hero.card.role3")}</span>
                      <span className="font-black">74%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-700">
                      <div className="hero-shimmer h-full w-[74%] rounded-full bg-slate-300" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-700 pt-4">
                  <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                    <FileText className="mx-auto mb-1 h-4 w-4 text-cyan-300" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("hero.card.cvScan")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                    <TrendingUp className="mx-auto mb-1 h-4 w-4 text-indigo-300" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("hero.card.insights")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                    <Diamond className="mx-auto mb-1 h-4 w-4 text-emerald-300" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {t("hero.card.verified")}
                    </p>
                  </div>
                </div>

                <div className="hero-pulse-ring pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full border border-cyan-300/40" />
                <div className="hero-pulse-ring hero-delay-3 pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full border border-indigo-300/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative overflow-hidden bg-slate-900 py-24">
        <div className="hero-grid absolute inset-0 opacity-20" />
        <div className="hero-orb hero-orb-left" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <span className="hero-fade-up inline-flex items-center rounded-full border border-indigo-300/35 bg-indigo-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
              {t("features.badge")}
            </span>
            <h2 className="hero-fade-up hero-delay-1 mt-5 text-3xl font-black tracking-tight text-white md:text-5xl">
              {t("features.titleLine1")}{" "}
              <span className="hero-gradient-text block">
                {t("features.titleLine2")}
              </span>
            </h2>
            <p className="hero-fade-up hero-delay-2 mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              {t("features.description")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="hero-fade-up hero-delay-1 rounded-2xl border border-cyan-300/25 bg-slate-800/70 p-7 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_16px_42px_rgba(8,145,178,0.22)]">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/15">
                <FileText className="h-5 w-5 text-cyan-300" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">
                {t("features.card1.title")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-300">
                {t("features.card1.description")}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                {t("features.card1.link")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="hero-fade-up hero-delay-2 rounded-2xl border border-indigo-300/25 bg-slate-800/70 p-7 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-300/45 hover:shadow-[0_16px_42px_rgba(99,102,241,0.22)]">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-300/15">
                <TrendingUp className="h-5 w-5 text-indigo-300" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">
                {t("features.card2.title")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-300">
                {t("features.card2.description")}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
              >
                {t("features.card2.link")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="hero-fade-up hero-delay-3 rounded-2xl border border-emerald-300/25 bg-slate-800/70 p-7 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300/45 hover:shadow-[0_16px_42px_rgba(16,185,129,0.2)]">
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/15">
                <Diamond className="h-5 w-5 text-emerald-300" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-white">
                {t("features.card3.title")}
              </h3>
              <p className="mb-5 text-sm leading-relaxed text-slate-300">
                {t("features.card3.description")}
              </p>
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300 hover:text-emerald-200"
              >
                {t("features.card3.link")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative overflow-hidden bg-slate-950 py-24">
        <div className="hero-orb hero-orb-right" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="hero-fade-up inline-flex items-center rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                {t("testimonials.badge")}
              </span>
              <h2 className="hero-fade-up hero-delay-1 mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
                {t("testimonials.titleLine1")}{" "}
                <span className="hero-gradient-text block">
                  {t("testimonials.titleLine2")}
                </span>
              </h2>
            </div>
            <p className="hero-fade-up hero-delay-2 max-w-xl text-sm leading-relaxed text-slate-300">
              {t("testimonials.description")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="hero-fade-up hero-delay-1 rounded-2xl border border-slate-700 bg-slate-900/75 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-slate-500">
              <div className="mb-4 flex gap-0.5">
                {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                  <Star
                    key={k}
                    className="h-4 w-4 fill-amber-300 text-amber-300"
                  />
                ))}
              </div>
              <p className="mb-5 text-sm leading-relaxed text-slate-200">
                {t("testimonials.quote1")}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-slate-900">
                  SJ
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("testimonials.name1")}
                  </p>
                  <p className="text-xs text-slate-400">{t("testimonials.role1")}</p>
                </div>
              </div>
            </div>

            <div className="hero-fade-up hero-delay-2 rounded-2xl border border-slate-700 bg-slate-900/75 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-slate-500">
              <div className="mb-4 flex gap-0.5">
                {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                  <Star
                    key={k}
                    className="h-4 w-4 fill-amber-300 text-amber-300"
                  />
                ))}
              </div>
              <p className="mb-5 text-sm leading-relaxed text-slate-200">
                {t("testimonials.quote2")}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-300 text-xs font-bold text-slate-900">
                  MC
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("testimonials.name2")}
                  </p>
                  <p className="text-xs text-slate-400">{t("testimonials.role2")}</p>
                </div>
              </div>
            </div>

            <div className="hero-fade-up hero-delay-3 rounded-2xl border border-slate-700 bg-slate-900/75 p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-slate-500">
              <div className="mb-4 flex gap-0.5">
                {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                  <Star
                    key={k}
                    className="h-4 w-4 fill-amber-300 text-amber-300"
                  />
                ))}
              </div>
              <p className="mb-5 text-sm leading-relaxed text-slate-200">
                {t("testimonials.quote3")}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-slate-900">
                  AL
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {t("testimonials.name3")}
                  </p>
                  <p className="text-xs text-slate-400">{t("testimonials.role3")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-slate-900 px-4 py-18">
        <div className="hero-grid absolute inset-0 opacity-20" />

        <div className="relative mx-auto max-w-5xl rounded-3xl border border-cyan-300/25 bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-14 text-center shadow-[0_24px_60px_rgba(2,132,199,0.2)] sm:px-12">
          <div className="hero-fade-up inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("cta.badge")}
          </div>
          <h2 className="hero-fade-up hero-delay-1 mx-auto mt-5 max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
            {t("cta.titleLine1")}{" "}
            <span className="hero-gradient-text block">{t("cta.titleLine2")}</span>
          </h2>
          <p className="hero-fade-up hero-delay-2 mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            {t("cta.description")}
          </p>

          <div className="hero-fade-up hero-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button className="group rounded-full bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.35)] transition hover:-translate-y-px hover:bg-cyan-300">
                {t("cta.getStarted")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button
                variant="outline"
                className="rounded-full border-slate-500 bg-slate-800/70 px-7 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                {t("cta.browseJobs")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
