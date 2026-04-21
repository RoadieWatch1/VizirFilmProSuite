"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { configureAutosave, useFilmStore } from "@/lib/store";

/**
 * Hooks Firebase auth state into the project autosave pipeline.
 * - On sign-in: enables autosave for the active project and refreshes the project list.
 * - On sign-out: disables autosave so we don't write with a stale uid.
 * Mounted once in app/layout.tsx.
 */
export default function ProjectSync() {
  const { user, loading } = useAuth();
  const refreshProjects = useFilmStore((s) => s.refreshProjects);

  useEffect(() => {
    if (loading) return;
    if (user?.uid) {
      configureAutosave(user.uid);
      refreshProjects(user.uid).catch((err) => {
        console.error("ProjectSync: refreshProjects failed", err);
      });
    } else {
      configureAutosave(null);
    }
  }, [user?.uid, loading, refreshProjects]);

  return null;
}
