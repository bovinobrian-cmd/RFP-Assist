// Word-level diff (LCS) used to render tier-2 tonality adjustments against
// the unmodified golden-source answer (PRD §7, tier 2).

export interface DiffSegment {
  kind: "same" | "added" | "removed";
  text: string;
}

export function wordDiff(oldText: string, newText: string): DiffSegment[] {
  const a = oldText.split(/(\s+)/).filter((t) => t.length > 0);
  const b = newText.split(/(\s+)/).filter((t) => t.length > 0);

  // LCS table over word arrays (answers are short enough for O(n·m)).
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (kind: DiffSegment["kind"], text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === kind) last.text += text;
    else segments.push({ kind, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("removed", a[i]);
      i++;
    } else {
      push("added", b[j]);
      j++;
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return segments;
}
