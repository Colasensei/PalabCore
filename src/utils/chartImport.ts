import JSZip from 'jszip';
import { Note } from '../types';
import { parseOsuBeatmap, extractOsuLabel, extractOsuBeatmapId } from './osuParser';
import { parseMalodyChart, readMcSummary, isMcImportable } from './malodyParser';
import { estimateDifficulty } from './manualAnalyzer';

/**
 * 谱面库直接导入 .osu / .osz / .mcz / .zip。
 *
 * 一个文件里可能有多个难度，这里只负责「拆出所有可选难度」，
 * 具体选哪个交给界面。
 */

export type ImportKind = 'osu' | 'malody';

export interface ImportCandidate {
  /** 列表里显示的名字，例如 "水月 [4K Insane]" */
  label: string;
  /** 键数（4 / 6 / …） */
  keys: number;
  /** 难度名 */
  version: string;
  /** osu! 的 BeatmapID（可用于精确匹配；非 osu 谱面为 undefined） */
  beatmapId?: number;
  /** 读取这张谱的完整数据 */
  load: () => Promise<ImportedChart | null>;
}

export interface ImportedChart {
  kind: ImportKind;
  title: string;
  artist: string;
  creator: string;
  version: string;
  trackCount: number;
  bpm: number;
  notes: Note[];
  bpmChanges?: { time: number; bpm: number }[];
  beatOrigin?: number;
  audio: Blob | null;
  audioName: string;
  cover: Blob | null;
  /** 封面/背景的原始文件名（用来补 MIME，JSZip 给的 Blob type 是空的） */
  coverName?: string;
  video: Blob | null;
  chartConstant: number;
}

export interface ImportScan {
  kind: ImportKind;
  fileName: string;
  candidates: ImportCandidate[];
}

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|flac)$/i;
const IMAGE_EXT = /\.(png|jpg|jpeg|webp)$/i;
const VIDEO_EXT = /\.(mp4|webm|mkv|avi|flv|mov|wmv)$/i;

function baseName(path: string): string {
  const s = path.split('/').pop() || path;
  return s.replace(/\.[^.]+$/, '');
}

/** 在 zip 里找一个音频：优先名字和谱面 audioFilename 匹配的，否则取第一个音频 */
function pickAudio(files: Record<string, Blob>, preferred?: string | null): { blob: Blob; name: string } | null {
  const entries = Object.entries(files).filter(([k]) => AUDIO_EXT.test(k));
  if (entries.length === 0) return null;
  if (preferred) {
    const want = preferred.split('/').pop()?.toLowerCase();
    const hit = entries.find(([k]) => k.split('/').pop()?.toLowerCase() === want);
    if (hit) return { blob: hit[1], name: hit[0] };
  }
  return { blob: entries[0][1], name: entries[0][0] };
}

function pickImage(files: Record<string, Blob>, preferred?: string | null): Blob | null {
  const entries = Object.entries(files).filter(([k]) => IMAGE_EXT.test(k) && !/thumb/i.test(k));
  if (entries.length === 0) return null;
  if (preferred) {
    const want = preferred.split('/').pop()?.toLowerCase();
    const hit = entries.find(([k]) => k.split('/').pop()?.toLowerCase() === want);
    if (hit) return hit[1];
  }
  // 没指定就取体积最大的一张当封面
  return entries.sort((a, b) => b[1].size - a[1].size)[0][1];
}

function pickVideo(files: Record<string, Blob>, preferred?: string | null): Blob | null {
  const entries = Object.entries(files).filter(([k]) => VIDEO_EXT.test(k));
  if (entries.length === 0) return null;
  if (preferred) {
    const want = preferred.split('/').pop()?.toLowerCase();
    const hit = entries.find(([k]) => k.split('/').pop()?.toLowerCase() === want);
    if (hit) return hit[1];
  }
  return entries[0][1];
}

