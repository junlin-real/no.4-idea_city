<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  mode: { type: String, default: 'day' } // 'day' | 'night'
})

const emit = defineEmits(['done'])

// Refs
const maskUp = ref(null)
const maskDown = ref(null)
const katana = ref(null)
const burst = ref(null)
const raysBox = ref(null)
const glow = ref(null)
const visible = ref(true)
let anim = null

// Computed
const isNight = computed(() => props.mode === 'night')

// Night: stars
const stars = computed(() => {
  if (!isNight.value) return []
  return Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 4,
  }))
})

// Night: meteors
const meteors = computed(() => {
  if (!isNight.value) return []
  return Array.from({ length: 3 }, (_, i) => ({
    id: i,
    left: 15 + Math.random() * 60,
    top: 5 + Math.random() * 20,
    delay: 0.9 + i * 0.25,
    duration: 0.5 + Math.random() * 0.3,
    rotation: -35 - Math.random() * 15,
    length: 60 + Math.random() * 80,
  }))
})

// Day: golden rays
const rays = computed(() => {
  if (isNight.value) return []
  return Array.from({ length: 18 }, (_, i) => {
    const angle = (360 / 18) * i + (Math.random() * 8 - 4)
    return {
      angle,
      length: 50 + Math.random() * 80,
      width: 1 + Math.random() * 1.5,
      opacity: 0.2 + Math.random() * 0.5,
    }
  })
})

onMounted(() => {
  anim = gsap.timeline({
    onUpdate() {
      if (!katana.value || !maskUp.value || !maskDown.value) return
      const r = katana.value.getBoundingClientRect()
      const cx = (r.left + r.width / 2) / innerWidth * 100
      const cy = (r.top + r.height / 2) / innerHeight * 100

      maskUp.value.style.clipPath =
        `polygon(0% 0%, 100% 0%, ${cx}% ${cy}%, 0% ${cy * 1.2}%)`
      maskDown.value.style.clipPath =
        `polygon(100% 100%, 100% 0%, ${cx}% ${cy}%, ${r.left / innerWidth * 100}%)`

      // Position light effects at split point
      const targets = [burst.value, raysBox.value, glow.value].filter(Boolean)
      targets.forEach(el => {
        el.style.left = cx + '%'
        el.style.top = cy + '%'
      })
    },
    onComplete() {
      visible.value = false
      emit('done')
    }
  })
    // Phase 1: Katana rises to center
    .to(katana.value, {
      y: () => -katana.value.getBoundingClientRect().height / 2,
      duration: 0.35,
      ease: 'power4.out',
      delay: 0.3,
    })
    // Phase 2: Katana sweeps to top-right
    .to(katana.value, {
      y: () => -katana.value.getBoundingClientRect().height / 2 - innerHeight,
      x: () => innerWidth,
      duration: 0.35,
      ease: 'power4.inout',
    }, '<0.2')

  // Day mode: golden burst + rays
  if (!isNight.value) {
    if (burst.value) {
      gsap.fromTo(burst.value,
        { scale: 0, opacity: 0 },
        { scale: 1.5, opacity: 1, duration: 0.35, delay: 0.45, ease: 'power2.out' }
      )
      gsap.to(burst.value, {
        opacity: 0, scale: 2.5, duration: 0.35, delay: 0.85, ease: 'power2.in'
      })
    }
    if (raysBox.value) {
      gsap.fromTo(raysBox.value,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.3, delay: 0.5, ease: 'power2.out' }
      )
      gsap.to(raysBox.value, {
        opacity: 0, scale: 1.8, duration: 0.3, delay: 0.9, ease: 'power2.in'
      })
    }
  }

  // Night mode: blue glow
  if (isNight.value && glow.value) {
    gsap.fromTo(glow.value,
      { scale: 0, opacity: 0 },
      { scale: 1.5, opacity: 1, duration: 0.4, delay: 0.45, ease: 'power2.out' }
    )
    gsap.to(glow.value, {
      opacity: 0, scale: 2, duration: 0.4, delay: 0.85, ease: 'power2.in'
    })
  }
})

onBeforeUnmount(() => {
  if (anim) anim.kill()
  ;[burst, raysBox, glow].forEach(r => {
    if (r.value) gsap.killTweensOf(r.value)
  })
})

