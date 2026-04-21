"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Loader2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Users,
  MessageSquareQuote,
  BookOpen,
  Target,
  Lightbulb,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { ScriptCoverage } from "@/lib/generators";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: string;
  genre?: string;
  title?: string;
  logline?: string;
  coverage: ScriptCoverage | undefined;
  onCoverage: (coverage: ScriptCoverage) => void;
}

function ratingStyle(rating: string | undefined) {
  const r = (rating || "").toLowerCase();
  if (r === "recommend") {
    return {
      bg: "bg-[#7AE2CF]/15",
      text: "text-[#7AE2CF]",
      border: "border-[#7AE2CF]/40",
      Icon: CheckCircle2,
      label: "RECOMMEND",
    };
  }
  if (r === "consider") {
    return {
      bg: "bg-[#FF6A00]/15",
      text: "text-[#FF6A00]",
      border: "border-[#FF6A00]/40",
      Icon: AlertTriangle,
      label: "CONSIDER",
    };
  }
  return {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/40",
    Icon: XCircle,
    label: "PASS",
  };
}

function SectionHeader({
  Icon,
  title,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-[#FF6A00]" />
      <h3 className="text-white font-semibold">{title}</h3>
      {hint && <span className="text-xs text-[#6E8B8D]">· {hint}</span>}
    </div>
  );
}

function BulletList({
  items,
  tone = "default",
}: {
  items: string[];
  tone?: "default" | "positive" | "negative";
}) {
  if (!items || items.length === 0) {
    return <p className="text-[#6E8B8D] text-sm italic">None noted.</p>;
  }
  const color =
    tone === "positive"
      ? "text-[#7AE2CF]"
      : tone === "negative"
      ? "text-red-400"
      : "text-[#FF6A00]";
  return (
    <ul className="space-y-1.5 text-sm text-[#D4DEE0]">
      {items.map((it, idx) => (
        <li key={idx} className="flex gap-2">
          <span className={`${color} mt-0.5 shrink-0`}>•</span>
          <span className="leading-relaxed">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ActBlock({
  label,
  beatLabel,
  beat,
  summary,
  issues,
}: {
  label: string;
  beatLabel: string;
  beat: string;
  summary: string;
  issues: string[];
}) {
  return (
    <div className="bg-[#091416]/60 border border-[#FF6A00]/10 rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mb-1">{label}</div>
      <p className="text-sm text-[#D4DEE0] leading-relaxed mb-2">{summary}</p>
      {beat && (
        <div className="text-xs text-[#B2C8C9] mb-2">
          <span className="text-[#FF6A00] font-semibold">{beatLabel}:</span> {beat}
        </div>
      )}
      {issues && issues.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mt-2 mb-1">
            Issues
          </div>
          <BulletList items={issues} tone="negative" />
        </div>
      )}
    </div>
  );
}

export default function CoveragePanel({
  open,
  onOpenChange,
  script,
  genre,
  title,
  logline,
  coverage,
  onCoverage,
}: Props) {
  const [loading, setLoading] = useState(false);

  const canGenerate = useMemo(() => (script || "").trim().length >= 500, [script]);

  const verdict = ratingStyle(coverage?.overallRating);

  const generate = async () => {
    if (!canGenerate) {
      toast.error("Write or generate at least a few pages before requesting coverage.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/coverage", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, genre, title, logline }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.coverage) {
        toast.error(data?.error || "Coverage generation failed.");
        return;
      }
      onCoverage(data.coverage as ScriptCoverage);
      toast.success("Coverage ready");
    } catch (err: any) {
      toast.error(err?.message || "Coverage request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-3xl bg-[#0b1b1d] border-l border-[#FF6A00]/20 text-white overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#FF6A00]" />
            Script Coverage
          </SheetTitle>
          <SheetDescription className="text-[#B2C8C9]">
            Industry-style reader's report: logline, structure, characters, dialogue,
            marketability, and a verdict.
          </SheetDescription>
        </SheetHeader>

        {!coverage ? (
          <div className="mt-8 text-center border border-dashed border-[#FF6A00]/20 rounded-lg p-10">
            <ClipboardList className="w-10 h-10 text-[#FF6A00] mx-auto mb-3 opacity-80" />
            <h3 className="text-lg font-semibold text-white mb-1">
              No coverage yet
            </h3>
            <p className="text-[#B2C8C9] text-sm mb-6 max-w-md mx-auto">
              Generate a professional coverage report on your current draft.
              Paid reads run $75–$300 and take days. This takes about 30 seconds.
            </p>
            <Button
              onClick={generate}
              disabled={loading || !canGenerate}
              className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reading…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Coverage
                </>
              )}
            </Button>
            {!canGenerate && (
              <p className="text-xs text-[#6E8B8D] mt-3">
                Need at least a few pages of script content to read.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Verdict card */}
            <div
              className={`${verdict.bg} ${verdict.border} border rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <verdict.Icon className={`w-6 h-6 ${verdict.text} mt-0.5`} />
                <div className="flex-1">
                  <div
                    className={`text-xs uppercase tracking-wider font-bold ${verdict.text}`}
                  >
                    Overall Verdict
                  </div>
                  <div className={`text-2xl font-bold ${verdict.text} leading-tight`}>
                    {verdict.label}
                  </div>
                  <p className="text-sm text-[#D4DEE0] mt-2 leading-relaxed">
                    {coverage.overallNotes}
                  </p>
                </div>
              </div>
            </div>

            {/* Top strengths / weaknesses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-[#091416]/60 border border-[#7AE2CF]/20 rounded-lg p-4">
                <SectionHeader Icon={CheckCircle2} title="Strengths" />
                <BulletList items={coverage.strengths} tone="positive" />
              </div>
              <div className="bg-[#091416]/60 border border-red-500/20 rounded-lg p-4">
                <SectionHeader Icon={AlertTriangle} title="Weaknesses" />
                <BulletList items={coverage.weaknesses} tone="negative" />
              </div>
            </div>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Logline */}
            <section>
              <SectionHeader
                Icon={Target}
                title="Logline"
                hint={`Score ${coverage.loglineAssessment?.score ?? "—"}/10`}
              />
              <p className="italic text-[#E8ECF0] border-l-2 border-[#FF6A00]/40 pl-3 py-1 mb-3">
                {coverage.logline}
              </p>
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mb-1">
                    What works
                  </div>
                  <BulletList items={coverage.loglineAssessment?.strengths || []} tone="positive" />
                </div>
                <div>
                  <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mb-1">
                    What doesn't
                  </div>
                  <BulletList items={coverage.loglineAssessment?.weaknesses || []} tone="negative" />
                </div>
              </div>
              {coverage.loglineAssessment?.rewrites?.length > 0 && (
                <div>
                  <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mb-1">
                    Suggested rewrites
                  </div>
                  <ol className="space-y-2 text-sm text-[#D4DEE0]">
                    {coverage.loglineAssessment.rewrites.map((r, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[#FF6A00]/30 pl-3 py-0.5 italic"
                      >
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Synopsis */}
            <section>
              <SectionHeader Icon={BookOpen} title="Synopsis" />
              <p className="text-sm text-[#D4DEE0] leading-relaxed whitespace-pre-wrap">
                {coverage.synopsis}
              </p>
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Structure */}
            <section>
              <SectionHeader
                Icon={TrendingUp}
                title="Structure"
                hint={coverage.structureAnalysis?.overall}
              />
              <p className="text-sm text-[#B2C8C9] mb-3 leading-relaxed">
                {coverage.structureAnalysis?.notes}
              </p>
              <div className="space-y-3">
                <ActBlock
                  label="Act I"
                  beatLabel="Inciting Incident"
                  beat={coverage.structureAnalysis?.act1?.incitingIncident}
                  summary={coverage.structureAnalysis?.act1?.summary}
                  issues={coverage.structureAnalysis?.act1?.issues || []}
                />
                <ActBlock
                  label="Act II"
                  beatLabel="Midpoint Reversal"
                  beat={coverage.structureAnalysis?.act2?.midpointReversal}
                  summary={coverage.structureAnalysis?.act2?.summary}
                  issues={coverage.structureAnalysis?.act2?.issues || []}
                />
                <ActBlock
                  label="Act III"
                  beatLabel="Climax"
                  beat={coverage.structureAnalysis?.act3?.climax}
                  summary={coverage.structureAnalysis?.act3?.summary}
                  issues={coverage.structureAnalysis?.act3?.issues || []}
                />
              </div>
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Characters */}
            <section>
              <SectionHeader Icon={Users} title="Characters" />
              <div className="space-y-3">
                <div className="bg-[#091416]/60 border border-[#FF6A00]/10 rounded-lg p-3">
                  <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mb-1">
                    Protagonist — {coverage.characterAnalysis?.protagonist?.name}
                  </div>
                  <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-[#D4DEE0] mb-2">
                    <div>
                      <span className="text-[#FF6A00] font-semibold">Goal: </span>
                      {coverage.characterAnalysis?.protagonist?.goal}
                    </div>
                    <div>
                      <span className="text-[#FF6A00] font-semibold">Flaw: </span>
                      {coverage.characterAnalysis?.protagonist?.flaw}
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-[#FF6A00] font-semibold">Arc: </span>
                      {coverage.characterAnalysis?.protagonist?.arc}
                    </div>
                  </div>
                  <p className="text-xs text-[#B2C8C9] leading-relaxed">
                    {coverage.characterAnalysis?.protagonist?.notes}
                  </p>
                </div>

                {coverage.characterAnalysis?.antagonist && (
                  <div className="bg-[#091416]/60 border border-[#FF6A00]/10 rounded-lg p-3">
                    <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mb-1">
                      Antagonist — {coverage.characterAnalysis.antagonist.name}
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-4 gap-y-1 text-sm text-[#D4DEE0] mb-2">
                      <div>
                        <span className="text-[#FF6A00] font-semibold">Opposition: </span>
                        {coverage.characterAnalysis.antagonist.opposition}
                      </div>
                      <div>
                        <span className="text-[#FF6A00] font-semibold">Motivation: </span>
                        {coverage.characterAnalysis.antagonist.motivation}
                      </div>
                    </div>
                    <p className="text-xs text-[#B2C8C9] leading-relaxed">
                      {coverage.characterAnalysis.antagonist.notes}
                    </p>
                  </div>
                )}

                {coverage.characterAnalysis?.supporting &&
                  coverage.characterAnalysis.supporting.length > 0 && (
                    <div className="bg-[#091416]/60 border border-[#FF6A00]/10 rounded-lg p-3">
                      <div className="text-[11px] uppercase tracking-wider text-[#6E8B8D] mb-2">
                        Supporting
                      </div>
                      <ul className="space-y-2 text-sm text-[#D4DEE0]">
                        {coverage.characterAnalysis.supporting.map((c, i) => (
                          <li key={i}>
                            <span className="text-white font-semibold">{c.name}</span>
                            <span className="text-[#B2C8C9]"> · {c.function}</span>
                            {c.notes && (
                              <p className="text-xs text-[#B2C8C9] mt-0.5">{c.notes}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {coverage.characterAnalysis?.notes && (
                  <p className="text-sm text-[#B2C8C9] leading-relaxed italic">
                    {coverage.characterAnalysis.notes}
                  </p>
                )}
              </div>
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Dialogue */}
            <section>
              <SectionHeader
                Icon={MessageSquareQuote}
                title="Dialogue"
                hint={coverage.dialogueAssessment?.rating}
              />
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mb-1">
                    Strengths
                  </div>
                  <BulletList items={coverage.dialogueAssessment?.strengths || []} tone="positive" />
                </div>
                <div>
                  <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mb-1">
                    Weaknesses
                  </div>
                  <BulletList items={coverage.dialogueAssessment?.weaknesses || []} tone="negative" />
                </div>
              </div>
              {coverage.dialogueAssessment?.examples &&
                coverage.dialogueAssessment.examples.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {coverage.dialogueAssessment.examples.map((ex, i) => {
                      const isStrong = /^strong:/i.test(ex);
                      const isWeak = /^weak:/i.test(ex);
                      const cleaned = ex.replace(/^(strong|weak):\s*/i, "");
                      return (
                        <li
                          key={i}
                          className={`border-l-2 pl-3 py-1 italic ${
                            isStrong
                              ? "border-[#7AE2CF] text-[#7AE2CF]"
                              : isWeak
                              ? "border-red-400 text-red-300"
                              : "border-[#FF6A00] text-[#D4DEE0]"
                          }`}
                        >
                          {cleaned}
                        </li>
                      );
                    })}
                  </ul>
                )}
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Themes */}
            {coverage.themes && coverage.themes.length > 0 && (
              <section>
                <SectionHeader Icon={Star} title="Themes" />
                <div className="flex flex-wrap gap-2">
                  {coverage.themes.map((t, i) => (
                    <Badge
                      key={i}
                      className="bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/30"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Marketability */}
            <section>
              <SectionHeader
                Icon={TrendingUp}
                title="Marketability"
                hint={coverage.marketability?.commercialViability}
              />
              <div className="space-y-2 text-sm text-[#D4DEE0]">
                <div>
                  <span className="text-[#FF6A00] font-semibold">Audience: </span>
                  {coverage.marketability?.audienceAppeal}
                </div>
                <p className="text-[#B2C8C9] leading-relaxed">
                  {coverage.marketability?.notes}
                </p>
                {coverage.comparables && coverage.comparables.length > 0 && (
                  <div>
                    <div className="text-xs text-[#6E8B8D] uppercase tracking-wider mt-2 mb-1">
                      Comparables
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {coverage.comparables.map((c, i) => (
                        <Badge
                          key={i}
                          className="bg-[#0b1b1d] text-[#A8BFC1] border border-[#FF6A00]/20"
                        >
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <Separator className="bg-[#FF6A00]/10" />

            {/* Improvement notes */}
            <section>
              <SectionHeader Icon={Lightbulb} title="Next Draft — Priorities" />
              {coverage.improvementNotes && coverage.improvementNotes.length > 0 ? (
                <ol className="space-y-2 text-sm text-[#D4DEE0]">
                  {coverage.improvementNotes.map((n, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-[#FF6A00] font-bold shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{n}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[#6E8B8D] text-sm italic">None noted.</p>
              )}
            </section>

            <div className="flex justify-end pt-2">
              <Button
                onClick={generate}
                disabled={loading}
                variant="outline"
                className="border-[#FF6A00]/30 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Re-reading…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Coverage
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
