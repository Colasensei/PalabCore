# PalabCore

Palab 的核心音游引擎与架构代码。**只包含引擎与数据结构**，不含任何 UI、渲染层或业务逻辑。

## 内容

| 文件 | 作用 |
| --- | --- |
| `src/hooks/useGameEngine.ts` | 判定引擎：时间轴推进、按下/松手判定、长条状态机、连击与得分聚合 |
| `src/utils/scoring.ts` | 计分与评级：判定权重、分数上限、RKS 单曲 PP 计算 |
| `src/utils/bpmMap.ts` | BPM 变速时间轴：时间 ↔ 节拍双向换算 |
| `src/utils/ssField.ts` | Sound Space 三维判定场：坐标映射、命中判定 |
| `src/types/index.ts` | 核心数据结构：`Note`、`GameConfig`、`GameResults`、`HighScoreRecord` 等 |

## 不包含

- UI 组件、样式、动画
- 谱面库 / 编辑器 / 排行榜等业务层
- 平台适配（Electron / Capacitor / Toy）

## 许可

MIT，见 [LICENSE](./LICENSE)。可自由使用、修改、商用，保留版权声明即可。
