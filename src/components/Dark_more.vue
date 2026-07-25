<template>
  <div class="dark-stars" v-if="isDark">
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
