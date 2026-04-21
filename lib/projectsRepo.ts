// C:\Users\vizir\VizirPro\lib\projectsRepo.ts
"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FilmPackage } from "./store";

export interface ProjectSummary {
  id: string;
  title: string;
  genre?: string;
  length?: string;
  thumbnail?: string;
  updatedAt?: number;
  createdAt?: number;
}

export interface ProjectDocument extends ProjectSummary {
  package: FilmPackage;
}

const ROOT = "users";
const SUB = "projects";

function userProjectsCol(uid: string) {
  return collection(db, ROOT, uid, SUB);
}

function userProjectDoc(uid: string, projectId: string) {
  return doc(db, ROOT, uid, SUB, projectId);
}

function tsToMs(v: any): number | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v === "number") return v;
  return undefined;
}

function pickSummary(id: string, data: any): ProjectSummary {
  return {
    id,
    title: String(data?.title || "Untitled Project"),
    genre: data?.genre || data?.package?.genre || "",
    length: data?.length || data?.package?.length || "",
    thumbnail: data?.thumbnail || "",
    updatedAt: tsToMs(data?.updatedAt),
    createdAt: tsToMs(data?.createdAt),
  };
}

function deriveTitle(pkg: FilmPackage | null | undefined, fallback = "Untitled Project"): string {
  if (!pkg) return fallback;
  const idea = (pkg.idea || "").trim();
  if (idea) {
    const firstLine = idea.split(/[\n.?!]/)[0].trim();
    if (firstLine) return firstLine.slice(0, 80);
  }
  if (pkg.logline) return pkg.logline.slice(0, 80);
  return fallback;
}

function deriveThumbnail(pkg: FilmPackage | null | undefined): string {
  if (!pkg) return "";
  const sb = pkg.storyboard || pkg.shortScript || [];
  for (const frame of sb) {
    const url = (frame as any)?.imageUrl;
    if (typeof url === "string" && url.startsWith("http")) return url;
  }
  const ch = pkg.characters || [];
  for (const c of ch) {
    if (typeof c.imageUrl === "string" && c.imageUrl.startsWith("http")) return c.imageUrl;
  }
  return "";
}

export async function listProjects(uid: string): Promise<ProjectSummary[]> {
  if (!uid) return [];
  const q = query(userProjectsCol(uid), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  const out: ProjectSummary[] = [];
  snap.forEach((d) => out.push(pickSummary(d.id, d.data())));
  return out;
}

export function subscribeProjects(
  uid: string,
  cb: (items: ProjectSummary[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(userProjectsCol(uid), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const out: ProjectSummary[] = [];
      snap.forEach((d) => out.push(pickSummary(d.id, d.data())));
      cb(out);
    },
    (err) => onError?.(err as Error),
  );
}

export async function loadProject(uid: string, projectId: string): Promise<ProjectDocument | null> {
  if (!uid || !projectId) return null;
  const snap = await getDoc(userProjectDoc(uid, projectId));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    ...pickSummary(snap.id, data),
    package: (data?.package as FilmPackage) || {},
  };
}

export async function createProject(
  uid: string,
  opts?: { title?: string; pkg?: FilmPackage },
): Promise<string> {
  if (!uid) throw new Error("createProject: missing uid");
  const ref = doc(userProjectsCol(uid));
  const pkg = opts?.pkg || {};
  const title = (opts?.title?.trim() || deriveTitle(pkg)).slice(0, 120);
  const payload = {
    title,
    genre: pkg.genre || "",
    length: pkg.length || "",
    thumbnail: deriveThumbnail(pkg),
    package: pkg,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return ref.id;
}

export async function saveProject(
  uid: string,
  projectId: string,
  pkg: FilmPackage,
  overrideTitle?: string,
): Promise<void> {
  if (!uid || !projectId) throw new Error("saveProject: missing uid or projectId");
  const title = (overrideTitle?.trim() || deriveTitle(pkg)).slice(0, 120);
  await updateDoc(userProjectDoc(uid, projectId), {
    title,
    genre: pkg.genre || "",
    length: pkg.length || "",
    thumbnail: deriveThumbnail(pkg),
    package: pkg,
    updatedAt: serverTimestamp(),
  });
}

export async function renameProject(
  uid: string,
  projectId: string,
  title: string,
): Promise<void> {
  if (!uid || !projectId) throw new Error("renameProject: missing uid or projectId");
  const clean = (title || "").trim().slice(0, 120);
  if (!clean) throw new Error("renameProject: empty title");
  await updateDoc(userProjectDoc(uid, projectId), {
    title: clean,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(uid: string, projectId: string): Promise<void> {
  if (!uid || !projectId) throw new Error("deleteProject: missing uid or projectId");
  await deleteDoc(userProjectDoc(uid, projectId));
}
