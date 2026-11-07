/**
 * 4K（或任意 K）谱面 → Sound Space 谱面
 *
 * 规则（编辑器内「转为 SS」用）：
 *  - 同一时刻（30ms 内）的多个音符是双押 → 只保留第一个，变成单个音符
 *  - x：按轨道数等比例映射到 0~2 三列，取整
 *  - y：同一列连续出现时上下摆动（1 → 1.45 → 0.55 …），换列就回到中线
 *  - hold：起点一个音符，结束再补一个，保留长条的节奏感
 */
import type { Note } from '../types';
import type { SsNote } from './soundSpaceImport';

export function convertNotesToSs(notes: Note[], trackCount: number): SsNote[] {
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
  const out: SsNote[] = [];

  let prevX = -1;
  let flip = 0;
  let lastT = -1e9;

  const xOf = (track: number) =>
    trackCount <= 3
      ? Math.max(0, Math.min(2, track))
      : Math.max(0, Math.min(2, Math.round((track / (trackCount - 1)) * 2)));

  for (const n of sorted) {
    // 双押：时间差在 30ms 以内只留一个
    if (n.startTime - lastT < 30) continue;

    const x = xOf(n.track);
    let y = 1;
    if (x === prevX) {
      // 同一列连续：上下摆动，避免一条直线
      flip ^= 1;
      y = flip ? 1.45 : 0.55;
    } else {
      flip = 0;
      y = 1;
    }

    out.push({ x, y, t: n.startTime });
    prevX = x;
    lastT = n.startTime;

    // 长条：结尾补一个点，保留"按住到某时刻"的节奏
    if (n.type === 'hold' && n.endTime > n.startTime + 80) {
      out.push({ x, y, t: n.endTime });
      lastT = n.endTime;
    }
  }

  return out;
}

/** 转换后的时长（毫秒）：用于难度估算与谱面时长字段 */
export function ssDuration(ssNotes: SsNote[]): number {
  if (ssNotes.length === 0) return 0;
  let max = 0;
  for (const n of ssNotes) if (n.t > max) max = n.t;
  return max;
}