function onResize() {
  if (anim) anim.invalidate()
}

onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div v-if="visible" class="slash-loading" :class="mode">
    <!-- ===== Night: Stars ===== -->
    <template v-if="isNight">
      <span
        v-for="s in stars" :key="s.id" class="star"
        :style="{
          left: s.x + '%', top: s.y + '%',
          width: s.size + 'px', height: s.size + 'px',
          animationDelay: s.delay + 's',
          animationDuration: s.duration + 's',
        }"
      />
    </template>

    <!-- ===== Night: Meteors ===== -->
    <template v-if="isNight">
      <div
        v-for="m in meteors" :key="m.id" class="meteor"
        :style="{
          left: m.left + '%', top: m.top + '%',
          '--len': m.length + 'px',
          '--rot': m.rotation + 'deg',
          animationDelay: m.delay + 's',
          animationDuration: m.duration + 's',
        }"
      />
    </template>

    <!-- ===== Night: Aurora bands ===== -->
    <template v-if="isNight">
      <div class="aurora-band aurora-1"></div>
      <div class="aurora-band aurora-2"></div>
      <div class="aurora-band aurora-3"></div>
    </template>

    <!-- ===== Day: Golden burst ===== -->
    <div v-if="!isNight" ref="burst" class="golden-burst"></div>

    <!-- ===== Day: Golden rays ===== -->
    <div v-if="!isNight" ref="raysBox" class="rays-box">
      <span
        v-for="(r, i) in rays" :key="i" class="ray"
        :style="{
          transform: 'rotate(' + r.angle + 'deg)',
          width: r.length + 'px',
          height: r.width + 'px',
          opacity: r.opacity,
        }"
      />
    </div>

    <!-- ===== Night: Blue glow ===== -->
    <div v-if="isNight" ref="glow" class="blue-glow"></div>

    <!-- ===== Curtain masks ===== -->
    <div ref="maskUp" class="mask mask_up"></div>
    <div ref="maskDown" class="mask mask_down"></div>

    <!-- ===== Katana ===== -->
    <svg ref="katana" class="katana" viewBox="0 0 68.5 760">
      <path
        class="blade"
        d="M26,760H0c20.5-207.1,27-402.9,21.2-574.5l0,0C19.1,119.9,15.1,57.8,9.4,0c7.8,6.4,14.8,13.6,20.8,21.6
          c4.5,43.2,8.1,88.8,10.7,136.6l0,0C50.5,335,46.3,540.8,26,760z"
      />
      <path
        class="blade-shadow"
        d="M68.5,384.7c0,117.7-5.4,244-16.6,375.3H26c20.3-219.2,24.5-425,15-601.8l0,0c-2.6-47.8-6.2-93.4-10.7-136.6
          c13.7,18,22.5,39.7,25,62.9c0.1,0.8,0.2,1.5,0.2,2.3C64,177.2,68.5,277.4,68.5,384.7L68.5,384.7z"
      />
    </svg>
  </div>
</template>

<style scoped>
/* ===== Container ===== */
.slash-loading {
  position: fixed;
  inset: 0;
  z-index: 99999;
  overflow: hidden;
}

/* ===== Day Mode ===== */
.slash-loading.day {
  background: linear-gradient(180deg, #1a6fbf 0%, #5ba3e6 40%, #87ceeb 100%);
}
.slash-loading.day .mask {
  background-color: #17f700;
}
.slash-loading.day .blade {
  fill: #efefef;
}
.slash-loading.day .blade-shadow {
  fill: #bfbfbf;
}

/* ===== Night Mode ===== */
.slash-loading.night {
  background: radial-gradient(ellipse at 50% 80%, #0d1b3e 0%, #060a1a 70%);
}
.slash-loading.night .mask {
  background-color: #0a0a1a;
}
.slash-loading.night .blade {
  fill: #c0c8d4;
}
.slash-loading.night .blade-shadow {
  fill: #6b7280;
}

/* ===== Katana ===== */
.katana {
  position: absolute;
  left: 0;
  top: 100%;
  width: 30rem;
  height: auto;
  z-index: 10;
}

/* ===== Curtain Masks ===== */
.mask {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 5;
}
.mask_up {
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%, 0% 100%);
  transform-origin: left top;
  transform: scale(1.01);
}
.mask_down {
  clip-path: polygon(100% 100%, 100% 0%, 0% 100%, 0% 100%);
}

/* ==========================================
   DAY MODE — Golden Burst + Rays
   ========================================== */

.golden-burst {
  position: absolute;
  width: 200px;
  height: 200px;
  margin: -100px 0 0 -100px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 215, 0, 0.9) 0%,
    rgba(255, 180, 0, 0.5) 30%,
    rgba(255, 215, 0, 0) 70%
  );
  z-index: 8;
  pointer-events: none;
}

