<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { makeFragments } from '../composables/burst.js'

const emit = defineEmits(['broken'])

const host = ref(null)
const ropeRef = ref(null)
const lampRef = ref(null)

/* ============ ① CONFIG：全部可调参数 ============ */
const CONFIG = {
  pivot: { x: 120, y: 16 }, // 悬挂点（组件坐标）
  segs: 9,                  // 绳段数
  segLen: 11,               // 每段长度 → 总绳长约 99px
  gravity: 0.35,            // 每帧重力 (px)
  damping: 0.97,            // 空气阻尼（速度衰减）
  stiffness: 0.6,           // 约束刚度：越小越弹，越大越硬
  iterations: 3,            // 每帧约束求解次数
  knockSpeed: 5,            // 甩动判定线速度阈值 (px/帧)
  maxReleaseV: 8,           // 松手限速（绳未拉长时）
}

/* ============ ② 状态工厂：生成绳索质点 ============ */
function createRope() {
  const { pivot, segs, segLen } = CONFIG
  const pts = []
  for (let i = 0; i <= segs; i++) {
    const y = pivot.y + i * segLen
    pts.push({ x: pivot.x, y, px: pivot.x, py: y, fixed: i === 0, dragged: false })
  }
  return pts
}

// pts[0] 固定在悬挂点，pts[segs] 是灯
const pts = createRope()
const tail = () => pts[pts.length - 1]

/* ============ ③ 物理核心（纯函数，不碰 DOM/Vue） ============ */
// Verlet 积分：拖拽中的质点由指针直接控制，跳过积分
function integrate() {
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    if (p.dragged) continue
    const vx = (p.x - p.px) * CONFIG.damping
    const vy = (p.y - p.py) * CONFIG.damping
    p.px = p.x
    p.py = p.y
    p.x += vx
    p.y += vy + CONFIG.gravity
  }
}

// PBD 距离约束（tension-only）：只有被拉长的段才有恢复力，松弛段自由下垂。
// 每次迭代只修一部分（× stiffness），猛拽时一次修不完 → 自然出现拉长 + 弹性抵抗
function solveConstraints() {
  for (let it = 0; it < CONFIG.iterations; it++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy)
      if (dist <= CONFIG.segLen) continue
      const pull = (dist - CONFIG.segLen) * CONFIG.stiffness
      const nx = dx / dist
      const ny = dy / dist
      if (!a.fixed && !a.dragged) {
        a.x += nx * pull * 0.5
        a.y += ny * pull * 0.5
      }
      if (!b.fixed && !b.dragged) {
        b.x -= nx * pull * 0.5
        b.y -= ny * pull * 0.5
      }
    }
  }
}

function stepPhysics() {
  integrate()
  solveConstraints()
}

/* ============ ④ 拖拽输入（指针事件只做坐标换算） ============ */
let dragging = false
let pointerId = null
let startPos = { x: 0, y: 0 }
let moved = false
let dragVel = { x: 0, y: 0 }
let lastDrag = { t: 0, x: 0, y: 0 }

function onPointerDown(e) {
  // 只拦碎裂动画中；破碎后残骸仍可拖拽晃动
  if (isBreaking.value) return
  dragging = true
  moved = false
  pointerId = e.pointerId
  startPos = { x: e.clientX, y: e.clientY }
  lastDrag = { t: performance.now(), x: e.clientX, y: e.clientY }
  dragVel = { x: 0, y: 0 }
  tail().dragged = true
  e.currentTarget.setPointerCapture(pointerId)
}

function onPointerMove(e) {
  if (!dragging) return
  const now = performance.now()
  const dt = now - lastDrag.t
  if (dt > 0) {
    // 归一化到 60fps 帧的线速度（甩动判定用）
    dragVel.x = ((e.clientX - lastDrag.x) / dt) * 16.67
    dragVel.y = ((e.clientY - lastDrag.y) / dt) * 16.67
  }
  const rect = host.value.getBoundingClientRect()
  const anchor = pts[0]
  const t = tail()
  const tx = e.clientX - rect.left
  const ty = e.clientY - rect.top

  // 拉长上限（约一屏高）：超限脱手，超出量转成回弹初速度
  const maxReach = window.innerHeight
  const dist = Math.hypot(tx - anchor.x, ty - anchor.y)
  if (dist > maxReach) {
    const bounce = Math.min((dist - maxReach) * 0.6, 30)
    t.x = tx
    t.y = ty
    t.px = tx + ((tx - anchor.x) / dist) * bounce
    t.py = ty + ((ty - anchor.y) / dist) * bounce
    endDrag(e)
  } else {
    // 拖拽中：末端钉在指针上，px 记录甩动速度，松手即释放
    t.x = tx
    t.y = ty
    t.px = tx - dragVel.x
    t.py = ty - dragVel.y
  }

  if (Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 6) moved = true
  lastDrag = { t: now, x: e.clientX, y: e.clientY }
}

