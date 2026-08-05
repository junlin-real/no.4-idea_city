<script setup>
import { ref, reactive, computed } from 'vue'
import Light from './components/Light.vue'
import Dark_more from './components/Dark_more.vue'
import DroneGame from './components/DroneGame.vue'
import PortfolioCarousel from './components/PortfolioCarousel.vue'
import HyperCube from './components/HyperCube.vue'
import loding from './components/loding.vue'

const loadingDone = ref(false)
const loadingMode = ref('day')
const loadingKey = ref(0)
const transitioning = ref(false) // 是否正在播放切换动画
const gameVisible = ref(true)    // 控制小游戏组件挂载/销毁

// 每次刷新都从白昼模式开始

const corners = reactive({ tl: false, tr: false, bl: false, br: false })
const bulbKey = ref(0)
const maskVisible = ref(true)

const brokenCount = computed(() => Object.values(corners).filter(Boolean).length)
const baseDark = computed(() => brokenCount.value / 4)
const dark = computed(() => ({
  tl: corners.tl ? 1 : baseDark.value,
  tr: corners.tr ? 1 : baseDark.value,
  bl: corners.bl ? 1 : baseDark.value,
  br: corners.br ? 1 : baseDark.value,
}))

function onCornerBroken(corner) {
  corners[corner] = true
  checkAllBroken()
}

function checkAllBroken() {
  if (brokenCount.value === 4) {
    gameVisible.value = false
    document.documentElement.classList.add('dark-mode')
    loadingMode.value = 'night'
    loadingKey.value++
    transitioning.value = true
    loadingDone.value = false
  }
}

function onTransitionDone() {
  transitioning.value = false
  loadingDone.value = true
  maskVisible.value = false
}

function onSwitchToLight() {
  corners.tl = false
  corners.tr = false
  corners.bl = false
  corners.br = false
  maskVisible.value = true
  loadingDone.value = false
  loadingMode.value = 'day'
  bulbKey.value++
  gameVisible.value = true
}

const navLinks = [
  { label: '作品', href: '#portfolio' },
  { label: '关于', href: '#about' },
]

</script>

<template>
  <div class="site">
    <!-- 加载动画 -->
    <loding
      v-if="!loadingDone || transitioning"
      :key="loadingKey"
      :mode="loadingMode"
      @done="transitioning ? onTransitionDone() : loadingDone = true"
    />
    <!-- 星空背景 -->
    <Dark_more @switchToLight="onSwitchToLight" />

    <!-- 无人机石头大战 -->
    <DroneGame v-if="gameVisible" />

    <!-- 光照遮罩：夜晚底色 + 4 个光源光斑 -->
    <div v-if="maskVisible" class="light-mask">
      <div class="night-base" :style="{ opacity: baseDark }" />
      <div class="spot spot-tl" :style="{ opacity: 1 - dark.tl }" />
      <div class="spot spot-tr" :style="{ opacity: 1 - dark.tr }" />
      <div class="spot spot-bl" :style="{ opacity: 1 - dark.bl }" />
      <div class="spot spot-br" :style="{ opacity: 1 - dark.br }" />
    </div>

    <!-- 灯泡层：四角各一个 -->
    <div class="bulb-layer">
      <div class="bulb-tl">
        <Light :key="'tl-' + bulbKey" @broken="onCornerBroken('tl')" />
      </div>
      <div class="bulb-tr">
        <Light :key="'tr-' + bulbKey" @broken="onCornerBroken('tr')" />
      </div>
      <div class="bulb-bl">
        <Light :key="'bl-' + bulbKey" @broken="onCornerBroken('bl')" />
      </div>
      <div class="bulb-br">
        <Light :key="'br-' + bulbKey" @broken="onCornerBroken('br')" />
      </div>
    </div>

    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-inner">
        <a href="#" class="logo">Welcome</a>
        <nav class="nav-links">
          <a v-for="link in navLinks" :key="link.label" :href="link.href" class="nav-link">
            {{ link.label }}
          </a>
        </nav>
      </div>
    </header>

    <!-- Hero 横幅 -->
    <section class="hero">
      <div class="hero-layout">
        <div class="hero-right">
          <p class="hero-tag">欢迎您</p>
          <h1 class="hero-title">你好，我是<br /><span class="accent">JunLin</span></h1>
          <p class="hero-desc">
            这里是我的个人网站，我希望用这个网站来分享我的想法和创作，同时这个网站也是我的求职网站，虽然还在完善中，但我希望它能成为我职业发展的见证。
          </p>
          <div class="hero-actions">
            <a href="#portfolio" class="btn btn-primary">查看作品</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 超立方体展示 -->
    <section class="section hypercube-section">
      <div class="section-inner hypercube-inner">
        <HyperCube />
      </div>
    </section>

    <!-- 作品展示 -->
    <section id="portfolio" class="section section-alt">
      <div class="section-inner">
        <h2 class="section-title">作品展示</h2>
        <PortfolioCarousel />
      </div>
    </section>

    <!-- 页脚 -->
    <footer id="about" class="footer">
      <div class="footer-inner">
        <p class="footer-copy">&copy; 2026 YourName. All rights reserved.</p>
        <div class="footer-links">
          <a href="#">GitHub</a>
          <a href="#">Twitter</a>
          <a href="#">Email</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ===== 布局 ===== */
