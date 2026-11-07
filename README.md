# PalabCore

Palab 的音游核心算法与架构代码。**只放引擎、算法与数据结构**，不含 UI、样式、平台适配和业务逻辑。

## 判定与计分

| 文件 | 作用 |
| --- | --- |
| `hooks/useGameEngine.ts` | 判定引擎：时间轴推进、按下/松手判定、长条状态机（含 0.5s 松手容错）、连击与得分聚合 |
| `utils/scoring.ts` | 判定权重、分数上限、评级、单曲 PP |
| `utils/bpmMap.ts` | BPM 变速时间轴：时间 ↔ 节拍双向换算 |

## 谱面生成与分析

| 文件 | 作用 |
| --- | --- |
| `utils/chartGenerator.ts` | 自动生成谱面（节奏点提取 → 轨道分配 → 双押合并） |
| `utils/manualAnalyzer.ts` | 手动录入的分析：双押分组、难度定数估算 |
| `utils/brainSplit.ts` | 脑裂（多轨对称）分段算法 |
| `utils/audioAnalyzer.ts` | 音频分析：节拍/onsets 提取（meyda + beat-detector） |
| `utils/mlLearner.ts` | 基于历史成绩的难度自适应学习 |

## 谱面格式解析

| 文件 | 作用 |
| --- | --- |
| `utils/osuParser.ts` | osu! (mania) `.osu` / `.osz` 解析 |
| `utils/malodyParser.ts` | Malody `.mcz` 解析 |
| `utils/chartParser.ts` | Palab 原生谱面包（zip + info.json + chart.json） |
| `utils/chartImport.ts` | 谱面扫描与多难度识别 |
| `utils/soundSpaceImport.ts` | Sound Space 包（.sspm / .rhm）解析 |

## Sound Space

| 文件 | 作用 |
| --- | --- |
| `utils/ssField.ts` | 三维判定场：坐标映射与命中判定 |
| `utils/ssConvert.ts` | 4K → Sound Space 转换 |
| `utils/ssGenerate.ts` | Sound Space 谱面生成 |
| `utils/ssFlex.ts` | 弹性/柔性轨道布局算法 |
| `utils/ssCursor.ts` | 摇杆输入 → 光标映射（死区、方形归一化） |

## 基础设施

| 文件 | 作用 |
| --- | --- |
| `types/index.ts` | 核心数据结构：`Note`、`GameConfig`、`GameResults`、`HighScoreRecord` 等 |
| `types/chart.ts` | 谱面包结构 |
| `utils/blobUrl.ts` | Blob ↔ DataURL |
| `utils/blurImage.ts` | 图片模糊 / 主色提取 / 缩略图生成 |
| `utils/audioManager.ts` | 音频播放调度 |
| `utils/chartDB.ts` | IndexedDB 谱面存储 |
| `utils/devOverrides.ts` | 可调参数表（判定窗口、时长、渲染常量） |

## 使用

```bash
npm i          # 安装 jszip / meyda / web-audio-beat-detector 等依赖
npx tsc -p tsconfig.json --noEmit   # 已验证：0 error
```

`shims.d.ts` 里给了几个第三方库的占位声明，装完依赖后可以删掉。

## 许可

MIT，见 [LICENSE](./LICENSE)。可自由使用、修改、商用，保留版权声明即可。
