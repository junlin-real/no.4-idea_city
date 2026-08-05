<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const canvasRef = ref(null)
const containerRef = ref(null)
const dims = ref({ w: 0, h: 0 })

// --- Reactive state ---
const innerHue = ref(0)
const outerHue = ref(180)
const outerSpeed = ref(1)
const innerSpeed = ref(1)
const perspective = ref(1.5)
const spacing = ref(1)

// --- 拖拽控制按钮 ---
const iconPalette = `
  <path d="M12 22a10 10 0 1 1 10-10c0 1.4-1.1 2.5-2.5 2.5h-2.6a2.9 2.9 0 0 0-2.9 2.9c0 .9.4 1.6.4 2.2 0 1.4-1.1 2.4-2.4 2.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
  <circle cx="7.4" cy="11.2" r="1.3" fill="currentColor"/>
  <circle cx="11" cy="7.6" r="1.3" fill="currentColor"/>
  <circle cx="15.6" cy="8.8" r="1.3" fill="currentColor"/>
  <circle cx="16.6" cy="13.4" r="1.3" fill="currentColor"/>`
const iconWheel = `
  <defs><linearGradient id="hc-wheel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff4d4d"/><stop offset=".2" stop-color="#ffd43b"/>
    <stop offset=".4" stop-color="#51cf66"/><stop offset=".6" stop-color="#339af0"/>
    <stop offset=".8" stop-color="#b197fc"/><stop offset="1" stop-color="#ff4d4d"/>
  </linearGradient></defs>
  <circle cx="12" cy="12" r="8.6" fill="none" stroke="url(#hc-wheel)" stroke-width="3"/>
  <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5"/>`
const iconTurbine = `
  <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/>
  <path d="M12 8.6C13.4 4.4 16.2 2.7 19.9 3.1 19.7 7 17.9 9.9 13.6 11.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M15.4 12C19.6 13.4 21.3 16.2 20.9 19.9 17 19.7 14.1 17.9 12.8 13.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M12 15.4C10.6 19.6 7.8 21.3 4.1 20.9 4.3 17 6.1 14.1 10.4 12.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M8.6 12C4.4 10.6 2.7 7.8 3.1 4.1 7 4.3 9.9 6.1 11.2 10.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`
const iconRotate = `
  <path d="M20 11.5a8 8 0 1 0-2.2 5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
  <path d="M20 5v6.5h-6.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
const iconPersp = `
  <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M3.5 12h17M12 3.5v17" stroke="currentColor" stroke-width="1.2" opacity=".6"/>
  <path d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4" stroke="currentColor" stroke-width="1.2" opacity=".6"/>`
const iconExpand = `
  <path d="M4 12h16M4 12l3-3M4 12l3 3M20 12l-3-3M20 12l-3 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`

const controls = [
  { key: 'innerHue', label: '内色', param: innerHue, def: 0, angle: -90, min: 0, max: 360, sens: 2, persist: true, icon: iconPalette },
  { key: 'outerSpeed', label: '外速', param: outerSpeed, def: 1, angle: -30, min: 0, max: 5, sens: 0.04, persist: false, icon: iconTurbine },
  { key: 'spacing', label: '间距', param: spacing, def: 1, angle: 30, min: 0.3, max: 2.5, sens: 0.02, persist: false, icon: iconExpand },
  { key: 'outerHue', label: '外色', param: outerHue, def: 180, angle: 90, min: 0, max: 360, sens: 2, persist: true, icon: iconWheel },
  { key: 'innerSpeed', label: '内速', param: innerSpeed, def: 1, angle: 150, min: 0, max: 5, sens: 0.04, persist: false, icon: iconRotate },
  { key: 'perspective', label: '透视', param: perspective, def: 1.5, angle: 210, min: 1.05, max: 5, sens: 0.03, persist: false, icon: iconPersp },
]

const fixedColors = {
  outerSpeed: '#f59f0b',
  innerSpeed: '#38bdf8',
  perspective: '#a78bfa',
  spacing: '#34d399',
}