function onPointerUp(e) {
  if (!dragging) return
  endDrag(e)

  // 绳未拉长时松手：把速度钳到自然上限，避免快速拖拽松手后大幅摆动
  // （绳已拉长时保留速度，回弹效果不受影响）
  const t = tail()
  const anchor = pts[0]
  if (Math.hypot(t.x - anchor.x, t.y - anchor.y) <= CONFIG.segs * CONFIG.segLen) {
    const vx = t.x - t.px
    const vy = t.y - t.py
    const v = Math.hypot(vx, vy)
    if (v > CONFIG.maxReleaseV) {
      const k = CONFIG.maxReleaseV / v
      t.px = t.x - vx * k
      t.py = t.y - vy * k
    }
  }

  // 白天状态下每次松手（点击/甩动）都散光粒子；破碎后不再散
  if (!isBroken.value && !isBreaking.value) {
    spawnSparks()
  }

  // 甩动（线速度够大）或原地点击 → 计一次敲击（破碎后由 handleKnock 内部拦截）
  if (Math.hypot(dragVel.x, dragVel.y) > CONFIG.knockSpeed || !moved) {
    handleKnock()
  }
}

function endDrag(e) {
  dragging = false
  tail().dragged = false
  try {
    e.currentTarget.releasePointerCapture(pointerId)
  } catch {}
}

/* ============ ⑤ 交互：敲击与击碎 ============ */
const clickCount = ref(0)
const isBreaking = ref(false)
const isBroken = ref(false)

function handleKnock() {
  if (isBroken.value || isBreaking.value) return
  clickCount.value++

  // 敲击冲量：随点击次数线性渐进（第1击最小 ≈2.3，第3击 = 幅度 7）
  const t = tail()
  const dir = t.x >= CONFIG.pivot.x ? 1 : -1
  t.px -= dir * 7 * (clickCount.value / 3)

  if (clickCount.value >= 3) {
    isBreaking.value = true
    createFragments()
    setTimeout(() => {
      isBreaking.value = false
      isBroken.value = true
      emit('broken')
    }, 800)
  }
}

/* ============ ⑥ 特效：碎片与光粒子 ============ */
const fragments = reactive([])

function createFragments() {
  fragments.length = 0
  fragments.push(...makeFragments({
    count: 10,
    distMin: 40,
    distMax: 110,
    sizeMin: 4,
    sizeMax: 12,
  }))
}

const sparks = reactive([])
let sparkId = 0

function spawnSparks() {
  const n = 6 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2
    const dist = 18 + Math.random() * 22
    sparks.push({
      id: sparkId++,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 60,
      color: i % 2 ? '#FFF' : '#FFE066',
    })
  }
  setTimeout(() => {
    sparks.length = 0
  }, 650)
}

/* ============ ⑦ 渲染 ============ */
function render() {
  const rope = ropeRef.value
  const lamp = lampRef.value
  if (!rope || !lamp) return
  rope.setAttribute(
    'points',
    pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  )
  const last = tail()
  // 绳拉长超过初始长度时，整个吊灯转向绳子方向；未拉长保持垂直
  const anchor = pts[0]
  const dx = last.x - anchor.x
  const dy = last.y - anchor.y
  const deg = Math.hypot(dx, dy) > CONFIG.segs * CONFIG.segLen
    ? (Math.atan2(dy, dx) * 180) / Math.PI - 90
    : 0
  lamp.style.transform = `translate(${last.x.toFixed(1)}px, ${last.y.toFixed(1)}px) rotate(${deg.toFixed(1)}deg)`
}

function tick() {
  stepPhysics()
  render()
  raf = requestAnimationFrame(tick)
}

/* ============ ⑧ 生命周期 ============ */
let raf = null

