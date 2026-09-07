/**
 * 图纸网格代数：BEAD_PALETTE 索引矩阵 + 空格子哨兵。
 * 网格为 number[][]（先行后列），EMPTY_CELL 表示不贴珠。
 */

export const EMPTY_CELL = -1;

export function createEmptyGrid(w: number, h: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => EMPTY_CELL));
}

export function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => row.slice());
}

/**
 * 油漆桶：4 连通洪泛填充，返回新网格（不修改入参）。
 * 起点越界或目标值与填充值相同（无事可做）时返回克隆。
 */
export function floodFill(grid: number[][], startX: number, startY: number, value: number): number[][] {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const out = cloneGrid(grid);
  if (h === 0 || w === 0) return out;
  if (startX < 0 || startX >= w || startY < 0 || startY >= h) return out;

  const target = grid[startY][startX];
  if (target === value) return out;

  const queue: number[] = [startY * w + startX];
  out[startY][startX] = value;
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0 && out[y][x - 1] === target) {
      out[y][x - 1] = value;
      queue.push(y * w + (x - 1));
    }
    if (x < w - 1 && out[y][x + 1] === target) {
      out[y][x + 1] = value;
      queue.push(y * w + (x + 1));
    }
    if (y > 0 && out[y - 1][x] === target) {
      out[y - 1][x] = value;
      queue.push((y - 1) * w + x);
    }
    if (y < h - 1 && out[y + 1][x] === target) {
      out[y + 1][x] = value;
      queue.push((y + 1) * w + x);
    }
  }
  return out;
}

/** 已涂珠子数（非空格子）。 */
export function countBeads(grid: number[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const id of row) {
      if (id >= 0) count++;
    }
  }
  return count;
}

/** 不同颜色种数（不含空格子）。 */
export function countColors(grid: number[][]): number {
  const seen = new Set<number>();
  for (const row of grid) {
    for (const id of row) {
      if (id >= 0) seen.add(id);
    }
  }
  return seen.size;
}
