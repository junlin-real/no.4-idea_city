<script setup>
import { ref } from 'vue'

const emit = defineEmits(['broken'])

const clickCount = ref(0)
const isBroken = ref(false)

function handleClick() {
  if (isBroken.value) return
  clickCount.value++
  if (clickCount.value >= 3) {
    isBroken.value = true
    emit('broken')
  }
}
</script>

<template>
  <button class="bulb-btn" :class="{ broken: isBroken }" @click="handleClick" aria-label="灯泡">
    <!-- 正常灯泡 -->
    <svg v-if="!isBroken" class="bulb-svg" viewBox="0 0 64 64" fill="none">
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
  </button>
</template>

<style scoped>
.bulb-btn {
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
}

.bulb-glow {
  animation: bulb-pulse 2s ease-in-out infinite;
}

@keyframes bulb-pulse {
  0%, 100% { opacity: 0.2; r: 16; }
  50% { opacity: 0.4; r: 20; }
}

.bulb-btn.broken {
  cursor: default;
}

.bulb-btn.broken:hover {
  background: transparent;
}

.broken-svg {
  opacity: 0.7;
  filter: saturate(0.3);
}
</style>
