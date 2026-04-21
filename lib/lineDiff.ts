// C:\Users\vizir\VizirPro\lib\lineDiff.ts
// Small LCS-based line diff. No external dependency.
// Returns an array of { type: 'same' | 'add' | 'remove', line } for rendering.

export type DiffOp = "same" | "add" | "remove";

export interface DiffLine {
  type: DiffOp;
  line: string;
  oldIndex?: number;
  newIndex?: number;
}

/**
 * Produces a unified line-level diff between `oldText` and `newText`.
 * Uses a dynamic-programming LCS — fine for screenplay-sized inputs
 * (typically < 5k lines). For very long inputs, consider a word-based
 * diff library instead.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = (oldText || "").split("\n");
  const b = (newText || "").split("\n");
  const m = a.length;
  const n = b.length;

  // LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: "same", line: a[i], oldIndex: i, newIndex: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", line: a[i], oldIndex: i });
      i++;
    } else {
      out.push({ type: "add", line: b[j], newIndex: j });
      j++;
    }
  }
  while (i < m) {
    out.push({ type: "remove", line: a[i], oldIndex: i });
    i++;
  }
  while (j < n) {
    out.push({ type: "add", line: b[j], newIndex: j });
    j++;
  }
  return out;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

export function diffStats(ops: DiffLine[]): DiffStats {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const op of ops) {
    if (op.type === "add") added++;
    else if (op.type === "remove") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}
