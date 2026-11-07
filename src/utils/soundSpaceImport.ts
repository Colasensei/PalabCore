import JSZip from 'jszip';

/**
 * Sound Space（Rhythia）谱面导入。
 *
 * 实测样本（2026-10 抓的官方谱面）：
 *   - .rhm  和部分 .sspm 都是 **zip**，内部固定三个条目：
 *       map    → JSON（谱面数据，见 SsMap）
 *       audio  → mp3 / ogg
 *       cover  → png
 *   - 另一种 .sspm 是自定义容器，文件头是 "SS+m" + 4 字节版本号，
 *     里面是一段 JSON（可能夹着资源），这里做宽松扫描：找第一个 `{` 起能解析的 JSON。
 *
 * 只负责解析与入库，不实现 3D 玩法。
 */

export interface SsNote {
  /** 网格坐标 0~2（Rhythia 的 (-X|Y) 网格） */
  x: number;
  y: number;
  /** 毫秒 */
  t: number;
}

export interface SsTiming {
  offsetMs: number;
  bpm: number;
}

export interface SsChart {
  title: string;
  artist: string;
  creator: string;
  /** 谱面自身的难度数值（Rhythia 的 Difficulty 字段） */
  rating: number;
  /** 自定义难度名，可能为 null */
  customName: string | null;
  starRating: number;
  notes: SsNote[];
  timings: SsTiming[];
  audio: Blob | null;
  audioName: string;
  cover: Blob | null;
  /** 封面/曲绘的原始文件名（补 MIME 用，JSZip 的 Blob type 是空的） */
  coverName: string;
  duration: number;
  /** 音符数 / 秒 */
  density: number;
}

interface SsMap {
  Title?: string;
  SongName?: string;
  RomanisedTitle?: string;
  RomanisedArtist?: string;
  Mappers?: string[];
  Difficulty?: number;
  CustomDifficultyName?: string | null;
  StarRating?: number;
  Duration?: number;
  Notes?: { Time?: number; X?: number; Y?: number }[];
  TimingPoints?: { OffsetMs?: number; Bpm?: number }[];
  AudioFileName?: string;
  ImagePath?: string;
}

function toNote(n: { Time?: number; X?: number; Y?: number }): SsNote | null {
  const t = Number(n.Time);
  const x = Number(n.X);
  const y = Number(n.Y);
  if (!Number.isFinite(t)) return null;
  return { x: Number.isFinite(x) ? x : 1, y: Number.isFinite(y) ? y : 1, t };
}

function fromMap(m: SsMap): Omit<SsChart, 'audio' | 'audioName' | 'cover' | 'coverName'> | null {
  const raw = Array.isArray(m.Notes) ? m.Notes : [];
  const notes = raw.map(toNote).filter((n): n is SsNote => n !== null).sort((a, b) => a.t - b.t);
  if (notes.length === 0) return null;
  const duration = Number(m.Duration) || notes[notes.length - 1].t;
  return {
    title: m.Title || m.SongName || m.RomanisedTitle || 'Unknown',
    artist: m.RomanisedArtist || '',
    creator: (m.Mappers && m.Mappers[0]) || '',
    rating: Number(m.Difficulty) || 0,
    customName: m.CustomDifficultyName ?? null,
    starRating: Number(m.StarRating) || 0,
    notes,
    timings: (m.TimingPoints || [])
      .map(p => ({ offsetMs: Number(p.OffsetMs) || 0, bpm: Number(p.Bpm) || 0 }))
      .filter(p => p.bpm > 0),
    duration,
    density: duration > 0 ? notes.length / (duration / 1000) : 0,
  };
}

/** 从一段字节里找第一段可解析的 JSON（SS+m 容器用） */
function extractJson(buf: Uint8Array): SsMap | null {
  // 注意：浏览器里没有 Node 的 Buffer，这里一律走 TextDecoder
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  const start = text.indexOf('{');
  if (start < 0) return null;
  // 从 start 起逐步尝试解析，最多尝试到字符串末尾
  for (let end = text.length; end > start; end = text.lastIndexOf('}', end - 1)) {
    if (end < 0) break;
    try {
      return JSON.parse(text.slice(start, end + 1)) as SsMap;
    } catch { /* 换更短的结尾再试 */ }
  }
  return null;
}

/** 主入口：.sspm / .rhm */
export async function scanSoundSpaceFile(file: File): Promise<SsChart | null> {
  const buf = new Uint8Array(await file.arrayBuffer());

  // ── 自定义容器 "SS+m" ──
  const magic = String.fromCharCode(buf[0] ?? 0, buf[1] ?? 0, buf[2] ?? 0, buf[3] ?? 0);
  if (magic === 'SS+m') {
    const m = extractJson(buf.subarray(8));
    if (!m) return null;
    const base = fromMap(m);
    if (!base) return null;
    return { ...base, audio: null, audioName: '', cover: null, coverName: '' };
  }

  // ── zip（.rhm 与多数 .sspm） ──
  let zip: any;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return null;
  }

  const mapEntry = zip.file('map') || zip.file(/map\.json$/i)[0];
  if (!mapEntry) return null;
  let map: SsMap | null = null;
  try { map = JSON.parse(await mapEntry.async('string')) as SsMap; } catch { return null; }
  if (!map) return null;
  const base = fromMap(map);
  if (!base) return null;

  const audioEntry = zip.file('audio') || zip.file(/\.(mp3|ogg|wav|m4a)$/i)[0];
  const coverEntry = zip.file('cover') || zip.file(/\.(png|jpg|jpeg|webp)$/i)[0];

  const audio = audioEntry ? await audioEntry.async('blob') : null;
  const cover = coverEntry ? await coverEntry.async('blob') : null;

  return {
    ...base,
    audio,
    audioName: map.AudioFileName || (audioEntry ? audioEntry.name : ''),
    cover,
    coverName: map.ImagePath || (coverEntry ? coverEntry.name : ''),
  };
}

