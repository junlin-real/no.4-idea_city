<template>
  <div class="dark-stars" v-if="isDark">
    <!-- 月亮 -->
    <div class="moon" :class="{ shaking: isShaking }" @click="handleClick">
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

    <!-- 星星 -->
    <span
      v-for="star in stars"
      :key="star.id"
      class="star"
      :style="{
        left: star.x + '%',
        top: star.y + '%',
        width: star.size + 'px',
        height: star.size + 'px',
        animationDelay: star.delay + 's',
        animationDuration: star.duration + 's',
      }"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['switchToLight'])

const props = defineProps({
  count: { type: Number, default: 80 },
})

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

onMounted(() => {
  checkDark()
  const observer = new MutationObserver(checkDark)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  onUnmounted(() => observer.disconnect())
})

function rand(min, max) {
  return Math.random() * (max - min) + min
}

const stars = computed(() => {
  return Array.from({ length: props.count }, (_, i) => ({
    id: i,
    x: rand(0, 100),
    y: rand(0, 100),
    size: rand(1.5, 3.5),
    delay: rand(0, 6),
    duration: rand(2, 5),
  }))
})
</script>

<style scoped>
.dark-stars {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* ===== 月亮 ===== */
.moon {
  position: absolute;
  top: 70px;
  right: 50px;
  width: 90px;
  height: 90px;
  cursor: pointer;
  pointer-events: auto;
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

/* ===== 星星 ===== */
.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.6);
  animation: twinkle ease-in-out infinite alternate;
  opacity: 0;
}

@keyframes twinkle {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
