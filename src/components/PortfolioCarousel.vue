<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Project_Card from './Project_Card.vue'

const props = defineProps({
  items: Array,
})

// 整体旋转角度（连续值，所有卡片一起转）
const rotation = ref(0)
const modalItem = ref(null)
const flipped = ref(false)

let autoTimer = null
let momentumFrame = null
let isDragging = false
let dragStartX = 0
let dragStartRotation = 0
let velocityTracker = { x: 0, time: 0 }
let lastDragX = 0
let lastDragTime = 0
let velocity = 0

const anglePerCard = 360 / 4 // 固定4个位置，展示3张

function getCardStyle(index) {
  // 每张卡片相对于当前旋转角度的偏移
  const cardAngle = index * anglePerCard + rotation.value
  // 归一化到 -180 ~ 180
  let normalized = ((cardAngle % 360) + 540) % 360 - 180

  // normalized=0 表示正前方
  const absNorm = Math.abs(normalized)
  const visible = absNorm < 120

  const translateX = normalized * 1.8
  const rotate = normalized * 0.15
  const scale = absNorm < 10 ? 1.05 : absNorm < 60 ? 0.9 : 0.75
  const opacity = absNorm > 100 ? 0 : absNorm > 60 ? 0.3 : absNorm > 30 ? 0.7 : 1
  const zIndex = Math.round((180 - absNorm) * 10)

  return {
    transform: `translateX(${translateX}px) rotate(${rotate}deg) scale(${scale})`,
    opacity,
    zIndex,
    pointerEvents: visible ? 'auto' : 'none',
  }
}

function startAuto() {
  stopAuto()
  autoTimer = setInterval(() => {
    rotation.value -= anglePerCard
  }, 3000)
}

function stopAuto() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
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

watch(() => props.items.length, () => {
  rotation.value = 0
  startAuto()
})

onMounted(() => {
  startAuto()
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
})

onBeforeUnmount(() => {
  stopAuto()
  stopMomentum()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <div class="carousel-wrapper">
    <div class="carousel-scene" @pointerdown="onPointerDown">
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
