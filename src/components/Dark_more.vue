<template>
  <div class="dark-stars" v-if="isDark">
    <!-- 月亮 -->
    <div class="moon">
      <div class="moon-glow" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  count: { type: Number, default: 80 },
})

const isDark = ref(false)

function checkDark() {
  isDark.value = document.documentElement.classList.contains('dark-mode')
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
  top: 50px;
  right: 70px;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #fffde7, #fdd835, #f9a825);
  box-shadow:
    0 0 20px 5px rgba(253, 216, 53, 0.3),
    0 0 60px 15px rgba(253, 216, 53, 0.15),
    0 0 100px 30px rgba(253, 216, 53, 0.08);
  animation: moon-float 6s ease-in-out infinite;
}

.moon::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 28px;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--bg, #16171d);
}

.moon-glow {
  position: absolute;
  top: -30px;
  left: -30px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253, 216, 53, 0.12) 0%, transparent 70%);
  animation: moon-glow-pulse 4s ease-in-out infinite alternate;
}

@keyframes moon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes moon-glow-pulse {
  0% { opacity: 0.6; transform: scale(1); }
  100% { opacity: 1; transform: scale(1.1); }
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
