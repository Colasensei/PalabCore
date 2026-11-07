/**
 * Sound Space 的准星动力学（人手轨迹模拟）
 *
 * 「装帅模式」已下线：控制台入口（palabFlex / window.__palabFlex）被移除，
 * isFlexMode() 恒为 false，相关判定分支不会再进入。
 *
 * 保留这里的弹簧-阻尼-手抖模型，因为 Auto Play 的准星动画仍然用它：
 * 让自动瞄准的轨迹看起来像真人在打，而不是机械地线性跟随。
 */

/** 装帅模式：已下线，恒为 false */
export function isFlexMode(): boolean {
  return false;
}

/** 装帅模式的准星动力学：给目标点，返回下一步的位置（手感像真人手在动） */
export interface FlexMotion {
  x: number;
  y: number;
  vx: number;
  vy: number;
  nextAt: number;
  driftX: number;
  driftY: number;
}

export function createFlexMotion(): FlexMotion {
  return { x: 1, y: 1, vx: 0, vy: 0, nextAt: 0, driftX: 0, driftY: 0 };
}

/**
 * 推进一帧
 * @param m 运动状态
 * @param tx/ty 目标点（摇杆/鼠标推出来的位置）
 * @param dt 秒
 */
export function stepFlexMotion(m: FlexMotion, tx: number, ty: number, dt: number): void {
  const t = performance.now();
  // 每隔一小段时间换一个「手抖」的偏移方向，模拟微小的不稳定
  if (t > m.nextAt) {
    m.nextAt = t + 120 + Math.random() * 260;
    m.driftX = (Math.random() - 0.5) * 0.05;
    m.driftY = (Math.random() - 0.5) * 0.05;
  }
  const k = 260;      // 弹簧刚度（越大越跟手）
  const c = 26;       // 阻尼（越大越不抖）
  const ax = (tx + m.driftX - m.x) * k - m.vx * c;
  const ay = (ty + m.driftY - m.y) * k - m.vy * c;
  m.vx += ax * dt;
  m.vy += ay * dt;
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  // 人类会有轻微过冲，把速度上限压一下，避免真的甩飞
  const maxV = 9;
  m.vx = Math.max(-maxV, Math.min(maxV, m.vx));
  m.vy = Math.max(-maxV, Math.min(maxV, m.vy));
}