onMounted(() => {
  // 初始微晃：给中间一段速度，让绳一出现就轻轻波动
  pts[Math.floor(CONFIG.segs / 2)].px -= 3
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div
    ref="host"
    class="pendant"
    :class="{ broken: isBroken }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- 绳索层（质点折线） -->
    <svg class="rope-svg" viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <circle :cx="CONFIG.pivot.x" :cy="CONFIG.pivot.y" r="5" fill="#5c5c66" />
      <polyline ref="ropeRef" points="" stroke="#8a8a93" stroke-width="2" stroke-linecap="round" />
    </svg>

    <!-- 灯体（跟随最后质点） -->
    <div ref="lampRef" class="lamp-html">
      <svg class="lamp-svg" viewBox="-30 -4 60 52" fill="none" aria-hidden="true">
        <!-- 正常吊灯：灯帽 → 灯罩 → 底部开口 → 发光灯泡 -->
        <g v-if="!isBroken">
          <defs>
            <radialGradient id="bulb-glow" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stop-color="#fff7c7" />
              <stop offset="65%" stop-color="#ffd76a" />
              <stop offset="100%" stop-color="#f4b83f" />
            </radialGradient>
            <!-- 月亮光晕式渐变：起始色 = 灯泡呼吸光效 #ffd76a，后接 橙 → 紫 → 蓝灰 → 透明 -->
            <linearGradient id="beam-grad" x1="0" y1="27" x2="0" y2="225" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#ffd76a" stop-opacity="0.5" />
              <stop offset="12%" stop-color="#FFA57D" stop-opacity="0.35" />
              <stop offset="45%" stop-color="#785A8C" stop-opacity="0.2" />
              <stop offset="80%" stop-color="#283C64" stop-opacity="0.08" />
              <stop offset="100%" stop-color="#1C2E50" stop-opacity="0" />
            </linearGradient>
          </defs>
          <!-- 灯帽（连接绳） -->
          <rect x="-6" y="-8" width="12" height="5" rx="2" fill="#303236" />
          <rect x="-10" y="-3" width="20" height="7" rx="3" fill="#303236" />
          <!-- 灯罩（拱形帐篷） -->
          <path d="M-22 4 Q0 -6 22 4 L25 16 Q0 21 -25 16 Z" fill="#34363a" />
          <ellipse cx="0" cy="17" rx="24" ry="5" fill="#f7edcf" />
          <path d="M-24 17 Q0 22 24 17" fill="none" stroke="#26282b" stroke-width="2" />
          <!-- 灯泡颈 -->
          <rect x="-3.5" y="14" width="7" height="6" rx="2" fill="#e9b64f" />
          <!-- 手电筒光柱：起始边 = 灯泡水平直径（y27, ±12），向下扩散至 ±45，长度 198（y 27→225） -->
          <path d="M-12 27 L12 27 L45 225 L-45 225 Z" fill="url(#beam-grad)" />
          <!-- 灯泡光晕（呼吸发光） -->
          <circle cx="0" cy="27" r="17" fill="#ffd76a" opacity="0.28" class="pend-glow" />
          <!-- 灯泡主体（加大 + 玻璃描边） -->
          <circle cx="0" cy="27" r="12" fill="url(#bulb-glow)" stroke="#E6A800" stroke-width="1" />
          <!-- 高光 -->
          <line x1="-4" y1="19.5" x2="-4" y2="28" stroke="#fff8dc" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
          <line x1="0" y1="18" x2="0" y2="30" stroke="#fff8dc" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
          <line x1="4" y1="19.5" x2="4" y2="28" stroke="#fff8dc" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
          <path d="M-4 33.5 Q0 37 4 33.5" fill="none" stroke="#fff8dc" stroke-width="1.8" stroke-linecap="round" opacity="0.9" />
        </g>

        <!-- 破碎吊灯：灯帽、灯罩、开口、颈全部保持原样，仅灯泡碎裂熄灭 -->
        <g v-else class="pend-wreck">
          <rect x="-6" y="-8" width="12" height="5" rx="2" fill="#303236" />
          <rect x="-10" y="-3" width="20" height="7" rx="3" fill="#303236" />
          <path d="M-22 4 Q0 -6 22 4 L25 16 Q0 21 -25 16 Z" fill="#34363a" />
          <ellipse cx="0" cy="17" rx="24" ry="5" fill="#f7edcf" />
          <path d="M-24 17 Q0 22 24 17" fill="none" stroke="#26282b" stroke-width="2" />
          <rect x="-3.5" y="14" width="7" height="6" rx="2" fill="#e9b64f" />
          <!-- 灯泡碎裂（无光，尺寸适配 r12） -->
          <path d="M-12 27 A12 12 0 0 1 0 15 M0 15 A12 12 0 0 1 12 27" fill="none" stroke="#8a8a93" stroke-width="1.5" stroke-linecap="round" />
          <path d="M-12 27 Q0 39 12 27" fill="none" stroke="#8a8a93" stroke-width="1.5" stroke-linecap="round" />
          <path d="M-6 21 L-3 27 M-2 21 L2 27 M4 21 L6 26" stroke="#666" stroke-width="1.2" stroke-linecap="round" />
          <path d="M-5 33 L-2 29 M2 33 L-2 29" stroke="#666" stroke-width="1.2" stroke-linecap="round" />
          <path d="M-3 37 L0 33 M3 37 L0 33" stroke="#777" stroke-width="1" stroke-linecap="round" opacity="0.8" />
        </g>
      </svg>

      <!-- 碎片层 -->
      <div v-if="isBreaking" class="fragments">
        <span
          v-for="f in fragments"
          :key="f.id"
          class="fragment"
          :style="{
            '--tx': f.tx + 'px',
            '--ty': f.ty + 'px',
            '--rot': f.rot + 'deg',
            '--size': f.size + 'px',
            '--delay': f.delay + 'ms',
            '--color': f.color,
          }"
        />
      </div>

      <!-- 闪光层 -->
      <div v-if="isBreaking" class="flash" />

      <!-- 光粒子层（每次点击迸发，从灯泡中心散开） -->
      <div v-if="sparks.length" class="sparks">
        <span
          v-for="s in sparks"
          :key="s.id"
          class="spark"
          :style="{
            '--tx': s.tx + 'px',
            '--ty': s.ty + 'px',
            '--size': s.size + 'px',
            '--delay': s.delay + 'ms',
            '--color': s.color,
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pendant {
  position: relative;
  width: 240px;
  height: 240px;
  margin: 0 auto;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.pendant:active {
  cursor: grabbing;
}

/* 破碎后残骸仍可拖拽晃动 */

.rope-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.lamp-html {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  /* 旋转锚点 = 绳尖 = 灯罩上方边缘（viewBox 原点已对齐灯罩上口 y=4） */
  transform-origin: 0px 0px;
}

.lamp-svg {
  width: 78px; /* 灯体 1.3 倍：60×52 → 78×67.6 */
  height: 67.6px;
  margin: -10.4px 0 0 -39px;
  overflow: visible;
}

/* 灯泡呼吸光 */
.pend-glow {
  animation: pend-pulse 2s ease-in-out infinite;
}

@keyframes pend-pulse {
  0%, 100% { opacity: 0.18; r: 14; }
  50% { opacity: 0.38; r: 20; }
}

.pend-wreck {
  opacity: 0.75;
  filter: saturate(0.25);
}

/* ===== 碎片 ===== */
.fragments {
  position: absolute;
  top: 30px; /* 灯泡中心（viewBox 27 → CSS 30） */
  left: 0;
  z-index: 2;
  pointer-events: none;
}

.fragment {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: var(--color);
  border-radius: 2px;
  opacity: 1;
  animation: shatter 0.7s var(--delay) ease-out forwards;
  box-shadow: 0 0 4px var(--color);
}

/* ===== 闪光 ===== */
.flash {
  position: absolute;
  top: 0;
  left: 0;
  width: 120px;
  height: 120px;
  margin: -30px 0 0 -60px; /* 中心对齐灯泡（30px） */
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 224, 102, 0.6) 40%, transparent 70%);
  z-index: 3;
  pointer-events: none;
  animation: flash-burst 0.4s ease-out forwards;
}

@keyframes flash-burst {
  0% {
    transform: scale(0.3);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* ===== 光粒子（每次点击/松手迸发，仅白天态） ===== */
.sparks {
  position: absolute;
  top: 30px; /* 灯泡中心（viewBox 27 → CSS 30） */
  left: 0;
  z-index: 2;
  pointer-events: none;
}

.spark {
  position: absolute;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: var(--color);
  box-shadow: 0 0 6px var(--color);
  animation: spark-fly 0.5s var(--delay) ease-out forwards;
}

@keyframes spark-fly {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) scale(0.2);
    opacity: 0;
  }
}
</style>
