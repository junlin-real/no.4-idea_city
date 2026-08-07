<template>
  <!-- 夜空背景层（渐变）：置于最底层 -->
  <div v-if="isDark" class="stars-sky" aria-hidden="true"></div>

  <!-- 星空画布：透明，渲染在下层背景之上 -->
  <canvas v-if="isDark" ref="starCanvasRef" class="stars-canvas" />

  <!-- 月亮光晕层：独立于画布之上 -->
  <div v-if="isDark" class="moon-glow" aria-hidden="true"></div>

  <!-- 月亮：置于内容上层，保持可点击 -->
  <div v-if="isDark" class="moon" :class="{ shaking: isShaking }" @click="handleClick">
      <svg class="moon-svg" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="moonGrad" cx="63%" cy="45%" r="67%">
            <stop offset="0" stop-color="#fffbd0"/>
            <stop offset="0.55" stop-color="#fff47d"/>
            <stop offset="1" stop-color="#f4cc35"/>
          </radialGradient>
          <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#fffbc1"/>
            <stop offset="1" stop-color="#ffe54f"/>
          </linearGradient>

          <filter id="shine" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="8"/>
          </filter>
          <mask id="crescent">
            <rect width="800" height="800" fill="black"/>
            <circle cx="415" cy="400" r="270" fill="white"/>
            <circle cx="288" cy="302" r="267" fill="black"/>
          </mask>
        </defs>
        <g mask="url(#crescent)">
          <circle cx="415" cy="400" r="270" fill="url(#moonGrad)"/>
          <circle cx="415" cy="400" r="269" fill="none" stroke="url(#rimGrad)" stroke-width="5" opacity=".85"/>
          <g fill="#e7bb29" opacity=".16" filter="url(#shine)">
            <circle cx="487" cy="302" r="19"/><circle cx="558" cy="403" r="13"/>
            <circle cx="468" cy="514" r="22"/><circle cx="394" cy="592" r="14"/>
            <circle cx="569" cy="541" r="10"/><circle cx="518" cy="641" r="17"/>
            <circle cx="615" cy="466" r="8"/><circle cx="432" cy="216" r="10"/>
          </g>
          <g fill="#fffdf0" opacity=".23">
            <circle cx="525" cy="357" r="7"/><circle cx="449" cy="453" r="8"/>
            <circle cx="534" cy="585" r="6"/><circle cx="400" cy="539" r="5"/>
          </g>
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
    </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { makeFragments } from '../composables/burst.js'

const emit = defineEmits(['switchToLight'])

const isDark = ref(false)
const clickCount = ref(0)
const isBreaking = ref(false)
const isShaking = ref(false)
const fragments = reactive([])

function checkDark() {
  isDark.value = document.documentElement.classList.contains('dark-mode')
}

function createFragments() {
  fragments.length = 0
  fragments.push(...makeFragments({
    count: 12,
    distMin: 80,
    distMax: 180,
    sizeMin: 6,
    sizeMax: 18,
    colors: ['#fffbd0', '#fff47d', '#f4cc35', '#ffe54f', '#fff'],
  }))
}

function triggerShake() {
  isShaking.value = true
  setTimeout(() => { isShaking.value = false }, 300)
}

function handleClick() {
  if (isBreaking.value) return

  clickCount.value++
  triggerShake()

  if (clickCount.value >= 3) {
    isBreaking.value = true
    createFragments()
    setTimeout(() => {
      document.documentElement.classList.remove('dark-mode')
      isBreaking.value = false
      clickCount.value = 0
      emit('switchToLight')
    }, 800)
  }
}

// --- 星空特效（2D 粒子 + 鼠标流场） ---
const starCanvasRef = ref(null)
let starCtx = null
let starW = 0
let starH = 0
let stars = []
let starRaf = 0
let lastT = 0

// 全局惯性速度：tx/ty 目标（鼠标位移累加、逐帧衰减），x/y 实际速度（平滑趋近目标）
let velocity = { x: 0, y: 0, tx: 0, ty: 0 }
let lastMX = 0
let lastMY = 0
let lastMT = 0