async function readZipFiles(file: File | Blob): Promise<Record<string, Blob>> {
  const zip = await JSZip.loadAsync(file);
  const files: Record<string, Blob> = {};
  const names = Object.keys(zip.files).filter(n => !zip.files[n].dir && !/^__MACOSX\//.test(n) && !/\/\._/.test(n));
  for (const n of names) {
    const blob = await zip.files[n].async('blob');
    // 注意：镜像（比如 Sayobot）会把文件名里的特殊字符换成 `?`，并在结尾补 NUL 填充，
    // 例如 `xxx.mp4\u0000\u0000\u0000\u0000`。不清掉的话扩展名正则匹配不上，
    // 视频就会「明明在包里却识别不到」。所以这里统一去掉控制字符再 trim。
    const key = n.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (blob.size > 0) files[key] = blob;
  }
  return files;
}

/** 扫一个文件里所有可选难度 */
export async function scanChartFile(file: File): Promise<ImportScan | null> {
  const name = file.name.toLowerCase();

  // 单个 .osu 文本
  if (name.endsWith('.osu')) {
    const text = await file.text();
    const label = extractOsuLabel(text);
    return {
      kind: 'osu',
      fileName: file.name,
      candidates: [{
        label,
        keys: 4,
        version: label,
        beatmapId: extractOsuBeatmapId(text) ?? undefined,
        load: async () => {
          const r = parseOsuBeatmap(text);
          if (!r.notes.length) return null;
          const dur = Math.max(...r.notes.map(n => n.endTime));
          return {
            kind: 'osu' as const,
            title: r.title, artist: r.artist, creator: r.creator, version: r.version,
            trackCount: r.trackCount, bpm: r.bpm, notes: r.notes,
            audio: null, audioName: '',
            cover: null, video: null,
            chartConstant: estimateDifficulty(r.notes, Math.max(1000, dur), r.trackCount),
          };
        },
      }],
    };
  }

  if (!/\.(osz|mcz|zip)$/i.test(name)) return null;

  const files = await readZipFiles(file);

  // ── Malody：0/*.mc ──
  const mcKeys = Object.keys(files).filter(k => k.toLowerCase().endsWith('.mc'));
  if (mcKeys.length > 0) {
    const audio = pickAudio(files);
    const candidates: ImportCandidate[] = [];
    for (const key of mcKeys) {
      const text = await files[key].text();
      const sum = readMcSummary(text);
      if (!sum || !isMcImportable(sum)) continue;
      candidates.push({
        label: sum.version ? `${sum.title} [${sum.version}]` : sum.title,
        keys: sum.columns,
        version: sum.version || baseName(key),
        load: async () => {
          const r = parseMalodyChart(text);
          if (!r.notes.length) return null;
          const dur = Math.max(...r.notes.map(n => n.endTime));
          const audioFile = audio ?? pickAudio(files, null);
          return {
            kind: 'malody' as const,
            title: r.title, artist: r.artist, creator: r.creator, version: r.version,
            trackCount: r.trackCount, bpm: r.bpm, notes: r.notes,
            bpmChanges: r.bpmChanges, beatOrigin: (r as { beatOrigin?: number }).beatOrigin,
            audio: audioFile?.blob ?? null, audioName: audioFile?.name ?? '',
            cover: pickImage(files, sum ? (undefined as unknown as string) : null),
            video: pickVideo(files),
            chartConstant: estimateDifficulty(r.notes, Math.max(1000, dur), r.trackCount),
          };
        },
      });
    }
    if (candidates.length > 0) return { kind: 'malody', fileName: file.name, candidates };
  }

  // ── osu!：*.osu（.osz 或 zip 里带） ──
  const osuKeys = Object.keys(files).filter(k => k.toLowerCase().endsWith('.osu'));
  if (osuKeys.length > 0) {
    const candidates: ImportCandidate[] = [];
    for (const key of osuKeys) {
      const text = await files[key].text();
      let label = baseName(key);
      try { label = extractOsuLabel(text); } catch { /* 保持文件名 */ }
      candidates.push({
        label,
        keys: 4,
        version: label,
        beatmapId: extractOsuBeatmapId(text) ?? undefined,
        load: async () => {
          const r = parseOsuBeatmap(text);
          if (!r.notes.length) return null;
          const dur = Math.max(...r.notes.map(n => n.endTime));
          const audioFile = pickAudio(files, r.audioFilename);
          return {
            kind: 'osu' as const,
            title: r.title, artist: r.artist, creator: r.creator, version: r.version,
            trackCount: r.trackCount, bpm: r.bpm, notes: r.notes,
            audio: audioFile?.blob ?? null, audioName: audioFile?.name ?? '',
            cover: pickImage(files, r.backgroundFilename),
            coverName: r.backgroundFilename ?? '',
            video: pickVideo(files, r.videoFilename),
            chartConstant: estimateDifficulty(r.notes, Math.max(1000, dur), r.trackCount),
          };
        },
      });
    }
    if (candidates.length > 0) return { kind: 'osu', fileName: file.name, candidates };
  }

  return null;
}
