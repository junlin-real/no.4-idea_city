<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Project_Card from './Project_Card.vue'
import { portfolioItems } from './projects.js'

const items = portfolioItems

// 整体旋转角度（连续值，所有卡片一起转）
const rotation = ref(0)
const modalItem = ref(null)
const flipped = ref(false)
const sceneRef = ref(null)
const containerW = ref(0)

let autoRaf = null
let holding = false
let holdUntil = 0
let lastAutoTime = 0
let momentumFrame = null
let isDragging = false
let dragStartX = 0
let dragStartRotation = 0
let velocityTracker = { x: 0, time: 0 }
let lastDragX = 0
let lastDragTime = 0
let velocity = 0

// 按项目数量均匀分布角度，所有卡片同时可见
const anglePerCard = 360 / items.length
const CARD_HALF = 110 // 卡片半宽（Project_Card 220px）
const SIDE_GAP = 24 // 卡片与视口边缘的留白

function getCardStyle(index) {
  // 每张卡片相对于当前旋转角度的偏移
  const cardAngle = index * anglePerCard + rotation.value
  // 归一化到 -180 ~ 180
  let normalized = ((cardAngle % 360) + 540) % 360 - 180

  // normalized=0 表示正前方
  const absNorm = Math.abs(normalized)

  // 3 张主卡（正前 + 两侧）始终显示；更多卡片仅在视口放得下时淡显
  const isMain = absNorm <= 90
  const fitNorm = (containerW.value / 2 - CARD_HALF - SIDE_GAP) / 1.8
  const visible = (isMain || absNorm <= fitNorm) && absNorm < 160

  const translateX = normalized * 1.8
  const rotate = normalized * 0.15
  const scale = absNorm < 15 ? 1.05 : absNorm < 55 ? 0.9 : absNorm < 100 ? 0.78 : 0.62
  const opacity = absNorm < 35 ? 1 : absNorm < 80 ? 0.75 : absNorm < 130 ? 0.45 : 0.22
  const zIndex = Math.round((180 - absNorm) * 10)

  return {
    transform: `translateX(${translateX}px) rotate(${rotate}deg) scale(${scale})`,
    opacity: visible ? opacity : 0,
    zIndex,
    pointerEvents: visible ? 'auto' : 'none',
  }
}

const GLIDE_SPEED = 45 // 基础角速度 °/s
const HOLD_MS = 2000 // 每张卡片居中的停留时长

function startAuto() {
  stopAuto()
  lastAutoTime = performance.now()
  autoRaf = requestAnimationFrame(autoTick)
}

function stopAuto() {
  if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = null }
  holding = false
}

function autoTick(now) {
  const dt = (now - lastAutoTime) / 1000
  lastAutoTime = now

  if (holding && now >= holdUntil) holding = false

  if (!holding) {
    const snap = nextSnap(rotation.value, anglePerCard, -1)
    const dist = snap - rotation.value
    const remaining = Math.abs(dist)

    if (remaining < 0.05) {
      // 已精确停在居中位置，停留 HOLD_MS 后继续滚动
      rotation.value = snap
      holding = true
      holdUntil = now + HOLD_MS
    } else {
      // 匀速滑动，接近目标时减速缓入
      const speed = Math.min(GLIDE_SPEED, remaining * 6)
      rotation.value += Math.sign(dist) * Math.min(speed * dt, remaining)
    }
  }

  autoRaf = requestAnimationFrame(autoTick)
}

// 沿旋转方向的下一个卡片居中位置
function nextSnap(current, step, dir) {
  const snapped = dir < 0 ? Math.floor(current / step) * step : Math.ceil(current / step) * step
  return Math.abs(snapped - current) < 1e-6 ? snapped + dir * step : snapped
}

function startMomentum() {
  stopMomentum()
  const friction = 0.96
  const minVelocity = 0.3

  function tick() {
    velocity *= friction

    if (Math.abs(velocity) < minVelocity) {
      // 吸附到最近的整数位置
      const nearest = Math.round(rotation.value / anglePerCard) * anglePerCard
      rotation.value = nearest
      startAuto()
      return
    }

    rotation.value += velocity
    momentumFrame = requestAnimationFrame(tick)
  }

  momentumFrame = requestAnimationFrame(tick)
}

function stopMomentum() {
  if (momentumFrame) {
    cancelAnimationFrame(momentumFrame)
    momentumFrame = null
  }
}

