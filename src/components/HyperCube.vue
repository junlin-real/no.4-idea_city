<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvasRef = ref(null)
const containerRef = ref(null)

// --- Reactive state ---
const innerHue = ref(0)
const outerHue = ref(180)
const outerSpeed = ref(1)
const innerSpeed = ref(1)
const perspective = ref(1.5)
const spacing = ref(1)

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

  const scale = 140
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
    <div class="canvas-wrap" ref="containerRef">
      <canvas ref="canvasRef"></canvas>
    </div>
    <div class="control-panel">
      <div class="ctrl ctrl-row">
        <label>颜色</label>
        <span class="sub-label">内</span>
        <input type="range" v-model.number="innerHue" min="0" max="360" step="1" />
        <span class="val">{{ innerHue }}</span>
        <span class="sub-label">外</span>
        <input type="range" v-model.number="outerHue" min="0" max="360" step="1" />
        <span class="val">{{ outerHue }}</span>
      </div>
      <div class="ctrl ctrl-row">
        <label>转速</label>
        <span class="sub-label">外</span>
        <input type="range" v-model.number="outerSpeed" min="0" max="5" step="0.1" />
        <span class="val">{{ outerSpeed.toFixed(1) }}</span>
        <span class="sub-label">内</span>
        <input type="range" v-model.number="innerSpeed" min="0" max="5" step="0.1" />
        <span class="val">{{ innerSpeed.toFixed(1) }}</span>
      </div>
      <div class="ctrl ctrl-row">
        <label>透视</label>
        <input type="range" v-model.number="perspective" min="1.05" max="5" step="0.05" />
        <span class="val">{{ perspective.toFixed(1) }}</span>
        <label>间距</label>
        <input type="range" v-model.number="spacing" min="0.3" max="2.5" step="0.1" />
        <span class="val">{{ spacing.toFixed(1) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hypercube-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 280px;
}

.canvas-wrap {
  width: 100%;
  aspect-ratio: 1;
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

.control-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctrl-row {
  gap: 4px;
}

.ctrl label {
  width: 32px;
  font-size: 12px;
  color: var(--text);
  flex-shrink: 0;
  transition: color 0.4s ease;
}

.ctrl .sub-label {
  width: 14px;
  font-size: 11px;
  color: var(--text);
  flex-shrink: 0;
  text-align: center;
  transition: color 0.4s ease;
}

.ctrl input[type="range"] {
  flex: 1;
  min-width: 0;
  height: 3px;
  appearance: none;
  background: var(--border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  transition: background 0.4s ease;
}

.ctrl input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

.ctrl .val {
  width: 22px;
  text-align: right;
  font-size: 11px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  transition: color 0.4s ease;
}
</style>