.rays-box {
  position: absolute;
  z-index: 7;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
.ray {
  position: absolute;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.8), rgba(255, 215, 0, 0));
  transform-origin: left center;
  left: 0;
  top: -0.5px;
  border-radius: 0 2px 2px 0;
}

/* ==========================================
   NIGHT MODE — Aurora + Blue Glow
   ========================================== */

.blue-glow {
  position: absolute;
  width: 180px;
  height: 180px;
  margin: -90px 0 0 -90px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(0, 229, 255, 0.7) 0%,
    rgba(0, 102, 255, 0.4) 30%,
    rgba(0, 229, 255, 0) 70%
  );
  z-index: 8;
  pointer-events: none;
}

.aurora-band {
  position: absolute;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
}
.aurora-1 {
  left: 15%;
  top: 10%;
  width: 120px;
  height: 80%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0, 229, 255, 0.15) 20%,
    rgba(0, 229, 255, 0.4) 50%,
    rgba(0, 102, 255, 0.3) 70%,
    transparent 100%
  );
  filter: blur(20px);
  animation: aurora-in 0.6s 0.5s ease-out forwards,
             wave1 4s 0.5s ease-in-out infinite;
}
.aurora-2 {
  left: 40%;
  top: 5%;
  width: 100px;
  height: 85%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(123, 47, 190, 0.15) 25%,
    rgba(0, 229, 255, 0.35) 50%,
    rgba(0, 102, 255, 0.25) 75%,
    transparent 100%
  );
  filter: blur(25px);
  animation: aurora-in 0.6s 0.6s ease-out forwards,
             wave2 5s 0.6s ease-in-out infinite;
}
.aurora-3 {
  left: 65%;
  top: 8%;
  width: 90px;
  height: 75%;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(0, 102, 255, 0.2) 30%,
    rgba(0, 229, 255, 0.3) 55%,
    rgba(123, 47, 190, 0.2) 80%,
    transparent 100%
  );
  filter: blur(18px);
  animation: aurora-in 0.6s 0.7s ease-out forwards,
             wave3 3.5s 0.7s ease-in-out infinite;
}

@keyframes aurora-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes wave1 {
  0%, 100% { transform: skewX(0deg) translateX(0); }
  50% { transform: skewX(5deg) translateX(15px); }
}
@keyframes wave2 {
  0%, 100% { transform: skewX(0deg) translateX(0); }
  50% { transform: skewX(-4deg) translateX(-12px); }
}
@keyframes wave3 {
  0%, 100% { transform: skewX(0deg) translateX(0); }
  50% { transform: skewX(3deg) translateX(10px); }
}

/* ===== Stars (Night) ===== */
.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 3px 1px rgba(255, 255, 255, 0.5);
  animation: twinkle ease-in-out infinite alternate;
  opacity: 0;
  z-index: 1;
}
@keyframes twinkle {
  0% { opacity: 0.1; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}

/* ===== Meteors (Night) ===== */
.meteor {
  position: absolute;
  width: 1.5px;
  height: var(--len);
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.9), rgba(200, 220, 255, 0.4));
  transform: rotate(var(--rot));
  transform-origin: top center;
  opacity: 0;
  z-index: 2;
  animation: meteor-streak var(--duration) var(--delay) linear forwards;
}
@keyframes meteor-streak {
  0% {
    opacity: 0;
    transform: rotate(var(--rot)) translate(0, 0);
  }
  10% { opacity: 1; }
  90% { opacity: 0.6; }
  100% {
    opacity: 0;
    transform: rotate(var(--rot)) translate(-150px, 250px);
  }
}

/* ===== Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  .star,
  .aurora-band,
  .meteor {
    animation: none !important;
  }
  .aurora-band {
    opacity: 0.5;
  }
}
</style>
