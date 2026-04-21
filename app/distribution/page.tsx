"use client";

import { useState } from "react";
import {
  Rocket,
  RefreshCw,
  Loader2,
  Trophy,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Megaphone,
  Handshake,
  Zap,
  Target,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { DistributionStrategy } from "@/lib/generators";

type BudgetTier = "micro" | "indie" | "mid" | "studio";

function fitBadgeStyle(fit: string | undefined) {
  const f = (fit || "").toLowerCase();
  if (f.includes("must")) return "bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40";
  if (f.includes("strong")) return "bg-[#7AE2CF]/15 text-[#7AE2CF] border-[#7AE2CF]/40";
  if (f.includes("reach")) return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-[#6E8B8D]/10 text-[#A8BFC1] border-[#6E8B8D]/30";
}

function tierBadgeStyle(tier: string | undefined) {
  const t = (tier || "").toLowerCase();
  if (t.includes("a-list")) return "bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/30";
  if (t.includes("genre")) return "bg-purple-500/15 text-purple-300 border-purple-400/30";
  if (t.includes("shorts")) return "bg-blue-500/15 text-blue-300 border-blue-400/30";
  if (t.includes("specialty")) return "bg-[#7AE2CF]/10 text-[#7AE2CF] border-[#7AE2CF]/30";
  return "bg-[#6E8B8D]/10 text-[#A8BFC1] border-[#6E8B8D]/30";
}

export default function DistributionPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("indie");
  const [expandedPhase, setExpandedPhase] = useState<Record<string, boolean>>({});

  const hasMinimum = !!(filmPackage?.logline || filmPackage?.synopsis);
  const dist = filmPackage?.distribution;

  const handleGenerate = async () => {
    if (!hasMinimum) {
      toast.error("Generate a logline or synopsis first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/distribution", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: filmPackage?.idea,
          logline: filmPackage?.logline,
          synopsis: filmPackage?.synopsis,
          genre: filmPackage?.genre,
          length: filmPackage?.length,
          themes: filmPackage?.themes,
          budgetTier,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.distribution) {
        toast.error(data?.error || "Distribution strategy generation failed.");
        return;
      }
      updateFilmPackage({ distribution: data.distribution as DistributionStrategy });
      toast.success("Distribution strategy ready");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!dist) {
    return (
      <EmptyState
        icon={Rocket}
        title="Distribution Strategy"
        subtitle="Festival circuit, sales reps, and buyer pitches"
        emptyTitle="No distribution strategy yet"
        emptyDescription="Generate a current, actionable festival and distribution plan: tier assessment, named festival targets with submission windows, distribution pathways, platform-specific pitch angles, PR roadmap, and a sales agent shortlist."
        needsPrerequisite={!hasMinimum}
        prerequisiteMessage="Generate at least a logline and synopsis on the Create tab before building a distribution strategy."
        actionLabel="Generate Distribution Plan"
        actionLoadingLabel="Mapping the circuit..."
        onAction={handleGenerate}
        loading={loading}
      />
    );
  }

  const togglePhase = (key: string) =>
    setExpandedPhase((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Rocket className="w-7 h-7 text-[#FF6A00]" />
                Distribution Strategy
              </h1>
              <p className="text-[#B2C8C9]">
                {filmPackage?.idea || "Untitled"}
                {filmPackage?.genre ? ` · ${filmPackage.genre}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <BudgetTierPicker value={budgetTier} onChange={setBudgetTier} />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Remapping...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Positioning + Tier Assessment */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Card className="glass-effect border-[#FF6A00]/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-xs uppercase tracking-wider text-[#FF6A00] font-semibold">
                  Market Positioning
                </span>
              </div>
              <p className="text-sm text-[#D4DEE0] leading-relaxed">
                {dist.positioning}
              </p>
            </Card>
            <Card className="glass-effect border-[#FF6A00]/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-[#FF6A00]" />
                <span className="text-xs uppercase tracking-wider text-[#FF6A00] font-semibold">
                  Tier Assessment
                </span>
              </div>
              <p className="text-sm text-[#D4DEE0] leading-relaxed">
                {dist.tierAssessment}
              </p>
            </Card>
          </div>

          {/* Quick Wins */}
          {dist.quickWins && dist.quickWins.length > 0 && (
            <Card className="glass-effect border-[#7AE2CF]/30 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#7AE2CF]" />
                <span className="text-xs uppercase tracking-wider text-[#7AE2CF] font-semibold">
                  Quick Wins (Do These Now)
                </span>
              </div>
              <ol className="space-y-2 text-sm text-[#D4DEE0]">
                {dist.quickWins.map((w, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-[#7AE2CF] font-bold shrink-0">
                      {i + 1}.
                    </span>
                    <span className="leading-relaxed">{w}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* Festivals */}
          <SectionHeader
            Icon={Trophy}
            title="Festival Targets"
            count={dist.festivals.length}
          />
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {dist.festivals.map((f, i) => (
              <Card
                key={i}
                className="glass-effect border-[#FF6A00]/20 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-base mb-0.5 leading-tight">
                      {f.name}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-[#B2C8C9]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{f.location}</span>
                    </div>
                  </div>
                  <Badge className={`${fitBadgeStyle(f.fitScore)} border text-[10px] whitespace-nowrap shrink-0`}>
                    {f.fitScore}
                  </Badge>
                </div>

                <Badge
                  className={`${tierBadgeStyle(f.tier)} border text-[10px] mb-3`}
                >
                  {f.tier}
                </Badge>

                <p className="text-xs text-[#D4DEE0] leading-relaxed mb-3 italic">
                  {f.fitReasoning}
                </p>

                <div className="space-y-1.5 text-[11px] text-[#B2C8C9] border-t border-[#FF6A00]/10 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-[#FF6A00] shrink-0" />
                    <span className="text-[#6E8B8D]">Submit:</span>
                    <span className="text-[#D4DEE0]">{f.submissionWindow}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#FF6A00] shrink-0" />
                    <span className="text-[#6E8B8D]">Notifies:</span>
                    <span className="text-[#D4DEE0]">{f.notificationDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-[#FF6A00] shrink-0" />
                    <span className="text-[#6E8B8D]">Festival:</span>
                    <span className="text-[#D4DEE0]">{f.festivalDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3 h-3 text-[#FF6A00] shrink-0" />
                    <span className="text-[#6E8B8D]">Fee:</span>
                    <span className="text-[#D4DEE0]">{f.fee}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Submission Timeline */}
          <SectionHeader Icon={Calendar} title="Submission Timeline" />
          <div className="space-y-3 mb-8">
            {dist.submissionTimeline.map((phase, i) => {
              const key = `sub-${i}`;
              const expanded = expandedPhase[key] !== false;
              return (
                <Card key={i} className="glass-effect border-[#FF6A00]/20 overflow-hidden">
                  <button
                    onClick={() => togglePhase(key)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-[#FF6A00]/5 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white">{phase.phase}</div>
                        <div className="text-xs text-[#FF6A00] mt-0.5">{phase.window}</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#6E8B8D] shrink-0">
                      {phase.milestones.length} tasks
                    </span>
                  </button>
                  {expanded && (
                    <div className="border-t border-[#FF6A00]/10 p-4 pt-3">
                      <ul className="space-y-2 text-sm text-[#D4DEE0]">
                        {phase.milestones.map((m, mi) => (
                          <li key={mi} className="flex gap-2 items-start">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6A00] mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Distribution Pathways */}
          <SectionHeader Icon={TrendingUp} title="Distribution Pathways" />
          <div className="space-y-4 mb-8">
            {dist.distributionPathways.map((p, i) => (
              <Card
                key={i}
                className="glass-effect border-[#FF6A00]/20 p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-8 h-8 rounded bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex items-center justify-center text-[#FF6A00] font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-base leading-tight mb-1">
                      {p.pathway}
                    </h4>
                    <p className="text-sm text-[#D4DEE0] leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs mb-3">
                  <div className="bg-[#091416]/60 border border-[#7AE2CF]/20 rounded p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-[#7AE2CF] font-semibold mb-1">
                      Best For
                    </div>
                    <p className="text-[#D4DEE0] leading-relaxed">{p.bestFor}</p>
                  </div>
                  <div className="bg-[#091416]/60 border border-red-500/20 rounded p-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-1">
                      Risks
                    </div>
                    <p className="text-[#D4DEE0] leading-relaxed">{p.risks}</p>
                  </div>
                </div>
                {p.exampleFilms && p.exampleFilms.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#6E8B8D] font-semibold mb-1.5">
                      Precedents
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.exampleFilms.map((film, fi) => (
                        <Badge
                          key={fi}
                          className="bg-[#091416] text-[#A8BFC1] border border-[#FF6A00]/20 text-[10px]"
                        >
                          {film}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Platform Pitches */}
          <SectionHeader Icon={Handshake} title="Platform & Distributor Pitches" />
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {dist.platformPitches.map((pt, i) => (
              <Card key={i} className="glass-effect border-[#FF6A00]/20 p-5">
                <h4 className="font-bold text-white text-base mb-2">
                  {pt.platform}
                </h4>
                <div className="space-y-2.5 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#FF6A00] font-semibold mb-1">
                      Why
                    </div>
                    <p className="text-[#D4DEE0] leading-relaxed">{pt.why}</p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#FF6A00] font-semibold mb-1">
                      Pitch Angle
                    </div>
                    <p className="text-[#E8ECF0] italic border-l-2 border-[#FF6A00]/40 pl-2 leading-relaxed">
                      {pt.pitchAngle}
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#FF6A00] font-semibold mb-1">
                      Access
                    </div>
                    <p className="text-[#B2C8C9] text-xs leading-relaxed">
                      {pt.contactNotes}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* PR Strategy */}
          <SectionHeader Icon={Megaphone} title="PR Strategy" />
          <div className="space-y-3 mb-8">
            {dist.prStrategy.map((phase, i) => {
              const key = `pr-${i}`;
              const expanded = expandedPhase[key] !== false;
              return (
                <Card key={i} className="glass-effect border-[#FF6A00]/20 overflow-hidden">
                  <button
                    onClick={() => togglePhase(key)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-[#FF6A00]/5 transition"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#FF6A00] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white">{phase.phase}</div>
                        <div className="text-xs text-[#FF6A00] mt-0.5">{phase.window}</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#6E8B8D] shrink-0">
                      {phase.tactics.length} tactics
                    </span>
                  </button>
                  {expanded && (
                    <div className="border-t border-[#FF6A00]/10 p-4 pt-3">
                      <ul className="space-y-2 text-sm text-[#D4DEE0]">
                        {phase.tactics.map((t, ti) => (
                          <li key={ti} className="flex gap-2 items-start">
                            <span className="text-[#FF6A00] mt-0.5 shrink-0">▸</span>
                            <span className="leading-relaxed">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Sales Agents */}
          <SectionHeader Icon={Handshake} title="Sales Agent Shortlist" />
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {dist.salesAgents.map((s, i) => (
              <Card key={i} className="glass-effect border-[#FF6A00]/20 p-4">
                <h4 className="font-bold text-white text-sm mb-2">{s.name}</h4>
                <p className="text-xs text-[#D4DEE0] leading-relaxed mb-2">
                  <span className="text-[#FF6A00] font-semibold">Fit: </span>
                  {s.fit}
                </p>
                <Separator className="bg-[#FF6A00]/10 my-2" />
                <p className="text-[11px] text-[#B2C8C9] leading-relaxed italic">
                  {s.note}
                </p>
              </Card>
            ))}
          </div>

          {/* Risks */}
          {dist.risks && dist.risks.length > 0 && (
            <Card className="glass-effect border-red-500/30 p-5 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs uppercase tracking-wider text-red-400 font-semibold">
                  Strategy Risks
                </span>
              </div>
              <ul className="space-y-2 text-sm text-[#D4DEE0]">
                {dist.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span>
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  Icon,
  title,
  count,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <Icon className="w-5 h-5 text-[#FF6A00]" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {typeof count === "number" && (
        <span className="text-xs text-[#6E8B8D]">({count})</span>
      )}
    </div>
  );
}

function BudgetTierPicker({
  value,
  onChange,
}: {
  value: BudgetTier;
  onChange: (v: BudgetTier) => void;
}) {
  const options: { key: BudgetTier; label: string }[] = [
    { key: "micro", label: "Micro" },
    { key: "indie", label: "Indie" },
    { key: "mid", label: "Mid" },
    { key: "studio", label: "Studio" },
  ];
  return (
    <div className="flex items-center gap-1 border border-[#FF6A00]/20 rounded-md p-0.5 bg-[#091416]/60">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
            value === opt.key
              ? "bg-[#FF6A00] text-white"
              : "text-[#B2C8C9] hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