// 星空蓝光晕（画布层绘制，加色混合）
let blueGlows = []

const CONFIG = {
  PARTICLE_DIV: 5, // 粒子数 = (宽 + 高) / 该值（密度）
  STAR_SIZE: 5, // 速度线基准宽度（粒子体型）
  STAR_MIN_SCALE: 0.2, // 粒子 z 缩放下限（视差系数，参考值）
  OVERFLOW_THRESHOLD: 50, // 出界回收阈值（px，参考值）
  POINTER_GAIN: 3.5, // 鼠标位移 → 目标速度增益（粒子速度 ≈ 鼠标速度 1.45 倍×z）
  VEL_DECAY: 0.96, // 目标速度逐帧衰减（惯性余速，参考值）
  VEL_EASE: 0.05, // 实际速度趋近目标速度的系数（参考值）
  TAIL_LENGTH: 0.066, // 速度线长度 = 速度 × 该值（拖尾加长）
  DRIFT_MIN: 12, // 粒子固有漂移速度下限（px/s）
  DRIFT_MAX: 26, // 粒子固有漂移速度上限（px/s）
}

// hex (#rrggbb) → [r, g, b]，用于构造拖尾渐变
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// 2D 粒子：z 为 0.2~1 视差系数，速度 = 全局惯性速度 × z + 固有漂移
class Star {
  constructor() {
    this.x = Math.random() * starW
    this.y = Math.random() * starH
    this.z = CONFIG.STAR_MIN_SCALE + Math.random() * (1 - CONFIG.STAR_MIN_SCALE)
    this.sizeK = 0.3 + Math.random() * 2.2 // 独立大小系数（0.3~2.5），叠加 z 视差
    // 每个粒子带一点固有漂移速度：鼠标不动时星空也有微动
    const a = Math.random() * Math.PI * 2
    const s = CONFIG.DRIFT_MIN + Math.random() * (CONFIG.DRIFT_MAX - CONFIG.DRIFT_MIN)
    this.dx = Math.cos(a) * s
    this.dy = Math.sin(a) * s
    const roll = Math.random()
    this.color = roll < 0.12 ? '#ff9ed0' // 亮粉
      : roll < 0.2 ? '#d9b8ff' // 淡紫
      : roll < 0.3 ? '#fff3c4' // 淡黄（呼应月亮光晕）
      : roll < 0.38 ? '#ffc4a8' // 淡橙
      : roll < 0.5 ? '#a8d8ff' // 淡蓝（呼应夜空）
      : roll < 0.58 ? '#b5e8e0' // 淡青
      : roll < 0.7 ? '#ffffff' // 纯白
      : '#ffe4f0' // 粉白（主色）
    // 颜色固定不变，构造时解析一次分量，拖尾渐变逐帧复用，省掉逐帧 parseInt
    this.rgb = hexToRgb(this.color)
  }

  // 位移 = (全局速度 × 视差系数 + 固有漂移) × dt；出界按速度方向回收
  update(dt) {
    this.x += (velocity.x * this.z + this.dx) * dt
    this.y += (velocity.y * this.z + this.dy) * dt
    const th = CONFIG.OVERFLOW_THRESHOLD
    if (this.x < -th || this.x > starW + th || this.y < -th || this.y > starH + th) {
      this.recycle()
    }
  }

  // 按速度主导方向从对应边缘重生，形成循环流动
  recycle() {
    const vx = Math.abs(velocity.x)
    const vy = Math.abs(velocity.y)
    const th = CONFIG.OVERFLOW_THRESHOLD
    if (vx > 1 || vy > 1) {
      if (vx > vy) {
        // 水平主导：从左右边缘重生（速度反方向）
        this.x = velocity.x > 0 ? -th : starW + th
        this.y = Math.random() * starH
      } else {
        this.y = velocity.y > 0 ? -th : starH + th
        this.x = Math.random() * starW
      }
    } else {
      this.x = Math.random() * starW
      this.y = Math.random() * starH
    }
    this.z = CONFIG.STAR_MIN_SCALE + Math.random() * (1 - CONFIG.STAR_MIN_SCALE)
  }

