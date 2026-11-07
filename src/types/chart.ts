// 谱面包结构（从 UI 层抽出的纯数据类型）
export interface ChartPackage {
  fileName: string;
  title: string;
  artist: string;
  author: string;
  difficulty: string;
  chartConstant: number;
  description: string;
  coverUrl: string | null;
  illustrationUrl: string | null;
  songUrl: string | null;
  /** 谱面背景视频。新包存 Blob（IndexedDB 原生支持），播放时再转 object URL */
  videoBlob?: Blob | null;
  /** 旧包遗留：视频以 base64 dataURL 存着，选中时会自动迁移成 videoBlob */
  videoUrl?: string | null;
  /** 导入时预生成的小缩略图（列表滚动不解码大图） */
  coverThumb?: string | null;
  /** 导入时预生成的主色，格式 "r,g,b"（卡背景纯色块） */
  tint?: string | null;
  /** 缩略图生成规则的版本号：2 起表示缩略图取「封面」。旧包按 1 处理，会重算 */
  thumbV?: number;
  chartData: string;
  config: string;
  speed?: number;
  /** 背景模式：video=播放视频，motion=减弱动态效果（不播视频，用封面） */
  bgMode?: 'motion' | 'video';
}