.site {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: background-color 0.4s ease, color 0.4s ease;
}

/* ===== 导航栏 ===== */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

.navbar-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* ===== 光照遮罩层 ===== */
.light-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

.night-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0c0c1a 0%, #08081a 35%, #0a0a1e 60%, #050512 100%);
  transition: opacity 0.8s ease;
}

.spot {
  position: absolute;
  inset: 0;
  background-size: cover;
  mix-blend-mode: screen;
  transition: opacity 0.8s ease;
}

.spot-tl { background: radial-gradient(circle at 0% 0%, #ffe066 0%, transparent 60%); }
.spot-tr { background: radial-gradient(circle at 100% 0%, #ffe066 0%, transparent 60%); }
.spot-bl { background: radial-gradient(circle at 0% 100%, #ffe066 0%, transparent 60%); }
.spot-br { background: radial-gradient(circle at 100% 100%, #ffe066 0%, transparent 60%); }

/* ===== 灯泡层 ===== */
.bulb-layer {
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.bulb-tl,
.bulb-tr,
.bulb-bl,
.bulb-br {
  position: absolute;
  pointer-events: auto;
}

.bulb-tl { top: 0; left: 0; }
.bulb-tr { top: 0; right: 0; }
.bulb-bl { bottom: 0; left: 0; }
.bulb-br { bottom: 0; right: 0; }

.logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-link {
  font-size: 15px;
  color: var(--text);
  text-decoration: none;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--accent);
}

/* ===== Hero ===== */
.hero {
  max-width: 1120px;
  margin: 0 auto;
  padding: 80px 24px 80px;
}

.hero-layout {
  display: flex;
  align-items: center;
  gap: 48px;
}

.hero-right {
  flex: 1;
  min-width: 0;
}

.hero-tag {
  font-size: 30px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
}

.hero-title {
  font-size: 45px;
  line-height: 1.2;
  letter-spacing: -1.5px;
  margin: 0 0 20px;
  color: var(--text-h);
}

.hero-title .accent {
  color: var(--accent);
}

.hero-desc {
  font-size: 18px;
  line-height: 1.7;
  color: var(--text);
  max-width: 540px;
  margin: 0 auto 36px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid var(--accent-border);
  transition: all 0.2s, background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease;
}

.btn-secondary:hover {
  background: var(--accent-border);
  color: #fff;
}

/* ===== 通用 Section ===== */
.section {
  padding: 80px 24px;
}

.section-alt {
  background: var(--accent-bg);
}

.section-inner {
  max-width: 1120px;
  margin: 0 auto;
}

.section-title {
  font-size: 32px;
  letter-spacing: -0.5px;
  margin: 0 0 40px;
  color: var(--text-h);
}

/* ===== 超立方体展示 ===== */
.hypercube-section {
  padding: 0 24px 80px;
}

.hypercube-inner {
  position: relative;
  width: 100%;
  max-width: 480px;
  aspect-ratio: 1;
  margin: 0 auto;
}

/* ===== 页脚 ===== */
.footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  transition: border-color 0.4s ease;
}

.footer-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-copy {
  font-size: 14px;
  color: var(--text);
  margin: 0;
}

.footer-links {
  display: flex;
  gap: 20px;
}

.footer-links a {
  font-size: 14px;
  color: var(--text);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--accent);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .hero {
    padding: 40px 20px 50px;
  }

  .hero-layout {
    flex-direction: column;
    gap: 24px;
  }

  .hero-right {
    text-align: center;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-desc {
    font-size: 16px;
  }

  .section {
    padding: 50px 20px;
  }

  .hypercube-section {
    padding: 0 20px 50px;
  }

  .section-title {
    font-size: 26px;
    margin-bottom: 28px;
  }

  .footer-inner {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