function btnStyle(ctl) {
  const rad = (ctl.angle * Math.PI) / 180
  const color = ctl.key === 'innerHue' ? `hsl(${innerHue.value}, 70%, 55%)`
    : ctl.key === 'outerHue' ? `hsl(${outerHue.value}, 70%, 55%)`
    : fixedColors[ctl.key]
  const r = Math.min(dims.value.w, dims.value.h) * 0.4
  return {
    left: `calc(50% + ${Math.cos(rad) * r}px)`,
    top: `calc(50% + ${Math.sin(rad) * r}px)`,
    color,
  }
}

let dragState = null

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function applyBtnPos(btn, dx, dy) {
  btn.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
}

function onBtnDown(e, ctl) {
  if (dragState) return
  e.preventDefault()
  e.stopPropagation()
  const btn = e.currentTarget
  btn.setPointerCapture(e.pointerId)
  if (btn._tween) { btn._tween.kill(); btn._tween = null }
  const rad = (ctl.angle * Math.PI) / 180
  dragState = {
    ctl, btn,
    startX: e.clientX, startY: e.clientY,
    cos: Math.cos(rad), sin: Math.sin(rad),
    base: ctl.persist ? ctl.param.value : ctl.def,
    dx: 0, dy: 0,
  }
}

function onBtnMove(e, ctl) {
  if (!dragState || dragState.ctl !== ctl) return
  dragState.dx = e.clientX - dragState.startX
  dragState.dy = e.clientY - dragState.startY
  applyBtnPos(dragState.btn, dragState.dx, dragState.dy)
  const disp = dragState.dx * dragState.cos + dragState.dy * dragState.sin
  ctl.param.value = clamp(dragState.base + disp * ctl.sens, ctl.min, ctl.max)
}

function onBtnUp(e, ctl) {
  if (!dragState || dragState.ctl !== ctl) return
  const { btn, dx, dy } = dragState
  dragState = null
  if (btn.hasPointerCapture && btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId)
  if (!ctl.persist) ctl.param.value = ctl.def
  const pos = { dx, dy }
  btn._tween = gsap.to(pos, {
    dx: 0, dy: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)',
    onUpdate: () => applyBtnPos(btn, pos.dx, pos.dy),
    onComplete: () => { btn._tween = null },
  })
}

// --- 4D math helpers ---
class Vec4 {
  constructor(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w }
}

function matMulVec4(mat, v) {
  return new Vec4(
    mat[0][0] * v.x + mat[0][1] * v.y + mat[0][2] * v.z + mat[0][3] * v.w,
    mat[1][0] * v.x + mat[1][1] * v.y + mat[1][2] * v.z + mat[1][3] * v.w,
    mat[2][0] * v.x + mat[2][1] * v.y + mat[2][2] * v.z + mat[2][3] * v.w,
    mat[3][0] * v.x + mat[3][1] * v.y + mat[3][2] * v.z + mat[3][3] * v.w,
  )
}

function mul4(A, B) {
  const C = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}

function rotZW(a) {
  const c = Math.cos(a), s = Math.sin(a)
  return [[1,0,0,0],[0,1,0,0],[0,0,c,-s],[0,0,s,c]]
}

function rotXW(a) {
  const c = Math.cos(a), s = Math.sin(a)
  return [[c,0,0,-s],[0,1,0,0],[0,0,1,0],[s,0,0,c]]
}

function rot3X(angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [[1,0,0],[0,c,-s],[0,s,c]]
}

function rot3Y(angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [[c,0,s],[0,1,0],[-s,0,c]]
}

function mul3(mat, v) {
  return [
    mat[0][0] * v[0] + mat[0][1] * v[1] + mat[0][2] * v[2],
    mat[1][0] * v[0] + mat[1][1] * v[1] + mat[1][2] * v[2],
    mat[2][0] * v[0] + mat[2][1] * v[1] + mat[2][2] * v[2],
  ]
}

// --- Rotation state (two fixed planes: ZW + XW) ---
let outerAngleZW = 0, outerAngleXW = 0
let innerAngleZW = 0, innerAngleXW = 0

// --- View state ---
let viewAngleX = Math.PI / 3
let viewAngleY = 0
let zoom = 1
let dragging = false
let prevMouse = { x: 0, y: 0 }
let animId = 0

