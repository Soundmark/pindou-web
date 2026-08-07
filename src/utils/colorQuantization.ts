import { getColorDistance } from "./beadColors";
import type { BeadColor } from "./beadColors";

export type ColorSimplifyLevel = "none" | "low" | "medium" | "high";

export const SIMPLIFY_CONFIG: Record<ColorSimplifyLevel, { maxColors: number; minClusterSize: number; mergeThreshold: number }> = {
  none: { maxColors: Infinity, minClusterSize: 1, mergeThreshold: 0 },
  low: { maxColors: 24, minClusterSize: 3, mergeThreshold: 8 },
  medium: { maxColors: 16, minClusterSize: 5, mergeThreshold: 12 },
  high: { maxColors: 8, minClusterSize: 8, mergeThreshold: 15 },
};

export function mergeSimilarBeadColors(
  colorStats: { color: BeadColor; count: number }[],
  maxColors: number,
  excludedIds: string[] = ["H02"]
): Map<string, string> {
  if (colorStats.length <= maxColors) return new Map();

  const protectedColors = colorStats.filter((s) => excludedIds.includes(s.color.id));
  const mergeable = colorStats.filter((s) => !excludedIds.includes(s.color.id));
  const sorted = [...mergeable].sort((a, b) => b.count - a.count);

  const mapping = new Map<string, string>();
  const merged: { color: BeadColor; count: number }[] = [];

  for (const pc of protectedColors) {
    merged.push({ color: pc.color, count: pc.count });
    mapping.set(pc.color.id, pc.color.id);
  }

  const slots = Math.max(0, maxColors - protectedColors.length);
  for (let i = 0; i < Math.min(slots, sorted.length); i++) {
    merged.push({ color: sorted[i].color, count: sorted[i].count });
    mapping.set(sorted[i].color.id, sorted[i].color.id);
  }

  for (let i = slots; i < sorted.length; i++) {
    let minDist = Infinity, nearestIdx = 0;
    for (let j = 0; j < merged.length; j++) {
      const dist = getColorDistance(sorted[i].color, merged[j].color);
      if (dist < minDist) { minDist = dist; nearestIdx = j; }
    }
    merged[nearestIdx].count += sorted[i].count;
    mapping.set(sorted[i].color.id, merged[nearestIdx].color.id);
  }

  return mapping;
}

export function getRecommendedSimplifyLevel(colorCount: number, gridSize: number): ColorSimplifyLevel {
  if (gridSize <= 40) {
    if (colorCount > 16) return "high";
    if (colorCount > 10) return "medium";
    return "low";
  }
  if (gridSize <= 70) {
    if (colorCount > 20) return "medium";
    if (colorCount > 12) return "low";
    return "none";
  }
  if (colorCount > 30) return "low";
  return "none";
}