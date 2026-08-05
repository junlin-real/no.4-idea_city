<template>
  <!-- 星空画布：置于页面内容最底层 -->
  <canvas v-if="isDark" ref="starCanvasRef" class="stars-canvas" />

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
  const count = 12
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + (Math.random() * 30 - 15)
    const dist = 80 + Math.random() * 100
    const rad = (angle * Math.PI) / 180
    const tx = Math.cos(rad) * dist
    const ty = Math.sin(rad) * dist
    const rot = Math.random() * 720 - 360
    const size = 6 + Math.random() * 12
    const delay = Math.random() * 80
    const colors = ['#fffbd0', '#fff47d', '#f4cc35', '#ffe54f', '#fff']
    const color = colors[Math.floor(Math.random() * colors.length)]
    fragments.push({ tx, ty, rot, size, delay, color, id: i })
  }
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

// 星空渐变背景（夜空蓝底 + 月亮光晕）
let skyGradient = null
let haloGradient = null

const CONFIG = {
  MOON_CENTER_X_RIGHT: 95, // 月亮中心距右边缘 px（月亮 90px 宽，right: 50px）
  MOON_CENTER_Y_TOP: 115, // 月亮中心距上边缘 px（top: 70px + 45px）
  PARTICLE_DIV: 5, // 粒子数 = (宽 + 高) / 该值（密度更大）
  STAR_SIZE: 3, // 速度线基准宽度（参考值）
  STAR_MIN_SCALE: 0.2, // 粒子 z 缩放下限（视差系数，参考值）
  OVERFLOW_THRESHOLD: 50, // 出界回收阈值（px，参考值）
  POINTER_GAIN: 3.5, // 鼠标位移 → 目标速度增益（粒子速度 ≈ 鼠标速度 1.45 倍×z）
  VEL_DECAY: 0.96, // 目标速度逐帧衰减（惯性余速，参考值）
  VEL_EASE: 0.05, // 实际速度趋近目标速度的系数（参考值）
  TAIL_LENGTH: 0.066, // 速度线长度 = 速度 × 该值（拖尾加长）
  DRIFT_MIN: 12, // 粒子固有漂移速度下限（px/s）
  DRIFT_MAX: 26, // 粒子固有漂移速度上限（px/s）
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

  // 速度线（流星彗尾）：沿全局速度方向 4 段延伸，越远越细越淡；亮度随速度 + 温和闪烁
  render(ctx) {
    const spd = Math.hypot(velocity.x, velocity.y)
    const speedFactor = Math.min(1, spd / 300)
    const alpha = Math.min(1, 0.55 + speedFactor * 0.3 + (Math.random() - 0.5) * 0.3)

    // 拖尾在运动方向的反方向（粒子身后）
    let tailX = -velocity.x * CONFIG.TAIL_LENGTH
    let tailY = -velocity.y * CONFIG.TAIL_LENGTH
    if (Math.abs(tailX) < 0.1) tailX = 0.5
    if (Math.abs(tailY) < 0.1) tailY = 0.5

    const lw = CONFIG.STAR_SIZE * this.z * this.sizeK * (0.7 + speedFactor * 0.3)
    const SEGMENTS = 4
    ctx.lineCap = 'round'
    ctx.strokeStyle = this.color
    for (let i = SEGMENTS; i >= 1; i--) {
      const a = (i - 1) / SEGMENTS
      const b = i / SEGMENTS
      const segDist = (a + b) / 2 // 距粒子越近越小（亮粗），越远越大（淡细）
      ctx.globalAlpha = alpha * (1 - segDist * 0.85)
      ctx.lineWidth = lw * (1 - segDist * 0.7)
      ctx.beginPath()
      ctx.moveTo(this.x + tailX * a, this.y + tailY * a)
      ctx.lineTo(this.x + tailX * b, this.y + tailY * b)
      ctx.stroke()
    }
  }
}

function initStars() {
  const count = Math.floor((starW + starH) / CONFIG.PARTICLE_DIV)
  stars = Array.from({ length: count }, () => new Star())
}

// 构建背景：淡红（月亮）→ 夜空蓝全屏平滑过渡
function buildGradients() {
  if (!starCtx) return
  skyGradient = starCtx.createLinearGradient(0, 0, 0, starH)
  skyGradient.addColorStop(0, '#182a45')
  skyGradient.addColorStop(1, '#111d33')
  const mx = starW - CONFIG.MOON_CENTER_X_RIGHT
  const my = CONFIG.MOON_CENTER_Y_TOP
  // 全屏径向：月亮附近淡黄→淡红，向外平滑过渡到夜空蓝
  const r = Math.hypot(mx, my) * 1.1
  haloGradient = starCtx.createRadialGradient(mx, my, 0, mx, my, r)
  haloGradient.addColorStop(0, 'rgba(255, 236, 170, 0.45)') // 淡黄（月亮核心）
  haloGradient.addColorStop(0.12, 'rgba(255, 165, 125, 0.32)') // 淡红
  haloGradient.addColorStop(0.45, 'rgba(120, 90, 140, 0.18)') // 红紫过渡
  haloGradient.addColorStop(0.8, 'rgba(40, 60, 100, 0.08)') // 偏蓝
  haloGradient.addColorStop(1, 'rgba(28, 46, 80, 0)') // 融入夜空蓝
}

// 首帧铺满背景打底
function paintBase() {
  if (!starCtx) return
  starCtx.globalAlpha = 1
  starCtx.fillStyle = skyGradient
  starCtx.fillRect(0, 0, starW, starH)
  starCtx.fillStyle = haloGradient
  starCtx.fillRect(0, 0, starW, starH)
  starCtx.globalAlpha = 1
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
  buildGradients()
  paintBase()
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

  // 每帧清屏重绘背景与粒子：粒子运动不留下蒙版轨迹
  ctx.clearRect(0, 0, starW, starH)
  ctx.globalAlpha = 1
  ctx.fillStyle = skyGradient
  ctx.fillRect(0, 0, starW, starH)
  ctx.fillStyle = haloGradient
  ctx.fillRect(0, 0, starW, starH)

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

@keyframes shatter {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  60% {
    opacity: 0.9;
  }
  100% {
    transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.3);
    opacity: 0;
  }
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

/* ===== 星星（canvas） ===== */
.stars-canvas {
  position: fixed;
  inset: 0;
  z-index: -1;
  display: block;
  pointer-events: none;
}
</style>