  // 速度线（流星彗尾）：单个渐细四边形 + 渐变透明度（连续平滑，无分段分层）；亮度随速度 + 温和闪烁
  render(ctx) {
    const spd = Math.hypot(velocity.x, velocity.y)
    const speedFactor = Math.min(1, spd / 300)
    const alpha = Math.min(1, 0.55 + speedFactor * 0.3 + (Math.random() - 0.5) * 0.3)

    const lw = CONFIG.STAR_SIZE * this.z * this.sizeK * (0.7 + speedFactor * 0.3)
    // 拖尾在运动方向的反方向（粒子身后）；长度随粒子大小缩放：最小 0.5 倍，最大 2.2 倍
    const tailScale = 0.5 + (this.z * this.sizeK - 0.06) * 1.7 / 2.44
    const tailX = -velocity.x * CONFIG.TAIL_LENGTH * tailScale
    const tailY = -velocity.y * CONFIG.TAIL_LENGTH * tailScale
    const len = Math.hypot(tailX, tailY)

    // 拖尾：从头宽 (lw) 平滑收窄到尖端，透明度沿拖尾方向连续衰减
    if (len >= 0.1) {
      const nx = -tailY / len // 拖尾方向单位法向量
      const ny = tailX / len
      const hw = lw / 2
      const tw = hw * 0.08 // 尾端近尖端
      const [r, g, b] = this.rgb
      const grad = ctx.createLinearGradient(this.x, this.y, this.x + tailX, this.y + tailY)
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
      grad.addColorStop(0.25, `rgba(${r},${g},${b},${alpha * 0.75})`)
      grad.addColorStop(0.65, `rgba(${r},${g},${b},${alpha * 0.35})`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(this.x + nx * hw, this.y + ny * hw)
      ctx.lineTo(this.x - nx * hw, this.y - ny * hw)
      ctx.lineTo(this.x + tailX - nx * tw, this.y + tailY - ny * tw)
      ctx.lineTo(this.x + tailX + nx * tw, this.y + tailY + ny * tw)
      ctx.closePath()
      ctx.fill()
    }

    // 头部光核：粒子本体圆点（静止时也显示为圆点）
    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, lw / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function initStars() {
  const count = Math.floor((starW + starH) / CONFIG.PARTICLE_DIV)
  stars = Array.from({ length: count }, () => new Star())
}

// 构建星空蓝光晕：三处柔和蓝色辉光（避开月亮方向）
function buildBlueGlows() {
  if (!starCtx) return
  function glow(cx, cy, r, color, stop) {
    const g = starCtx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(stop, 'rgba(0, 0, 0, 0)')
    return g
  }
  blueGlows = [
    glow(starW * 0.3, starH * 0.65, starW * 0.5, 'rgba(100, 152, 255, 0.17)', 0.68),
    glow(starW * 0.16, starH * 0.16, starW * 0.32, 'rgba(128, 174, 255, 0.13)', 0.62),
    glow(starW * 0.82, starH * 0.85, starW * 0.32, 'rgba(80, 130, 240, 0.10)', 0.65),
  ]
}

function resizeStars() {
  const canvas = starCanvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  starW = window.innerWidth
  starH = window.innerHeight
  canvas.width = starW * dpr
  canvas.height = starH * dpr
  canvas.style.width = starW + 'px'
  canvas.style.height = starH + 'px'
  starCtx = canvas.getContext('2d')
  starCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildBlueGlows()
  initStars()
}

function renderStars(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000)
  lastT = now
  const ctx = starCtx
  if (!ctx) { starRaf = requestAnimationFrame(renderStars); return }

  // 惯性速度：目标逐帧衰减（余速滑行），实际速度平滑趋近目标
  const f = Math.min(4, dt * 60) // 归一化到 60fps
  velocity.tx *= Math.pow(CONFIG.VEL_DECAY, f)
  velocity.ty *= Math.pow(CONFIG.VEL_DECAY, f)
  const ease = Math.min(1, CONFIG.VEL_EASE * f)
  velocity.x += (velocity.tx - velocity.x) * ease
  velocity.y += (velocity.ty - velocity.y) * ease

  // 每帧清屏：画布透明，露出下层背景（夜空渐变 / city3 城市图）
  ctx.clearRect(0, 0, starW, starH)

  // 光效：星空蓝光晕以加色混合叠在下层背景上
  if (blueGlows.length) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 1
    for (const g of blueGlows) {
      ctx.fillStyle = g
      ctx.fillRect(0, 0, starW, starH)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  for (const s of stars) {
    s.update(dt)
    s.render(ctx)
  }
  ctx.globalAlpha = 1
  starRaf = requestAnimationFrame(renderStars)
}

function startStarLoop() {
  stopStarLoop()
  lastT = performance.now()
  starRaf = requestAnimationFrame(renderStars)
}

function stopStarLoop() {
  cancelAnimationFrame(starRaf)
  starRaf = 0
}

// 鼠标移动：位移累加进目标速度（位移 / 灵敏度），带惯性
function onWinMove(e) {
  if (!isDark.value) return
  const now = performance.now()
  if (!lastMT) {
    lastMT = now
    lastMX = e.clientX
    lastMY = e.clientY
    return
  }
  const ox = e.clientX - lastMX
  const oy = e.clientY - lastMY
  velocity.tx += ox * CONFIG.POINTER_GAIN
  velocity.ty += oy * CONFIG.POINTER_GAIN
  lastMX = e.clientX
  lastMY = e.clientY
  lastMT = now
}

watch(isDark, (dark) => {
  if (dark) {
    resizeStars()
    startStarLoop()
  } else {
    stopStarLoop()
  }
}, { flush: 'post' })

onMounted(() => {
  checkDark()
  const observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  window.addEventListener('resize', resizeStars)
  window.addEventListener('mousemove', onWinMove)
  onUnmounted(() => {
    observer.disconnect()
    stopStarLoop()
    window.removeEventListener('resize', resizeStars)
    window.removeEventListener('mousemove', onWinMove)
  })
})
</script>

<style scoped>
/* ===== 月亮 ===== */
.moon {
  position: fixed;
  top: 70px;
  right: 50px;
  width: 90px;
  height: 90px;
  cursor: pointer;
  pointer-events: auto;
  z-index: 998;
  animation: moon-float 6s ease-in-out infinite;
  filter: drop-shadow(0 0 8px rgba(253, 216, 53, 0.6))
          drop-shadow(0 0 20px rgba(253, 216, 53, 0.25));
}

.moon-svg {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

@keyframes moon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* 点击抖动 */
.shaking {
  animation: shake 0.08s ease-in-out 4 !important;
}

@keyframes shake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-5px, 3px); }
  50% { transform: translate(5px, -3px); }
  75% { transform: translate(-3px, -4px); }
}

/* ===== 碎片 ===== */
.fragments {
  position: absolute;
  top: 50%;
  left: 50%;
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
  box-shadow: 0 0 6px var(--color);
}

/* ===== 闪光 ===== */
.flash {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140px;
  height: 140px;
  margin: -70px 0 0 -70px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 251, 208, 0.95) 0%, rgba(255, 244, 125, 0.7) 40%, transparent 70%);
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
    transform: scale(1.3);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* ===== 夜空背景层（渐变） ===== */
.stars-sky {
  position: fixed;
  inset: 0;
  z-index: -4;
  pointer-events: none;
  background: linear-gradient(180deg, #182a45 0%, #111d33 100%);
}

/* ===== 月亮光晕层（独立于画布之上，z 0） ===== */
.moon-glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  /* 月亮中心：距右 95px、距上 115px（与月亮位置对应） */
  background: radial-gradient(circle at calc(100% - 95px) 115px,
    rgba(255, 236, 170, 0.5) 0%,
    rgba(255, 165, 125, 0.35) 12%,
    rgba(120, 90, 140, 0.2) 45%,
    rgba(40, 60, 100, 0.08) 80%,
    rgba(28, 46, 80, 0) 100%);
  mix-blend-mode: screen;
}

/* ===== 星星（canvas） ===== */
.stars-canvas {
  position: fixed;
  inset: 0;
  z-index: -1;
  display: block;
  pointer-events: none;
}
</style>
