/**
 * Sound Space 舞台绘制（游玩与手感测试共用，保证两边画出来的是同一个东西）
 *
 * 世界坐标与 Rhythia 一致：x ∈ [0,2]，y = -网格Y，z = -距离，相机在 (camX, camY, CAM_Z)。
 */
export const CAM_Z = 3.75;

export interface Projected {
  x: number;
  y: number;
  s: number;
  depth: number;
}

/** 相机跟随准星的小幅平移（原作的 half-lock 视差） */
export function camOffset(cursorX: number, cursorY: number) {
  return {
    camX: 1 + (cursorX - 1) * 0.08,
    camY: -1 + (-cursorY + 1) * 0.08,
  };
}

export function focal(w: number, h: number, fov: number) {
  return (h / 2) / Math.tan((fov * Math.PI) / 360);
}

export function makeProjector(w: number, h: number, fov: number, camX: number, camY: number) {
  const f = focal(w, h, fov);
  return (wx: number, wy: number, wz = 0): Projected => {
    const depth = CAM_Z - wz;
    const s = f / Math.max(0.001, depth);
    return { x: w / 2 + (wx - camX) * s, y: h / 2 - (wy - camY) * s, s, depth };
  };
}

/** 判定面网格 + 边框（原作的 3x3 网格） */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number, z?: number) => Projected,
  gridAlpha = 0.1,
) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(255,255,255,${gridAlpha})`;
  for (let i = 0; i <= 2; i++) {
    const a1 = project(i, 0);
    const a2 = project(i, -2);
    ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
    const b1 = project(0, -i);
    const b2 = project(2, -i);
    ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
  }
  const p0 = project(0, 0);
  const p1 = project(2, 0);
  const p2 = project(2, -2);
  const p3 = project(0, -2);
  ctx.strokeStyle = 'rgba(53,191,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
  ctx.closePath();
  ctx.stroke();
}

/** 准星 */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number, z?: number) => Projected,
  cursorX: number,
  cursorY: number,
  cursorScale: number,
) {
  const c = project(cursorX, -cursorY);
  const size = 16 * cursorScale;
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#35BFFF';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(c.x, c.y, size, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c.x - size * 1.6, c.y); ctx.lineTo(c.x - size * 0.6, c.y);
  ctx.moveTo(c.x + size * 0.6, c.y); ctx.lineTo(c.x + size * 1.6, c.y);
  ctx.moveTo(c.x, c.y - size * 1.6); ctx.lineTo(c.x, c.y - size * 0.6);
  ctx.moveTo(c.x, c.y + size * 0.6); ctx.lineTo(c.x, c.y + size * 1.6);
  ctx.stroke();
  ctx.restore();
}

/** 右下角的摇杆盘：显示当前摇杆（或自动瞄准）的位置 */
export function drawStickDisc(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  x: number, y: number,
  opts: { deadzone?: number; label?: string } = {},
) {
  const dz = Math.max(0, Math.min(0.95, opts.deadzone ?? 0.12));
  ctx.save();
  // 底盘
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,9,14,0.38)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 十字参考线
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.stroke();
  // 死区环
  ctx.beginPath();
  ctx.arc(cx, cy, r * dz, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.stroke();
  // 摇杆点
  const px = cx + Math.max(-1, Math.min(1, x)) * r * 0.82;
  const py = cy + Math.max(-1, Math.min(1, y)) * r * 0.82;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(190,225,255,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(53,191,255,0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

