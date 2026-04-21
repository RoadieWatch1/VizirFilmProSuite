"use client";

import { useMemo, useState } from "react";
import {
  Camera,
  Download,
  RefreshCw,
  Loader2,
  Film,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { useFilmStore } from "@/lib/store";
import type { Shot, ShotList, ShotListScene } from "@/lib/generators";

function priorityStyle(p: string | undefined) {
  switch ((p || "").toLowerCase()) {
    case "must-have":
      return "bg-[#FF6A00]/15 text-[#FF6A00] border-[#FF6A00]/30";
    case "nice-to-have":
      return "bg-[#7AE2CF]/15 text-[#7AE2CF] border-[#7AE2CF]/30";
    case "coverage":
    default:
      return "bg-[#6E8B8D]/15 text-[#A8BFC1] border-[#6E8B8D]/30";
  }
}

function csvCell(value: string | number | undefined): string {
  const s = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function shotListToCsv(list: ShotList): string {
  const header = [
    "Scene #",
    "Shot #",
    "Slugline",
    "Shot Size",
    "Angle",
    "Movement",
    "Lens",
    "Subject",
    "Action",
    "Dialogue Cue",
    "Duration",
    "Equipment",
    "Priority",
    "Notes",
  ];
  const rows: string[] = [header.map(csvCell).join(",")];
  for (const scene of list.scenes || []) {
    for (const shot of scene.shots || []) {
      rows.push(
        [
          shot.sceneNumber || scene.sceneNumber,
          shot.shotNumber,
          shot.slugline || scene.slugline,
          shot.shotSize,
          shot.angle,
          shot.movement,
          shot.lens,
          shot.subject,
          shot.action,
          shot.dialogueCue,
          shot.duration,
          shot.equipment,
          shot.priority,
          shot.notes,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return rows.join("\r\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ShotListPage() {
  const { filmPackage, updateFilmPackage, lowBudgetMode } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const shotList = filmPackage?.shotList;
  const hasScript = !!(filmPackage?.script && filmPackage.script.trim().length > 400);

  const stats = useMemo(() => {
    if (!shotList) return null;
    const allShots: Shot[] = (shotList.scenes || []).flatMap((s) => s.shots || []);
    const totalDuration = allShots.reduce((sum, s) => {
      const m = /(\d+(?:\.\d+)?)/.exec(s.duration || "");
      return sum + (m ? parseFloat(m[1]) : 0);
    }, 0);
    const byPriority = allShots.reduce<Record<string, number>>((acc, s) => {
      const key = (s.priority || "Coverage").toString();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return {
      totalShots: allShots.length,
      totalScenes: shotList.scenes?.length || 0,
      totalSeconds: Math.round(totalDuration),
      byPriority,
    };
  }, [shotList]);

  const handleGenerate = async () => {
    if (!filmPackage?.script) {
      toast.error("Generate or write a script first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shotlist", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: filmPackage.script,
          genre: filmPackage.genre,
          title: filmPackage.idea,
          storyboard: filmPackage.storyboard,
          lowBudget: lowBudgetMode,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {}
      if (!res.ok || !data?.shotList) {
        toast.error(data?.error || "Shot list generation failed.");
        return;
      }
      updateFilmPackage({ shotList: data.shotList as ShotList });
      toast.success("Shot list generated");
    } catch (err: any) {
      toast.error(err?.message || "Shot list request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!shotList) return;
    const title = (filmPackage?.idea || "shot-list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "shot-list";
    downloadCsv(`${title}-shot-list.csv`, shotListToCsv(shotList));
    toast.success("CSV downloaded");
  };

  const toggleScene = (sceneNumber: string) => {
    setExpanded((prev) => ({ ...prev, [sceneNumber]: !prev[sceneNumber] }));
  };

  if (!shotList) {
    return (
      <EmptyState
        icon={Camera}
        title="Shot List"
        subtitle="Scene-by-scene professional shot breakdown"
        emptyTitle="No shot list yet"
        emptyDescription="Generate a production-ready shot list from your script: shot size, angle, movement, lens, equipment, and priority for every scene. Export as CSV for StudioBinder, Celtx, or your AD."
        needsPrerequisite={!hasScript}
        prerequisiteMessage="Write or generate at least a few pages of script on the Script tab before building a shot list."
        actionLabel="Generate Shot List"
        actionLoadingLabel="Breaking down scenes..."
        onAction={handleGenerate}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Camera className="w-7 h-7 text-[#FF6A00]" />
                Shot List
              </h1>
              <p className="text-[#B2C8C9]">
                {shotList.title || filmPackage?.idea || "Untitled"}
                {shotList.genre ? ` · ${shotList.genre}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button
                onClick={handleExportCsv}
                variant="outline"
                className="border-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00] hover:text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
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

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {stats.totalShots}
                </div>
                <div className="text-sm text-[#B2C8C9]">Total Shots</div>
              </Card>
              <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {stats.totalScenes}
                </div>
                <div className="text-sm text-[#B2C8C9]">Scenes</div>
              </Card>
              <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {Math.floor(stats.totalSeconds / 60)}:
                  {String(stats.totalSeconds % 60).padStart(2, "0")}
                </div>
                <div className="text-sm text-[#B2C8C9]">Est. Runtime</div>
              </Card>
              <Card className="glass-effect border-[#FF6A00]/20 p-4 text-center">
                <div className="text-2xl font-bold text-[#FF6A00]">
                  {stats.byPriority["Must-Have"] || 0}
                </div>
                <div className="text-sm text-[#B2C8C9]">Must-Haves</div>
              </Card>
            </div>
          )}

          {shotList.notes && (
            <Card className="glass-effect border-[#FF6A00]/20 p-4 mb-6">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#6E8B8D] mb-1">
                    Production Notes
                  </div>
                  <p className="text-sm text-[#D4DEE0] leading-relaxed">
                    {shotList.notes}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Scenes */}
          <div className="space-y-4">
            {(shotList.scenes || []).map((scene) => (
              <SceneBlock
                key={scene.sceneNumber}
                scene={scene}
                expanded={expanded[scene.sceneNumber] !== false}
                onToggle={() => toggleScene(scene.sceneNumber)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneBlock({
  scene,
  expanded,
  onToggle,
}: {
  scene: ShotListScene;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="glass-effect border-[#FF6A00]/20 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-[#FF6A00]/5 transition"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#FF6A00] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#FF6A00] shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                Scene {scene.sceneNumber}
              </Badge>
              <span className="font-semibold text-white truncate">
                {scene.slugline}
              </span>
              {scene.dayNight && (
                <Badge className="bg-[#091416] text-[#A8BFC1] border border-[#6E8B8D]/30">
                  {scene.dayNight}
                </Badge>
              )}
            </div>
            {scene.summary && (
              <p className="text-sm text-[#B2C8C9] mt-1 leading-relaxed line-clamp-1">
                {scene.summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {scene.estimatedMinutes !== undefined && (
            <span className="flex items-center gap-1 text-xs text-[#6E8B8D]">
              <Clock className="w-3 h-3" />
              {scene.estimatedMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-[#6E8B8D]">
            <Film className="w-3 h-3" />
            {scene.shots?.length || 0} shots
          </span>
        </div>
      </button>

      {expanded && scene.shots && scene.shots.length > 0 && (
        <div className="border-t border-[#FF6A00]/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#091416]/80">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#6E8B8D]">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Size</th>
                <th className="px-3 py-2 font-semibold">Angle</th>
                <th className="px-3 py-2 font-semibold">Movement</th>
                <th className="px-3 py-2 font-semibold">Lens</th>
                <th className="px-3 py-2 font-semibold min-w-[220px]">Action</th>
                <th className="px-3 py-2 font-semibold">Equipment</th>
                <th className="px-3 py-2 font-semibold">Dur.</th>
                <th className="px-3 py-2 font-semibold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {scene.shots.map((shot, idx) => (
                <tr
                  key={`${scene.sceneNumber}-${shot.shotNumber}-${idx}`}
                  className="border-t border-[#FF6A00]/5 hover:bg-[#FF6A00]/5"
                >
                  <td className="px-3 py-3 text-[#FF6A00] font-semibold align-top">
                    {scene.sceneNumber}.{shot.shotNumber}
                  </td>
                  <td className="px-3 py-3 text-white align-top whitespace-nowrap">
                    {shot.shotSize}
                  </td>
                  <td className="px-3 py-3 text-[#D4DEE0] align-top whitespace-nowrap">
                    {shot.angle}
                  </td>
                  <td className="px-3 py-3 text-[#D4DEE0] align-top whitespace-nowrap">
                    {shot.movement}
                  </td>
                  <td className="px-3 py-3 text-[#B2C8C9] align-top whitespace-nowrap">
                    {shot.lens}
                  </td>
                  <td className="px-3 py-3 text-[#D4DEE0] align-top">
                    <div className="leading-snug">
                      <span className="text-white font-semibold">{shot.subject}</span>
                      {shot.subject && shot.action ? " — " : ""}
                      {shot.action}
                    </div>
                    {shot.dialogueCue && (
                      <div className="mt-1 text-xs italic text-[#7AE2CF]">
                        "{shot.dialogueCue}"
                      </div>
                    )}
                    {shot.notes && (
                      <div className="mt-1 text-xs text-[#6E8B8D]">{shot.notes}</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[#B2C8C9] align-top">
                    {shot.equipment}
                  </td>
                  <td className="px-3 py-3 text-[#B2C8C9] align-top whitespace-nowrap">
                    {shot.duration}
                  </td>
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <Badge
                      className={`${priorityStyle(shot.priority)} border text-[11px]`}
                    >
                      {shot.priority || "Coverage"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
