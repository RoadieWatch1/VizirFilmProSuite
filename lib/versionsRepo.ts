// C:\Users\vizir\VizirPro\lib\versionsRepo.ts
"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type VersionTrigger = "generate" | "manual" | "autosave" | "restore";

export interface ScriptVersion {
  id: string;
  content: string;
  label: string;
  trigger: VersionTrigger;
  createdAt?: number;
  wordCount?: number;
  pageCount?: number;
}

const ROOT = "users";
const PROJECTS = "projects";
const VERSIONS = "versions";

function versionsCol(uid: string, projectId: string) {
  return collection(db, ROOT, uid, PROJECTS, projectId, VERSIONS);
}

function versionDoc(uid: string, projectId: string, versionId: string) {
  return doc(db, ROOT, uid, PROJECTS, projectId, VERSIONS, versionId);
}

function tsToMs(v: any): number | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v === "number") return v;
  return undefined;
}

function countWords(s: string) {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

function estimatePages(s: string) {
  return Math.max(1, Math.round(countWords(s) / 180));
}

function mapVersion(id: string, data: any): ScriptVersion {
  return {
    id,
    content: typeof data?.content === "string" ? data.content : "",
    label: String(data?.label || ""),
    trigger: (data?.trigger as VersionTrigger) || "autosave",
    createdAt: tsToMs(data?.createdAt),
    wordCount: typeof data?.wordCount === "number" ? data.wordCount : undefined,
    pageCount: typeof data?.pageCount === "number" ? data.pageCount : undefined,
  };
}

export async function listVersions(
  uid: string,
  projectId: string,
  max = 100,
): Promise<ScriptVersion[]> {
  if (!uid || !projectId) return [];
  const q = query(versionsCol(uid, projectId), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  const out: ScriptVersion[] = [];
  snap.forEach((d) => out.push(mapVersion(d.id, d.data())));
  return out;
}

export async function getVersion(
  uid: string,
  projectId: string,
  versionId: string,
): Promise<ScriptVersion | null> {
  if (!uid || !projectId || !versionId) return null;
  const snap = await getDoc(versionDoc(uid, projectId, versionId));
  if (!snap.exists()) return null;
  return mapVersion(snap.id, snap.data());
}

export async function createVersion(
  uid: string,
  projectId: string,
  content: string,
  meta: { label?: string; trigger: VersionTrigger },
): Promise<string> {
  if (!uid || !projectId) throw new Error("createVersion: missing uid or projectId");
  const trimmed = (content || "").trim();
  if (!trimmed) throw new Error("createVersion: empty content");
  const wordCount = countWords(trimmed);
  const pageCount = estimatePages(trimmed);
  const label =
    (meta.label && meta.label.trim()) ||
    defaultLabelFor(meta.trigger, wordCount, pageCount);
  const ref = await addDoc(versionsCol(uid, projectId), {
    content: trimmed,
    label,
    trigger: meta.trigger,
    wordCount,
    pageCount,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteVersion(
  uid: string,
  projectId: string,
  versionId: string,
): Promise<void> {
  if (!uid || !projectId || !versionId) return;
  await deleteDoc(versionDoc(uid, projectId, versionId));
}

/**
 * Returns the most recent version created by the given trigger, if any.
 * Useful for "have we saved this content already?" dedup checks.
 */
export async function getLatestVersionByTrigger(
  uid: string,
  projectId: string,
  trigger: VersionTrigger,
): Promise<ScriptVersion | null> {
  if (!uid || !projectId) return null;
  const q = query(
    versionsCol(uid, projectId),
    where("trigger", "==", trigger),
    orderBy("createdAt", "desc"),
    limit(1),
  );
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? mapVersion(first.id, first.data()) : null;
}

function defaultLabelFor(
  trigger: VersionTrigger,
  wordCount: number,
  pageCount: number,
): string {
  const suffix = `${pageCount}pg · ${wordCount.toLocaleString()} words`;
  switch (trigger) {
    case "generate":
      return `Generated draft (${suffix})`;
    case "manual":
      return `Saved snapshot (${suffix})`;
    case "restore":
      return `Restored from history (${suffix})`;
    case "autosave":
    default:
      return `Autosave (${suffix})`;
  }
}
