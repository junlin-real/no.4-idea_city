<template>
  <div class="slash-loading" :class="{ night: mode === 'night' }">
    <div ref="maskUpRef" class="mask mask_up" />
    <div ref="glowRef" class="glow" />
    <svg ref="katanaRef" class="katana" viewBox="0 0 68.5 760" xml:space="preserve">
      <path class="st0" d="M26,760H0c20.5-207.1,27-402.9,21.2-574.5l0,0C19.1,119.9,15.1,57.8,9.4,0c7.8,6.4,14.8,13.6,20.8,21.6c4.5,43.2,8.1,88.8,10.7,136.6l0,0C50.5,335,46.3,540.8,26,760z"/>
      <path class="st1" d="M68.5,384.7c0,117.7-5.4,244-16.6,375.3H26c20.3-219.2,24.5-425,15-601.8l0,0c-2.6-47.8-6.2-93.4-10.7-136.6c13.7,18,22.5,39.7,25,62.9c0.1,0.8,0.2,1.5,0.2,2.3C64,177.2,68.5,277.4,68.5,384.7L68.5,384.7z"/>
    </svg>
    <div ref="maskDownRef" class="mask mask_down" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  mode: { type: String, default: 'day' }
})

const emit = defineEmits(['done'])

const maskUpRef = ref(null)
const maskDownRef = ref(null)
const katanaRef = ref(null)
const glowRef = ref(null)

let animater = null

const intro = () => {
  const maskUp = maskUpRef.value
  const maskDown = maskDownRef.value
  const katana = katanaRef.value
  const glow = glowRef.value

  animater = gsap.timeline({
    onUpdate: () => {
      const rect = katana.getBoundingClientRect()
      const cutpoint_x = ((rect.left + rect.width) / window.innerWidth) * 100
      const cutpoint_y = ((rect.top + rect.height / 2) / window.innerHeight) * 100
      const mask_up_y = ((rect.top + rect.height / 2) / window.innerHeight) * 100 * 1.2
      const mask_down_x = (rect.left / window.innerWidth) * 100
      maskUp.style.clipPath = `polygon(0% 0%, 100% 0%, ${cutpoint_x}% ${cutpoint_y}%, 0% ${mask_up_y}%)`
      maskDown.style.clipPath = `polygon(100% 100%, 100% 0%, ${cutpoint_x}% ${cutpoint_y}%, ${mask_down_x}% 100%)`
      glow.style.left = `${cutpoint_x}%`
      glow.style.top = `${cutpoint_y}%`
    },
    onComplete: () => {
      emit('done')
    }
  })
    .to(katana, {
      y: () => -katana.getBoundingClientRect().height / 2,
      duration: 0.6,
      ease: "power4.out",
      delay: 0.6,
    })
    .to(katana, {
      y: () => -katana.getBoundingClientRect().height / 2 - window.innerHeight,
      x: () => window.innerWidth,
      duration: 1,
      ease: "power4.inOut",
    }, "<0.3")
}

const handleResize = () => {
  if (animater) animater.invalidate()
}

onMounted(() => {
  intro()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (animater) animater.kill()
})
</script>

<style scoped>
.slash-loading {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 9999;
  pointer-events: none;
}

.katana {
  position: absolute;
  left: 0;
  top: 100%;
  width: 12rem;
  height: auto;
  filter: drop-shadow(0 0 12px rgba(255, 160, 40, 0.7)) drop-shadow(0 0 4px rgba(255, 200, 80, 0.5));
  transition: filter 0.6s ease;
}

/* ===== 白天模式（默认） ===== */
.mask {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #e8efc2 0%, #dceb84 38%, #d2e86c 70%, #c8e447 100%);
  transition: background 0.6s ease;
}

.mask::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.08;
  pointer-events: none;
}

.mask_up {
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%, 0% 100%);
  transform-origin: left top;
  transform: scale(1.01);
}

.mask_down {
  clip-path: polygon(100% 100%, 100% 0%, 0% 100%, 0% 100%);
}

/* 白天光晕：暖金 */
.glow {
  position: absolute;
  width: 35rem;
  height: 35rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 170, 40, 0.35) 0%, rgba(255, 120, 20, 0.15) 25%, rgba(255, 80, 10, 0.05) 50%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  mix-blend-mode: screen;
  transition: background 0.6s ease;
}

.st0 { fill: #b0b0b0; transition: fill 0.6s ease; }
.st1 { fill: #707070; transition: fill 0.6s ease; }

/* ===== 黑夜模式 ===== */
.night .mask {
  background: linear-gradient(180deg, #0c0c1a 0%, #08081a 35%, #0a0a1e 60%, #050512 100%);
}

.night .glow {
  background: radial-gradient(circle, rgba(100, 140, 255, 0.35) 0%, rgba(80, 100, 220, 0.15) 25%, rgba(60, 60, 180, 0.05) 50%, transparent 70%);
}

.night .katana {
  filter: drop-shadow(0 0 14px rgba(100, 140, 255, 0.8)) drop-shadow(0 0 4px rgba(160, 180, 255, 0.6));
}

.night .st0 { fill: #c0c8e0; }
.night .st1 { fill: #8088a8; }
</style>
