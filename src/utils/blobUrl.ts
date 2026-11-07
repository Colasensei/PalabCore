/** Blob → dataURL 工具：补齐 MIME 类型
 *
 *  JSZip 的 `entry.async('blob')` 返回的 Blob **type 是空的**，
 *  FileReader 会产出 `data:;base64,...` 这种没有 MIME 的 URL。
 *  `<audio src="data:;base64,...">` 在浏览器里会被当成 text/plain，
 *  loadedmetadata 永远不触发 → 表现为「谱面没有声音 / 打开加载失败」。
 *  所以这里按文件名补一个 MIME。
 */

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  weba: 'audio/webm',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
};

/** 按扩展名猜 MIME；猜不到返回空串 */
export function mimeFromName(name: string | null | undefined): string {
  if (!name) return '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? '';
}

/** Blob → dataURL，MIME 优先用 blob.type，其次按文件名猜 */
export function blobToDataUrl(blob: Blob, name?: string | null): Promise<string> {
  const type = blob.type || mimeFromName(name);
  const typed = type ? new Blob([blob], { type }) : blob;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(typed);
  });
}