function onPointerDown(e) {
  isDragging = true
  dragStartX = e.clientX
  dragStartRotation = rotation.value
  lastDragX = e.clientX
  lastDragTime = Date.now()
  velocity = 0
  velocityTracker = { x: e.clientX, time: Date.now() }
  stopAuto()
  stopMomentum()
  e.preventDefault()
}

function onPointerMove(e) {
  if (!isDragging) return

  const now = Date.now()
  const dx = e.clientX - lastDragX
  const dt = now - lastDragTime

  // 计算瞬时速度
  if (dt > 0) {
    velocity = (dx / dt) * 16
  }

  lastDragX = e.clientX
  lastDragTime = now

  // 直接跟随手指
  const totalDx = e.clientX - dragStartX
  rotation.value = dragStartRotation + totalDx * 0.5
}

function onPointerUp() {
  if (!isDragging) return
  isDragging = false

  // 用最后几次移动的平均速度
  const now = Date.now()
  const dt = now - lastDragTime
  if (dt < 80) {
    // 速度已经通过 onPointerMove 持续更新
  }

  if (Math.abs(velocity) > 2) {
    startMomentum()
  } else {
    const nearest = Math.round(rotation.value / anglePerCard) * anglePerCard
    rotation.value = nearest
    startAuto()
  }
}

function openModal(item) {
  modalItem.value = item
  flipped.value = false
  stopAuto()
  stopMomentum()
}

function closeModal() {
  modalItem.value = null
  flipped.value = false
  startAuto()
}

function toggleFlip() {
  flipped.value = !flipped.value
}

watch(() => items.length, () => {
  rotation.value = 0
  startAuto()
})

function measureScene() {
  if (sceneRef.value) containerW.value = sceneRef.value.getBoundingClientRect().width
}

onMounted(() => {
  measureScene()
  startAuto()
  window.addEventListener('resize', measureScene)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})

onBeforeUnmount(() => {
  stopAuto()
  stopMomentum()
  window.removeEventListener('resize', measureScene)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="carousel-wrapper">
    <div ref="sceneRef" class="carousel-scene" @pointerdown="onPointerDown">
      <div
        v-for="(item, index) in items"
        :key="item.title"
        class="carousel-card"
        :style="getCardStyle(index)"
        @click.stop="openModal(item)"
      >
        <Project_Card
          :title="item.title"
          :description="item.description"
          :tags="item.tags"
          :accent="item.accent"
          :detail="item.detail"
        />
      </div>
    </div>

    <!-- 弹窗 -->
    <Transition name="modal">
      <div v-if="modalItem" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card" :class="{ flipped }" @click="toggleFlip">
          <div class="modal-inner">
            <div class="modal-front">
              <div class="card-cover" :style="{ background: modalItem.accent + '15' }">
                <div class="card-icon" :style="{ background: modalItem.accent }">
                  {{ modalItem.title[0] }}
                </div>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ modalItem.title }}</h3>
                <p class="card-desc">{{ modalItem.description }}</p>
                <div class="card-tags">
                  <span v-for="tag in modalItem.tags" :key="tag" class="tag">{{ tag }}</span>
                </div>
              </div>
            </div>
            <div class="modal-back">
              <div class="card-body">
                <h3 class="card-title">{{ modalItem.title }}</h3>
                <div class="card-detail">{{ modalItem.detail }}</div>
              </div>
            </div>
          </div>
          <div class="flip-hint">{{ flipped ? '点击返回' : '点击翻转' }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.carousel-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.carousel-scene {
  width: 100%;
  height: 380px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;
}

.carousel-scene:active {
  cursor: grabbing;
}

.carousel-card {
  position: absolute;
  transition: opacity 0.3s ease;
  will-change: transform;
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card {
  width: 300px;
  height: 420px;
  perspective: 1000px;
  cursor: pointer;
}

.modal-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-card.flipped .modal-inner {
  transform: rotateY(180deg);
}

.modal-front,
.modal-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

.modal-back {
  transform: rotateY(180deg);
}

.card-cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.card-body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 18px;
  margin: 0 0 8px;
  color: var(--text-h);
}

.card-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 14px;
  flex: 1;
}

.card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--code-bg);
  color: var(--text);
}

.card-detail {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text);
  white-space: pre-wrap;
  overflow-y: auto;
  flex: 1;
}

.flip-hint {
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text);
  opacity: 0.5;
}

/* ===== 弹窗过渡 ===== */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card {
  transform: scale(0.8);
  opacity: 0;
}

.modal-leave-to .modal-card {
  transform: scale(0.8);
  opacity: 0;
}
</style>
