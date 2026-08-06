<script setup>
import { ref } from 'vue'
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

const leftBroken = ref(false)
const rightBroken = ref(false)
const bulbKey = ref(0)

function onLeftBroken() {
  leftBroken.value = true
  checkBothBroken()
}

function onRightBroken() {
  rightBroken.value = true
  checkBothBroken()
}

function checkBothBroken() {
  if (leftBroken.value && rightBroken.value) {
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
}

function onSwitchToLight() {
  leftBroken.value = false
  rightBroken.value = false
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

    <!-- 灯泡层 -->
    <div class="bulb-layer">
      <div class="bulb-left">
        <Light :key="'left-' + bulbKey" @broken="onLeftBroken" />
      </div>
      <div class="bulb-right">
        <Light :key="'right-' + bulbKey" @broken="onRightBroken" />
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

    <!-- 日夜城市背景区（Hero + 超立方体 + 作品区）：白天 sun_city，黑夜 city3 -->
    <div class="night-scene">
      <div class="day-scene-bg" aria-hidden="true"></div>
      <div class="night-scene-bg" aria-hidden="true"></div>

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
    </div>

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
  background: #a5c8e8; /* 白天：柔和天空蓝 */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

/* 黑夜模式：透明毛玻璃，透出夜空 */
.dark-mode .navbar {
  background: transparent;
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

/* ===== 灯泡层 ===== */
.bulb-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  pointer-events: none;
}

.bulb-left,
.bulb-right {
  position: absolute;
  top: 0;
  pointer-events: auto;
}

.bulb-left {
  left: 0;
}

.bulb-right {
  right: 0;
}

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

/* ===== 日夜城市背景（Hero + 超立方体 + 作品区） ===== */
.night-scene {
  position: relative;
}

/* 白天城市背景（sun_city）：随内容滚动，默认可见，黑夜时淡出 */
.day-scene-bg {
  position: absolute;
  inset: 0;
  z-index: -3;
  background: url('/sun_city.png') center top / 100% auto no-repeat;
  opacity: 1;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.dark-mode .day-scene-bg {
  opacity: 0;
}

/* 浅色遮罩：保证白天文字可读（对应黑夜的深色遮罩） */
.day-scene-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.6) 100%);
}

/* 宽度铺满、高度按比例：两侧不留白；下方在窄屏时留白 */
.night-scene-bg {
  filter: brightness(0.8);
  position: absolute;
  inset: 0;
  z-index: -3;
  background: url('/city3.png') center top / 100% auto no-repeat;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.dark-mode .night-scene-bg {
  opacity: 1;
}

/* 暗色遮罩（稍微加深）：保证内容可读 */
.night-scene-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(10, 15, 28, 0.5) 0%, rgba(10, 15, 28, 0.7) 100%);
}

/* ===== Hero ===== */
.hero {
  max-width: 1120px;
  margin: 0 auto;
  padding: 80px 24px 80px;
  /* 撑满视口并垂直居中，配合日夜城市背景 */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-layout {
  display: flex;
  align-items: center;
  gap: 48px;
}

.hero-right {
  flex: 1;
  min-width: 0;
  text-align: center;
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
  background: #a5c8e8; /* 白天：柔和天空蓝 */
  transition: border-color 0.4s ease, background-color 0.4s ease;
}

/* 黑夜模式：透明透出夜空 */
.dark-mode .footer {
  background: transparent;
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
    min-height: 90vh;
  }

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
