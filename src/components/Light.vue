<script setup>
import { ref, reactive } from 'vue'

const emit = defineEmits(['broken'])

const clickCount = ref(0)
const isBreaking = ref(false)
const isBroken = ref(false)

const fragments = reactive([])

function createFragments() {
  fragments.length = 0
  const count = 10
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + (Math.random() * 30 - 15)
    const dist = 60 + Math.random() * 80
    const rad = (angle * Math.PI) / 180
    const tx = Math.cos(rad) * dist
    const ty = Math.sin(rad) * dist
    const rot = Math.random() * 720 - 360
    const size = 4 + Math.random() * 8
    const delay = Math.random() * 80
    const colors = ['#FFD43B', '#E6A800', '#FFE066', '#FFF', '#B0B0B0']
    const color = colors[Math.floor(Math.random() * colors.length)]
    fragments.push({ tx, ty, rot, size, delay, color, id: i })
  }
}

function handleClick() {
  if (isBroken.value || isBreaking.value) return
  clickCount.value++
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
</script>

<template>
  <button class="bulb-btn" :class="{ broken: isBroken }" @click="handleClick" aria-label="灯泡">
    <!-- 正常灯泡 -->
    <svg v-if="!isBroken" class="bulb-svg" :class="{ shaking: isBreaking }" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="26" r="18" fill="#FFE066" opacity="0.25" class="bulb-glow" />
      <path d="M32 8C22.06 8 14 16.06 14 26c0 6.63 3.61 12.41 9 15.52V48a2 2 0 002 2h14a2 2 0 002-2v-6.48c5.39-3.11 9-8.89 9-15.52C49 16.06 40.94 8 32 8z" fill="#FFD43B" stroke="#E6A800" stroke-width="1.5"/>
      <rect x="26" y="50" width="12" height="3" rx="1.5" fill="#B0B0B0" stroke="#999" stroke-width="1"/>
      <rect x="27" y="54" width="10" height="2" rx="1" fill="#999"/>
      <line x1="28" y1="18" x2="28" y2="28" stroke="#FFF" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="36" y1="18" x2="36" y2="28" stroke="#FFF" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
    </svg>

    <!-- 破碎灯泡 -->
    <svg v-else class="bulb-svg broken-svg" viewBox="0 0 64 64" fill="none">
      <path d="M24 10L20 28" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M20 28L14 26" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M20 28L22 36" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M40 12L44 28" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M44 28L50 26" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M44 28L42 36" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M32 8L24 10M32 8L40 12" stroke="#999" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M22 36L32 42L42 36" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M26 50v6.48c5.39-3.11 9-8.89 9-15.52" stroke="#666" stroke-width="1.5"/>
      <path d="M38 50v-6.48c-5.39-3.11-9-8.89-9-15.52" stroke="#666" stroke-width="1.5"/>
      <rect x="26" y="50" width="12" height="3" rx="1.5" fill="#555" stroke="#444" stroke-width="1"/>
      <rect x="27" y="54" width="10" height="2" rx="1" fill="#444"/>
      <line x1="30" y1="14" x2="34" y2="32" stroke="#666" stroke-width="1" stroke-dasharray="3 2"/>
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
  </button>
</template>

<style scoped>
.bulb-btn {
  position: relative;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.bulb-svg {
  width: 72px;
  height: 72px;
  position: relative;
  z-index: 1;
}

.bulb-glow {
  animation: bulb-pulse 2s ease-in-out infinite;
}

@keyframes bulb-pulse {
  0%, 100% { opacity: 0.2; r: 16; }
  50% { opacity: 0.4; r: 20; }
}

/* 破裂抖动 */
.shaking {
  animation: shake 0.15s ease-in-out 4;
}

@keyframes shake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-4px, 2px); }
  50% { transform: translate(4px, -2px); }
  75% { transform: translate(-2px, -3px); }
}

.bulb-btn.broken {
  cursor: default;
}

.broken-svg {
  opacity: 0.7;
  filter: saturate(0.3);
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
  box-shadow: 0 0 4px var(--color);
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
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
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
</style>
