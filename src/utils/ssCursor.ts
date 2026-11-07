/** Sound Space 准星/手柄映射：游玩与「手感测试」共用同一套换算，保证手感一致 */

export type StickCurve = 'linear' | 'quad' | 'cubic';

/** 摇杆推满时准星相对中心偏移的网格数 */
export const STICK_RANGE = 1.5;
/** 准星可活动范围（网格坐标） */
export const CURSOR_MIN = -0.35;
export const CURSOR_MAX = 2.35;

/** 应用死区 + 曲线，返回 0~1 的幅度（保留符号） */
export function shapeAxis(raw: number, deadzone: number, curve: StickCurve): number {
  const a = Math.abs(raw);
  if (a <= deadzone) return 0;
  const t = (a - deadzone) / Math.max(1e-6, 1 - deadzone);
  const shaped = curve === 'quad' ? t * t : curve === 'cubic' ? t * t * t : t;
  return Math.sign(raw) * shaped;
}

export interface PadAxes {
  rawX: number;
  rawY: number;
  shapedX: number;
  shapedY: number;
  magnitude: number;
  active: boolean;
}

/** 读一个 Gamepad 的摇杆（优先右摇杆 axes 2/3，没输入时回落左摇杆 0/1） */
export function readStick(
  pad: Gamepad | null,
  deadzone: number,
  curve: StickCurve,
  sensitivity: number,
  invertX: boolean,
  invertY: boolean,
): PadAxes {
  if (!pad) {
    return { rawX: 0, rawY: 0, shapedX: 0, shapedY: 0, magnitude: 0, active: false };
  }
  let rx = pad.axes[2] ?? 0;
  let ry = pad.axes[3] ?? 0;
  if (Math.abs(rx) < 0.08 && Math.abs(ry) < 0.08) {
    rx = pad.axes[0] ?? 0;
    ry = pad.axes[1] ?? 0;
  }
  if (invertX) rx = -rx;
  if (invertY) ry = -ry;

  // 圆形摇杆 → 方形场地：
  // 1) 先按「摇杆模长」过死区和曲线（不是逐轴），保证推满任意方向都算满推；
  // 2) 再沿方向把点拉到方形边界（除以方向的最大分量），
  //    这样斜着推满也能到达四个角——逐轴处理时斜向每轴只有 0.707，永远够不到角。
  const rawMag = Math.hypot(rx, ry);
  let outMag = rawMag <= deadzone ? 0 : shapeAxis(rawMag, deadzone, curve) * sensitivity;

  let sx = 0;
  let sy = 0;
  if (rawMag > 1e-6 && outMag !== 0) {
    const ux = rx / rawMag;
    const uy = ry / rawMag;
    const cheb = Math.max(Math.abs(ux), Math.abs(uy), 1e-6);
    const k = outMag / cheb;
    sx = ux * k;
    sy = uy * k;
  } else {
    outMag = 0;
  }

  return {
    rawX: invertX ? -rx : rx,
    rawY: invertY ? -ry : ry,
    shapedX: sx,
    shapedY: sy,
    magnitude: Math.min(1.5, Math.hypot(sx, sy)),
    active: sx !== 0 || sy !== 0,
  };
}

/** 取第一个已连接的手柄 */
export function firstGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

export function clampCursor(v: number): number {
  return Math.max(CURSOR_MIN, Math.min(CURSOR_MAX, v));
}
