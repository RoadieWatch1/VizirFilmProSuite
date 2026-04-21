"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FolderKanban,
  Plus,
  Trash2,
  Pencil,
  Clock,
  Film,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/useAuth";
import { useFilmStore } from "@/lib/store";

function formatRelative(ms?: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    projects,
    projectsLoading,
    activeProjectId,
    refreshProjects,
    createProject,
    openProject,
    deleteProject,
    renameProject,
  } = useFilmStore();

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    refreshProjects(user.uid);
  }, [user?.uid, refreshProjects]);

  if (authLoading) {
    return (
      <div className="min-h-screen cinematic-gradient flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#FF6A00] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Projects"
        subtitle="All your films in one place"
        emptyTitle="Sign in to manage projects"
        emptyDescription="Your projects sync securely across devices once you sign in. Create unlimited films, switch between them anytime."
        needsPrerequisite={true}
        prerequisiteMessage="Sign in from the Create tab to start saving projects."
        prerequisiteCta="Go to Create"
        prerequisiteHref="/"
        actionLabel=""
        onAction={() => {}}
      />
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const title = newTitle.trim() || "Untitled Project";
      await createProject(user.uid, title);
      setNewTitle("");
      toast.success(`Created "${title}"`);
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = async (projectId: string) => {
    setPendingOpenId(projectId);
    try {
      await openProject(user.uid, projectId);
      toast.success("Project loaded");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Failed to open project");
    } finally {
      setPendingOpenId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await deleteProject(user.uid, id);
      toast.success("Project deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete project");
    }
  };

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      await renameProject(user.uid, renamingId, trimmed);
      toast.success("Renamed");
    } catch (err: any) {
      toast.error(err?.message || "Failed to rename");
    } finally {
      cancelRename();
    }
  };

  return (
    <div className="min-h-screen cinematic-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <FolderKanban className="w-7 h-7 text-[#FF6A00]" />
                Projects
              </h1>
              <p className="text-[#B2C8C9]">
                {projects.length === 0
                  ? "Create your first film project."
                  : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
              </p>
            </div>
          </div>

          {/* New project row */}
          <Card className="glass-effect border-[#FF6A00]/20 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="New project title (optional)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="bg-[#0b1b1d] border-[#FF6A00]/20 text-white placeholder:text-[#6E8B8D]"
                disabled={creating}
              />
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-[#FF6A00] hover:bg-[#E55A00] text-white whitespace-nowrap"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                New Project
              </Button>
            </div>
          </Card>

          {/* Project grid */}
          {projectsLoading ? (
            <div className="flex items-center justify-center py-16 text-[#B2C8C9]">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <Card className="glass-effect border-[#FF6A00]/20 p-12 text-center">
              <Film className="w-12 h-12 text-[#FF6A00] mx-auto mb-4 opacity-70" />
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-[#B2C8C9] mb-6">
                Start your first film. Create a project above, then head to the Create tab to
                generate scripts, storyboards, budgets, and more.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => {
                const isActive = p.id === activeProjectId;
                const isRenaming = renamingId === p.id;
                const isOpening = pendingOpenId === p.id;
                return (
                  <Card
                    key={p.id}
                    className={`glass-effect hover-lift p-0 overflow-hidden transition-colors ${
                      isActive
                        ? "border-[#FF6A00] shadow-[0_0_0_1px_rgba(255,106,0,0.4)]"
                        : "border-[#FF6A00]/20"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !isRenaming && !isOpening && handleOpen(p.id)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !isRenaming && !isOpening) {
                          e.preventDefault();
                          handleOpen(p.id);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-[#0b1b1d] overflow-hidden">
                        {p.thumbnail ? (
                          <Image
                            src={p.thumbnail}
                            alt={p.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6E8B8D]">
                            <Film className="w-10 h-10 opacity-50" />
                          </div>
                        )}
                        {isActive && (
                          <div className="absolute top-2 left-2 bg-[#FF6A00] text-white text-[10px] font-semibold px-2 py-1 rounded">
                            ACTIVE
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-3">
                        {isRenaming ? (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              value={renameValue}
                              autoFocus
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") cancelRename();
                              }}
                              className="bg-[#0b1b1d] border-[#FF6A00]/20 text-white h-9"
                            />
                            <Button
                              size="icon"
                              onClick={commitRename}
                              className="bg-[#FF6A00] hover:bg-[#E55A00] text-white h-9 w-9 shrink-0"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={cancelRename}
                              className="h-9 w-9 shrink-0 border-[#FF6A00]/20 text-[#B2C8C9]"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-white font-semibold truncate">{p.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-[#B2C8C9]">
                              {p.genre && <span className="truncate">{p.genre}</span>}
                              {p.length && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {p.length}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-[#6E8B8D]">
                            {formatRelative(p.updatedAt || p.createdAt)}
                          </span>
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isRenaming}
                              onClick={() => startRename(p.id, p.title)}
                              className="h-8 w-8 text-[#B2C8C9] hover:text-[#FF6A00] hover:bg-[#FF6A00]/10"
                              title="Rename"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteTargetId(p.id)}
                              className="h-8 w-8 text-[#B2C8C9] hover:text-red-400 hover:bg-red-500/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          disabled={isOpening || isRenaming}
                          className="w-full bg-[#FF6A00]/15 hover:bg-[#FF6A00] hover:text-white text-[#FF6A00] border border-[#FF6A00]/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(p.id);
                          }}
                        >
                          {isOpening ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Opening…
                            </>
                          ) : isActive ? (
                            "Continue Working"
                          ) : (
                            "Open Project"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent className="bg-[#0b1b1d] border-[#FF6A00]/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B2C8C9]">
              This permanently deletes the project and everything in it — script, storyboard,
              budget, schedule. This cannot be undone.
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
    </div>
  );
}
