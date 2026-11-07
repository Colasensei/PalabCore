import type { Note } from '../types';
import type { SsNote } from './soundSpaceImport';

/**
 * 由自动生成的键位谱面推出 Sound Space 谱面。
 *
 * 不另起一套节奏分析：直接复用 generateChart 算好的时间轴与密度，
 * 只把「轨道」改写成 3x3 网格上的落点。落点用几组固定手法循环
 * （绕圈 / 对角跳 / 中心往返 / 扫边 / 交叉），出来的手感接近现成 SS 谱：
 * 以相邻小步为主，偶尔跳一下。
 */

/** 每种手法是一串 (x, y)，按顺序套在连续音符上 */
const SHAPES: Array<Array<[number, number]>> = [
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]],  // 绕圈
  [[0, 0], [2, 2], [0, 2], [2, 0]],                                   // 对角跳
  [[1, 1], [0, 0], [1, 1], [2, 2], [1, 1], [2, 0], [1, 1], [0, 2]],   // 中心往返
  [[0, 1], [1, 1], [2, 1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2]],   // 扫边
  [[0, 0], [1, 1], [2, 2], [1, 1], [0, 0], [0, 2], [1, 1], [2, 0]],   // 交叉
];

function cell(v: number): number {
  return Math.max(0, Math.min(2, v));
}

/**
 * @param notes 自动生成（或导入）的键位谱面
 * @param chartConstant 定数：越高手法越凶、留白越少
 */
export function generateSsNotes(notes: Note[], chartConstant: number): SsNote[] {
  if (notes.length === 0) return [];
  // 同一时刻只留一个落点（SS 一个时刻只判定一个点）
  const byTime = new Map<number, Note>();
  for (const n of notes) {
    const key = Math.round(n.startTime);
    if (!byTime.has(key)) byTime.set(key, n);
  }
  const times = [...byTime.keys()].sort((a, b) => a - b);

  // 高定数才用对角跳 / 交叉，低定数保持规整
  const pool = chartConstant >= 17 ? [0, 1, 2, 3, 4] : chartConstant >= 12 ? [0, 2, 3] : [0, 3];

  const out: SsNote[] = [];
  let step = 0;
  let lastX = 1;
  let lastY = 1;

  for (let i = 0; i < times.length; i++) {
    const shapeIdx = pool[Math.floor(i / 8) % pool.length];
    const shape = SHAPES[shapeIdx];
    const [sx, sy] = shape[step % shape.length];

    // 高定数偶尔「原地连打」一下，贴着上一个落点
    const follow = chartConstant >= 14 && i % 11 === 5;
    const x = follow ? lastX : cell(sx);
    const y = follow ? lastY : cell(sy);

    lastX = x;
    lastY = y;
    out.push({ x, y, t: times[i] });
    step = (step + 1) % shape.length;
  }
  return out;
}
