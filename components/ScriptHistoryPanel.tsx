"use client";

import { useEffect, useMemo, useState } from "react";
import {
  History,
  Loader2,
  RotateCcw,
  Eye,
  GitCompareArrows,
  Trash2,
  X,
  Sparkles,
  Save,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ScriptVersion,
  VersionTrigger,
  deleteVersion,
  listVersions,
} from "@/lib/versionsRepo";
import { diffLines, diffStats } from "@/lib/lineDiff";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string | null;
  projectId: string | null;
  currentScript: string;
  onRestore: (content: string) => void;
}

type ViewMode = "list" | "preview" | "diff";

function formatRelative(ms?: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleString();
}

function triggerMeta(trigger: VersionTrigger) {
  switch (trigger) {
    case "generate":
      return { label: "Generated", icon: Sparkles, color: "text-[#FF6A00]" };
    case "manual":
      return { label: "Manual save", icon: Save, color: "text-[#7AE2CF]" };
    case "restore":
      return { label: "Restored", icon: RotateCcw, color: "text-[#A8BFC1]" };
    case "autosave":
    default:
      return { label: "Autosave", icon: Clock, color: "text-[#6E8B8D]" };
  }
}

export default function ScriptHistoryPanel({
  open,
  onOpenChange,
  uid,
  projectId,
  currentScript,
  onRestore,
}: Props) {
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<ScriptVersion | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canLoad = Boolean(uid && projectId);

  useEffect(() => {
    if (!open || !canLoad) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const items = await listVersions(uid!, projectId!);
        if (!cancelled) setVersions(items);
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canLoad, uid, projectId]);

  useEffect(() => {
    if (!open) {
      setMode("list");
      setSelected(null);
    }
  }, [open]);

  const diffOps = useMemo(() => {
    if (mode !== "diff" || !selected) return null;
    return diffLines(selected.content, currentScript);
  }, [mode, selected, currentScript]);

  const stats = useMemo(() => (diffOps ? diffStats(diffOps) : null), [diffOps]);

  const handleRestore = () => {
    if (!selected) return;
    onRestore(selected.content);
    setConfirmRestore(false);
    onOpenChange(false);
    toast.success("Version restored — click Save to keep it.");
  };

  const handleDelete = async () => {
    if (!uid || !projectId || !deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    try {
      await deleteVersion(uid, projectId, id);
      setVersions((prev) => prev.filter((v) => v.id !== id));
      if (selected?.id === id) {
        setSelected(null);
        setMode("list");
      }
      toast.success("Version deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete version");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl bg-[#0b1b1d] border-l border-[#FF6A00]/20 text-white overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#FF6A00]" />
              Version History
            </SheetTitle>
            <SheetDescription className="text-[#B2C8C9]">
              Every generation, save, and autosave is kept. Restore any version to the editor.
            </SheetDescription>
          </SheetHeader>

          {!canLoad ? (
            <div className="mt-6 text-center text-[#B2C8C9] py-12 border border-dashed border-[#FF6A00]/20 rounded-lg">
              Sign in and open a project to use version history.
            </div>
          ) : loading ? (
            <div className="mt-8 flex items-center justify-center text-[#B2C8C9]">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading history…
            </div>
          ) : versions.length === 0 ? (
            <div className="mt-6 text-center text-[#B2C8C9] py-12 border border-dashed border-[#FF6A00]/20 rounded-lg">
              No versions yet. Generate or save the script to start tracking history.
            </div>
          ) : mode === "list" ? (
            <ul className="mt-4 divide-y divide-[#FF6A00]/10">
              {versions.map((v) => {
                const { label, icon: Icon, color } = triggerMeta(v.trigger);
                return (
                  <li key={v.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 w-7 h-7 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/20 flex items-center justify-center ${color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {v.label}
                          </span>
                          <span className="text-[11px] text-[#6E8B8D] shrink-0">
                            {formatRelative(v.createdAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6E8B8D] mt-0.5">
                          {label}
                          {v.pageCount ? ` · ${v.pageCount}pg` : ""}
                          {v.wordCount ? ` · ${v.wordCount.toLocaleString()} words` : ""}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(v);
                              setMode("preview");
                            }}
                            className="h-7 px-2 text-[11px] border-[#FF6A00]/20 text-[#B2C8C9] hover:text-white hover:bg-[#FF6A00]/10"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(v);
                              setMode("diff");
                            }}
                            className="h-7 px-2 text-[11px] border-[#FF6A00]/20 text-[#B2C8C9] hover:text-white hover:bg-[#FF6A00]/10"
                          >
                            <GitCompareArrows className="w-3 h-3 mr-1" />
                            Compare
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelected(v);
                              setConfirmRestore(true);
                            }}
                            className="h-7 px-2 text-[11px] bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingId(v.id)}
                            className="h-7 w-7 ml-auto text-[#6E8B8D] hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : mode === "preview" && selected ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-white">{selected.label}</div>
                  <div className="text-[11px] text-[#6E8B8D]">
                    {formatRelative(selected.createdAt)} ·{" "}
                    {selected.pageCount ? `${selected.pageCount}pg · ` : ""}
                    {(selected.wordCount || 0).toLocaleString()} words
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMode("list")}
                  className="text-[#B2C8C9] hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
              <pre className="screenplay-editor max-h-[65vh] overflow-auto text-[11pt] whitespace-pre-wrap">
                {selected.content}
              </pre>
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setMode("diff")}
                  className="border-[#FF6A00]/20 text-[#B2C8C9] hover:text-white hover:bg-[#FF6A00]/10"
                >
                  <GitCompareArrows className="w-4 h-4 mr-2" />
                  Compare with current
                </Button>
                <Button
                  onClick={() => setConfirmRestore(true)}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore this version
                </Button>
              </div>
            </div>
          ) : mode === "diff" && selected && diffOps ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-white">
                    Diff vs. current editor
                  </div>
                  <div className="text-[11px] text-[#6E8B8D]">
                    {selected.label} · {formatRelative(selected.createdAt)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMode("list")}
                  className="text-[#B2C8C9] hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
              {stats && (
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-[#7AE2CF]">+{stats.added} added</span>
                  <span className="text-red-400">−{stats.removed} removed</span>
                  <span className="text-[#6E8B8D]">{stats.unchanged} unchanged</span>
                </div>
              )}
              <div className="screenplay-editor max-h-[65vh] overflow-auto text-[11pt] p-0">
                {diffOps.map((op, idx) => {
                  const base = "px-3 py-0.5 font-mono whitespace-pre-wrap";
                  if (op.type === "add")
                    return (
                      <div
                        key={idx}
                        className={`${base} bg-[#7AE2CF]/10 border-l-2 border-[#7AE2CF] text-[#E8ECF0]`}
                      >
                        <span className="text-[#7AE2CF] mr-2">+</span>
                        {op.line || "\u00A0"}
                      </div>
                    );
                  if (op.type === "remove")
                    return (
                      <div
                        key={idx}
                        className={`${base} bg-red-500/10 border-l-2 border-red-500 text-[#E8ECF0]/80 line-through`}
                      >
                        <span className="text-red-400 mr-2">−</span>
                        {op.line || "\u00A0"}
                      </div>
                    );
                  return (
                    <div key={idx} className={`${base} text-[#B2C8C9]`}>
                      <span className="text-[#6E8B8D] mr-2">&nbsp;</span>
                      {op.line || "\u00A0"}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  onClick={() => setConfirmRestore(true)}
                  className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore this version
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent className="bg-[#0b1b1d] border-[#FF6A00]/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B2C8C9]">
              Your current editor content will be replaced. A snapshot of what's in the editor
              now is kept in history, so you can roll back if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#FF6A00]/20 text-[#B2C8C9] hover:bg-[#FF6A00]/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-[#FF6A00] hover:bg-[#E55A00] text-white"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent className="bg-[#0b1b1d] border-[#FF6A00]/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this version?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B2C8C9]">
              This snapshot will be permanently removed from history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#FF6A00]/20 text-[#B2C8C9] hover:bg-[#FF6A00]/10 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