// --- Canvas ---
let ctx = null
let W = 0, H = 0

function resize() {
  if (!containerRef.value || !canvasRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  W = rect.width
  H = rect.height
  dims.value = { w: W, h: H }
  canvasRef.value.width = W * dpr
  canvasRef.value.height = H * dpr
  canvasRef.value.style.width = W + 'px'
  canvasRef.value.style.height = H + 'px'
  ctx = canvasRef.value.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// --- Mouse ---
function onMouseDown(e) { dragging = true; prevMouse.x = e.clientX; prevMouse.y = e.clientY }
function onMouseUp() { dragging = false }

function onMouseMove(e) {
  if (!dragging) return
  viewAngleY += (e.clientX - prevMouse.x) * 0.005
  viewAngleX += (e.clientY - prevMouse.y) * 0.005
  viewAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, viewAngleX))
  prevMouse.x = e.clientX
  prevMouse.y = e.clientY
}

function onWheel(e) {
  e.preventDefault()
  zoom = Math.max(0.3, Math.min(3, zoom - e.deltaY * 0.001))
}

// --- Render ---
function render() {
  if (!ctx || W === 0 || H === 0) {
    animId = requestAnimationFrame(render)
    return
  }

  const sp = spacing.value
  const dSafe = perspective.value * Math.sqrt(1 + sp * sp)

  // Update angles (two-plane: ZW + XW at different rates for variety)
  outerAngleZW += 0.01 * outerSpeed.value
  outerAngleXW += 0.007 * outerSpeed.value
  innerAngleZW += 0.01 * innerSpeed.value
  innerAngleXW += 0.007 * innerSpeed.value

  const rotOuter4 = mul4(rotXW(outerAngleXW), rotZW(outerAngleZW))
  const rotInner4 = mul4(rotXW(innerAngleXW), rotZW(innerAngleZW))

  // Build vertices with spacing
  const verts = [
    new Vec4(-1,-1,-1, sp), new Vec4( 1,-1,-1, sp),
    new Vec4( 1, 1,-1, sp), new Vec4(-1, 1,-1, sp),
    new Vec4(-1,-1, 1, sp), new Vec4( 1,-1, 1, sp),
    new Vec4( 1, 1, 1, sp), new Vec4(-1, 1, 1, sp),
    new Vec4(-1,-1,-1,-sp), new Vec4( 1,-1,-1,-sp),
    new Vec4( 1, 1,-1,-sp), new Vec4(-1, 1,-1,-sp),
    new Vec4(-1,-1, 1,-sp), new Vec4( 1,-1, 1,-sp),
    new Vec4( 1, 1, 1,-sp), new Vec4(-1, 1, 1,-sp),
  ]

  const projected3D = []
  for (let i = 0; i < 16; i++) {
    const mat = i < 8 ? rotInner4 : rotOuter4
    const v = matMulVec4(mat, verts[i])
    const wScale = 1 / (dSafe - v.w)
    projected3D.push([v.x * wScale, v.y * wScale, v.z * wScale])
  }

  const scale = Math.min(W, H) * 0.5
  for (let i = 0; i < 16; i++) {
    projected3D[i][0] *= scale
    projected3D[i][1] *= scale
    projected3D[i][2] *= scale
  }

  const rx = rot3X(viewAngleX)
  const ry = rot3Y(viewAngleY)

  const projected2D = []
  const fov = 600
  for (let i = 0; i < 16; i++) {
    let v = projected3D[i]
    v = mul3(ry, v)
    v = mul3(rx, v)
    const zz = v[2] + 400
    projected2D.push({ x: v[0] * fov / (fov + zz), y: v[1] * fov / (fov + zz) })
  }

  // --- Draw ---
  const cx = W / 2, cy = H / 2
  ctx.clearRect(0, 0, W, H)

  // Colors
  const colInner = `hsl(${innerHue.value}, 70%, 55%)`
  const colOuter = `hsl(${outerHue.value}, 70%, 55%)`
  // Circular midpoint
  let midHue = (innerHue.value + outerHue.value) / 2
  if (Math.abs(innerHue.value - outerHue.value) > 180) midHue += 180
  if (midHue >= 360) midHue -= 360
  const colMid = `hsl(${midHue}, 70%, 55%)`

  ctx.lineWidth = 2.5 * zoom
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  function line(a, b) {
    ctx.beginPath()
    ctx.moveTo(cx + a.x * zoom, cy + a.y * zoom)
    ctx.lineTo(cx + b.x * zoom, cy + b.y * zoom)
    ctx.stroke()
  }

  // --- Inner cube edges (dashed, inner color) ---
  ctx.strokeStyle = colInner
  ctx.setLineDash([8 * zoom, 5 * zoom])
  for (let i = 0; i < 4; i++) {
    line(projected2D[i], projected2D[(i + 1) % 4])
    line(projected2D[i + 4], projected2D[((i + 1) % 4) + 4])
    line(projected2D[i], projected2D[i + 4])
  }

  // --- Outer cube edges (solid, outer color) ---
  ctx.strokeStyle = colOuter
  ctx.setLineDash([])
  for (let i = 0; i < 4; i++) {
    line(projected2D[8 + i], projected2D[8 + (i + 1) % 4])
    line(projected2D[8 + i + 4], projected2D[8 + ((i + 1) % 4) + 4])
    line(projected2D[8 + i], projected2D[8 + i + 4])
  }

  // --- Inter-cube connectors (dashed, midpoint color) ---
  ctx.strokeStyle = colMid
  ctx.setLineDash([8 * zoom, 5 * zoom])
  for (let i = 0; i < 8; i++) {
    line(projected2D[i], projected2D[i + 8])
  }
  ctx.setLineDash([])

  // --- Inner vertex dots ---
  ctx.fillStyle = colInner
  const dotR = 5 * zoom
  for (let i = 0; i < 8; i++) {
    const p = projected2D[i]
    ctx.beginPath()
    ctx.arc(cx + p.x * zoom, cy + p.y * zoom, dotR, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Outer vertex dots ---
  ctx.fillStyle = colOuter
  for (let i = 8; i < 16; i++) {
    const p = projected2D[i]
    ctx.beginPath()
    ctx.arc(cx + p.x * zoom, cy + p.y * zoom, dotR, 0, Math.PI * 2)
    ctx.fill()
  }

  animId = requestAnimationFrame(render)
}

// --- Lifecycle ---
onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  animId = requestAnimationFrame(render)

  const el = canvasRef.value
  if (el) {
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    el.addEventListener('wheel', onWheel, { passive: false })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  cancelAnimationFrame(animId)
  const el = canvasRef.value
  if (el) {
    el.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('wheel', onWheel)
  }
})
</script>

<template>
  <div class="hypercube-root">
    <div class="hypercube-stage">
      <div class="canvas-wrap" ref="containerRef">
        <canvas ref="canvasRef"></canvas>
      </div>
      <button
        v-for="ctl in controls"
        :key="ctl.key"
        class="cube-btn"
        :aria-label="ctl.label"
        :style="btnStyle(ctl)"
        @pointerdown="onBtnDown($event, ctl)"
        @pointermove="onBtnMove($event, ctl)"
        @pointerup="onBtnUp($event, ctl)"
        @pointercancel="onBtnUp($event, ctl)"
      >
        <svg class="ctl-icon" viewBox="0 0 24 24" v-html="ctl.icon" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.hypercube-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.hypercube-stage {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
}

.canvas-wrap:active {
  cursor: grabbing;
}

.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ===== 拖拽控制按钮 ===== */
.cube-btn {
  position: absolute;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  border: 1px solid var(--border);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transform: translate(-50%, -50%);
  z-index: 2;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.4s ease;
}

.cube-btn:hover {
  border-color: currentColor;
  box-shadow: var(--shadow);
}

.cube-btn:active {
  cursor: grabbing;
}

.ctl-icon {
  width: 24px;
  height: 24px;
  pointer-events: none;
  transition: transform 0.2s;
}

.cube-btn:hover .ctl-icon {
  transform: scale(1.12);
}
</style>
