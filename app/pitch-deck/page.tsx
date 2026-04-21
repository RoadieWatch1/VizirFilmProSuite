"use client";

import { useMemo, useState } from "react";
import dynamicImport from "next/dynamic";
import {
  BookOpen,
  Download,
  RefreshCw,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Quote,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { DirectorStatement } from "@/lib/generators";

// @react-pdf/renderer is client-only; avoid SSR entirely.
const PDFDownloadLink = dynamicImport(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false },
) as any;

const PitchDeckDocument = dynamicImport(
  () => import("@/components/PitchDeckDocument"),
  { ssr: false },
) as any;

function pkgReadiness(pkg: any) {
  return {
    logline: !!pkg?.logline,
    synopsis: !!pkg?.synopsis,
    characters: Array.isArray(pkg?.characters) && pkg.characters.length > 0,
    storyboard: Array.isArray(pkg?.storyboard) && pkg.storyboard.length > 0,
    budget: Array.isArray(pkg?.budget) && pkg.budget.length > 0,
    concept: !!pkg?.concept,
    directorStatement: !!pkg?.directorStatement?.statement,
  };
}

export default function PitchDeckPage() {
  const { filmPackage, updateFilmPackage } = useFilmStore();
  const [generating, setGenerating] = useState(false);

  const ready = pkgReadiness(filmPackage);
  const minimumReady = ready.logline || ready.synopsis;

  const fileName = useMemo(() => {
    const base = (filmPackage?.idea || "pitch-deck")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "pitch-deck";
    return `${base}-pitch-deck.pdf`;
  }, [filmPackage?.idea]);

  const dateString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const handleGenerateStatement = async () => {
    if (!minimumReady) {
      toast.error("Generate a logline or synopsis first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/pitch-deck", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: filmPackage?.script,
          logline: filmPackage?.logline,
          synopsis: filmPackage?.synopsis,
          genre: filmPackage?.genre,
          themes: filmPackage?.themes,
          title: filmPackage?.idea,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.directorStatement) {
        toast.error(data?.error || "Director statement generation failed.");
        return;
      }
      updateFilmPackage({ directorStatement: data.directorStatement as DirectorStatement });
      toast.success("Director's statement generated");
    } catch (err: any) {
      toast.error(err?.message || "Request failed");
    } finally {
      setGenerating(false);
    }
  };

  if (!filmPackage || !minimumReady) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Pitch Deck"
        subtitle="A producer-ready deck for financiers, reps, and festivals"
        emptyTitle="No pitch deck yet"
        emptyDescription="Generate a professional pitch deck PDF from your film package: cover, logline, synopsis, visual concept, characters, storyboard, budget, and director's statement. Built for A24, Neon, Plan B, Black List submissions."
        needsPrerequisite={!minimumReady}
        prerequisiteMessage="Generate at least a logline and synopsis on the Create tab before building a pitch deck."
        actionLabel="Generate Director's Statement"
        actionLoadingLabel="Writing..."
        onAction={handleGenerateStatement}
        loading={generating}
      />
    );
  }

  const statement = filmPackage.directorStatement;

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-[#FF6A00]" />
                Pitch Deck
              </h1>
              <p className="text-[#B2C8C9]">
                {filmPackage.idea || "Untitled"}
                {filmPackage.genre ? ` · ${filmPackage.genre}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleGenerateStatement}
                disabled={generating}
                variant="outline"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Writing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {statement ? "Rewrite Statement" : "Generate Statement"}
                  </>
                )}
              </Button>

              <PDFDownloadLink
                document={<PitchDeckDocument pkg={filmPackage} dateString={dateString} />}
                fileName={fileName}
              >
                {({ loading, error }: { loading: boolean; error: any }) => (
                  <Button
                    disabled={loading || !!error}
                    className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Rendering...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          </div>

          {/* Readiness Checklist */}
          <Card className="glass-effect border-[#FF6A00]/20 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#FF6A00]" />
              <h3 className="text-white font-semibold">Deck Composition</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <ReadyChip label="Logline" ok={ready.logline} />
              <ReadyChip label="Synopsis" ok={ready.synopsis} />
              <ReadyChip label="Visual Concept" ok={ready.concept} />
              <ReadyChip label="Characters" ok={ready.characters} />
              <ReadyChip label="Storyboard" ok={ready.storyboard} />
              <ReadyChip label="Budget" ok={ready.budget} />
              <ReadyChip
                label="Director's Statement"
                ok={ready.directorStatement}
              />
            </div>
            {!ready.directorStatement && (
              <p className="text-xs text-[#6E8B8D] mt-4 italic">
                The director's statement is the strongest close on a deck. Generate one
                before downloading.
              </p>
            )}
          </Card>

          {/* Director's Statement Preview */}
          {statement && (
            <Card className="glass-effect border-[#FF6A00]/20 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[#FF6A00]" />
                <h3 className="text-white font-semibold text-lg">Director's Statement</h3>
              </div>

              {statement.tonalReference && (
                <p className="italic text-[#E8ECF0] border-l-2 border-[#FF6A00]/40 pl-3 py-1 mb-4">
                  {statement.tonalReference}
                </p>
              )}

              {statement.statement.split(/\n\n+/).map((p, i) => (
                <p
                  key={i}
                  className="text-[#D4DEE0] leading-relaxed mb-3 text-sm"
                >
                  {p.trim()}
                </p>
              ))}

              <Separator className="bg-[#FF6A00]/10 my-4" />

              {statement.visualApproach && (
                <div className="mb-3">
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    Visual Approach
                  </div>
                  <p className="text-[#B2C8C9] text-sm leading-relaxed">
                    {statement.visualApproach}
                  </p>
                </div>
              )}

              {statement.personalConnection && (
                <div>
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    Why This Filmmaker
                  </div>
                  <p className="text-[#B2C8C9] text-sm leading-relaxed">
                    {statement.personalConnection}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Meta snapshot */}
          <Card className="glass-effect border-[#FF6A00]/20 p-6">
            <h3 className="text-white font-semibold mb-4">Snapshot</h3>
            <div className="space-y-3 text-sm">
              {filmPackage.logline && (
                <div>
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    Logline
                  </div>
                  <p className="text-[#E8ECF0] italic leading-relaxed">
                    {filmPackage.logline}
                  </p>
                </div>
              )}
              {filmPackage.themes && filmPackage.themes.length > 0 && (
                <div>
                  <div className="text-xs text-[#FF6A00] uppercase tracking-wider font-semibold mb-1">
                    Themes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filmPackage.themes.map((t, i) => (
                      <Badge
                        key={i}
                        className="bg-[#FF6A00]/10 text-[#FF6A00] border border-[#FF6A00]/30"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReadyChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${
        ok
          ? "bg-[#7AE2CF]/10 border-[#7AE2CF]/30 text-[#7AE2CF]"
          : "bg-[#6E8B8D]/10 border-[#6E8B8D]/20 text-[#6E8B8D]"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}
