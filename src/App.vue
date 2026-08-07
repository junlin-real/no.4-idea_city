<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import Dark_more from './components/Dark_more.vue'
import DroneGame from './components/DroneGame.vue'
import PortfolioCarousel from './components/PortfolioCarousel.vue'
import HyperCube from './components/HyperCube.vue'
import PendantLight from './components/PendantLight.vue'
import loding from './components/loding.vue'

const loadingDone = ref(false)
const loadingMode = ref('day')
const loadingKey = ref(0)
const transitioning = ref(false) // 是否正在播放切换动画
const gameVisible = ref(true)    // 控制小游戏组件挂载/销毁

// 每次刷新都从白昼模式开始

const lampKey = ref(0)

// 吊灯打破 → 直接坠入黑夜
function onLampBroken() {
  gameVisible.value = false
  document.documentElement.classList.add('dark-mode')
  loadingMode.value = 'night'
  loadingKey.value++
  transitioning.value = true
  loadingDone.value = false
}

function onTransitionDone() {
  transitioning.value = false
  loadingDone.value = true
}

function onSwitchToLight() {
  loadingDone.value = false
  loadingMode.value = 'day'
  lampKey.value++
  gameVisible.value = true
}

/* ===== Hero 入场序列：文字逐字打出，其余元素依次浮现 ===== */

// 打字机：逐个字符写入，保留原有标签结构（<br>、<span class="accent"> 等）
function typeWriter(el, delay) {
  return new Promise((resolve) => {
    const tokens = el.innerHTML.match(/<[^>]*>|[^<]+/g) || []
    const total = tokens.reduce(
      (n, t) => (t.startsWith('<') ? n : n + t.length),
      0
    )
    let shown = 0
    el.style.opacity = 1
    el.textContent = ''

    // 光标
    const caret = document.createElement('span')
    caret.className = 'type-caret'
    caret.setAttribute('aria-hidden', 'true')

    function tick() {
      // 按已显示字符数重建 innerHTML
      let out = ''
      let remaining = shown
      for (const t of tokens) {
        if (t.startsWith('<')) {
          out += t
          continue
        }
        const take = Math.min(remaining, t.length)
        out += t.slice(0, take)
        remaining -= take
        if (remaining <= 0) break
      }
      el.innerHTML = out

      if (shown < total) {
        shown++
        setTimeout(tick, delay)
      } else {
        el.appendChild(caret)
        resolve()
      }
    }
    tick()
  })
}

watch(loadingDone, async (done) => {
  if (!done) return
  const typeEl = document.querySelector('.hero-type')
  const fadeEls = [...document.querySelectorAll('.hero-reveal')]

  // 减弱动效：全部直接显示
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (typeEl) typeEl.style.opacity = 1
    fadeEls.forEach((el) => el.classList.remove('hero-reveal'))
    return
  }

  // 打字前缓存完整 HTML（含 <br>、accent 高亮），便于减弱动效时直接恢复
  if (typeEl) typeEl.dataset.fullText = typeEl.innerHTML

  // 编排：① 标签淡入 → ② 标题打字 → ③ 其余依次淡入
  const reveal = (els, startDelay = 0) => {
    if (!els.length) return
    gsap.fromTo(
      els,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.09,
        delay: startDelay,
        ease: 'power3.out',
        overwrite: true,
        // 先移除隐藏类再清内联样式，避免 clearProps 把元素打回透明导致闪烁
        onComplete: () => {
          els.forEach((el) => el.classList.remove('hero-reveal'))
          gsap.set(els, { clearProps: 'transform,opacity' })
        },
      }
    )
  }

  const [first, ...rest] = fadeEls
  reveal(first ? [first] : [])

  if (typeEl) await typeWriter(typeEl, Number(typeEl.dataset.typeDelay) || 95)

  document.querySelectorAll('.type-caret').forEach((c) => c.remove())
  reveal(rest)
})

/* ===== 滚动入场：区块进入视口时淡入上移 ===== */
let revealObserver = null

function setupReveal() {
  const els = document.querySelectorAll('.reveal')
  if (!els.length) return
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in')
          revealObserver.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -48px 0px' }
  )
  els.forEach((el) => revealObserver.observe(el))
}

/* ===== 背景视差：城市背景随滚动轻微上移 ===== */
const dayBgRef = ref(null)
const nightBgRef = ref(null)
let scrollRaf = null

function onScroll() {
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    const y = Math.min(window.scrollY * -0.05, -45)
    const transform = `translate3d(0, ${y}px, 0) scale(1.1)`
    if (dayBgRef.value) dayBgRef.value.style.transform = transform
    if (nightBgRef.value) nightBgRef.value.style.transform = transform
  })
}

onMounted(() => {
  setupReveal()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  revealObserver?.disconnect()
  window.removeEventListener('scroll', onScroll)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

const navLinks = [
  { label: '作品', href: '#portfolio' },
  { label: '实验室', href: '#lab' },
  { label: '联系', href: '#contact' },
]

const skillTags = ['Vue', 'GSAP', 'Canvas', 'Node.js', 'Three.js', 'CSS']

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

    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-inner">
        <a href="#" class="logo">JunLin <span class="logo-moon">◐</span></a>
        <nav class="nav-links">
          <a v-for="link in navLinks" :key="link.label" :href="link.href" class="nav-link">
            {{ link.label }}
          </a>
        </nav>
      </div>
    </header>

    <!-- 日夜城市背景区（Hero + 超立方体 + 作品区）：白天 sun_city，黑夜 city3 -->
    <div class="night-scene">
      <div class="day-scene-bg" ref="dayBgRef" aria-hidden="true"></div>
      <div class="night-scene-bg" ref="nightBgRef" aria-hidden="true"></div>

    <!-- Hero 横幅 -->
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-main">
          <p class="hero-tag hero-reveal">前端开发者 · 白日梦想家</p>
          <h1 class="hero-title hero-type" data-type-delay="130">你好，我是<br /><span class="accent">JunLin</span></h1>
          <p class="hero-sub hero-reveal">把想法做成看得见的东西</p>
          <p class="hero-desc hero-reveal">前端开发者，专注动效与交互。</p>
          <div class="hero-actions hero-reveal">
            <a href="#portfolio" class="btn btn-primary">查看作品</a>
            <a href="#lab" class="btn btn-secondary">深夜实验室</a>
          </div>
        </div>
        <aside class="hero-meta hero-reveal">
          <p>2026</p>
          <p>PORTFOLIO<br />NO.4</p>
        </aside>
      </div>
      <div class="hero-strip hero-reveal">
        <a href="mailto:hello@junlin.dev">hello@junlin.dev</a>
        <a href="#">GitHub ↗</a>
        <span class="hero-scroll">↓ 滚动进入这座城市</span>
      </div>
    </section>

    <!-- 作品展示 -->
    <section id="portfolio" class="section">
      <div class="section-inner">
        <div class="sec-head reveal">
          <h2 class="sec-title"><span class="sec-no">01</span>作品展示</h2>
          <span class="sec-line" aria-hidden="true"></span>
          <p class="sec-guide mono">SELECTED WORKS / 2024–2026</p>
        </div>
        <PortfolioCarousel class="reveal" />
      </div>
    </section>

    <!-- 深夜实验室：超立方体 + 关于我 -->
    <section id="lab" class="section lab-section">
      <div class="section-inner">
        <!-- 吊灯：absolute 挂在区块右侧，随区块滚动；可拖拽晃动，甩动或点击三次打破，坠入黑夜 -->
        <div class="pendant-layer">
          <PendantLight :key="lampKey" @broken="onLampBroken" />
        </div>

        <div class="sec-head reveal">
          <h2 class="sec-title"><span class="sec-no">02</span>深夜实验室</h2>
          <span class="sec-line" aria-hidden="true"></span>
          <p class="sec-guide">把代码当成玩具，把深夜留给实验。</p>
        </div>

        <div class="lab-grid reveal">
          <div class="lab-visual">
            <div class="hypercube-inner">
              <HyperCube />
            </div>
            <p class="lab-caption">可交互 · 拖拽旋钮调色</p>
          </div>
          <div class="lab-body">
            <p class="lab-motto">「白天是程序，深夜是魔法」</p>
            <div class="lab-about">
              <h3 class="lab-about-title">关于我</h3>
              <p>
                自 2022 年起自学前端，沉迷于动效与交互，喜欢把东西做得“能玩”。
              </p>
            </div>
            <div class="lab-tags">
              <span v-for="tag in skillTags" :key="tag" class="skill-chip">{{ tag }}</span>
            </div>
            <a href="#contact" class="lab-cta">把灯泡打破，我们聊聊 ↓</a>
          </div>
        </div>
      </div>
    </section>
    </div>

    <!-- 页脚 · 联系 -->
    <footer id="contact" class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <p class="footer-name">JunLin · 独立创作者</p>
          <p class="footer-copy">&copy; 2026 JunLin · 用代码和好奇心搭建</p>
        </div>
        <div class="footer-links">
          <a href="mailto:hello@junlin.dev">hello@junlin.dev</a>
          <a href="#">GitHub</a>
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

/* ===== 动效状态 ===== */
/* Hero 入场：文字初始隐藏（打字机开始后显示），按钮等由 gsap 依次浮现 */
.hero-type {
  opacity: 0;
}

.hero-reveal {
  opacity: 0;
}

/* 打字机光标 */
.type-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 2px;
  background: currentColor;
  vertical-align: -0.1em;
  animation: caret-blink 0.9s steps(2, start) infinite;
}

@keyframes caret-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* 滚动入场：初始隐藏，进入视口后加 .reveal-in */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.reveal-in {
  opacity: 1;
  transform: none;
}

/* 用户偏好减弱动效时，直接显示内容 */
@media (prefers-reduced-motion: reduce) {
  .hero-reveal,
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* 锚点跳转时避开吸顶导航 */
#portfolio,
#lab,
#contact {
  scroll-margin-top: 60px;
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

/* ===== 吊灯层：absolute，悬挂点对齐引导语「把代码当成玩具…」那一行 ===== */
.pendant-layer {
  position: absolute;
  /* 区块 padding-top 80px + sec-head 半高，让悬挂点落在引导语垂直中心 */
  top: 102px;
  right: 16px;
  z-index: 60;
  pointer-events: none;
}

.pendant-layer > * {
  pointer-events: auto;
}

/* 小屏：灯缩小并往区块右下收，避免遮挡内容 */
@media (max-width: 768px) {
  .pendant-layer {
    top: auto;
    bottom: 8px;
    right: 8px;
  }

  .pendant-layer :deep(.pendant) {
    transform: scale(0.72);
    transform-origin: bottom right;
  }
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-h);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.logo-moon {
  color: var(--accent);
  font-size: 16px;
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
  padding: 96px 24px 0;
  /* 撑满视口并垂直居中，配合日夜城市背景 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 64px;
  align-items: center;
}

.hero-main {
  min-width: 0;
  text-align: left;
}

.hero-meta {
  border-left: 1px solid var(--border);
  padding-left: 28px;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.9;
  letter-spacing: 2px;
  color: var(--text);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-meta p {
  margin: 0;
}

.hero-tag {
  font-size: 15px;
  letter-spacing: 5px;
  color: var(--accent);
  margin-bottom: 24px;
  opacity: 0.9;
}

.hero-title {
  font-size: 60px;
  line-height: 1.12;
  letter-spacing: -2px;
  margin: 0 0 16px;
  color: var(--text-h);
}

.hero-title .accent {
  color: var(--accent);
}

.hero-sub {
  font-size: 22px;
  font-weight: 500;
  color: var(--text-h);
  margin: 0 0 20px;
}

.hero-desc {
  font-size: 18px;
  line-height: 1.7;
  color: var(--text);
  max-width: 540px;
  margin: 0 0 36px;
}

.hero-strip {
  margin-top: auto;
  padding: 22px 0 26px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 32px;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 1px;
}

.hero-strip a {
  color: var(--text);
  text-decoration: none;
  transition: color 0.2s;
}

.hero-strip a:hover {
  color: var(--accent);
}

.hero-scroll {
  margin-left: auto;
  color: var(--text);
  opacity: 0.55;
  animation: scroll-bounce 2.2s ease-in-out infinite;
}

@keyframes scroll-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
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

.section-inner {
  max-width: 1120px;
  margin: 0 auto;
}

/* 编辑式区块头：编号居左 + 弹性引导线 + 说明居右 */
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 56px;
}

.sec-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--border) 0%, transparent 92%);
  transform: translateY(-6px);
  min-width: 40px;
}

.sec-title {
  font-size: 30px;
  letter-spacing: -0.5px;
  margin: 0;
  color: var(--text-h);
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.sec-no {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--accent);
}

.sec-guide {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  max-width: 340px;
  text-align: right;
}

.sec-guide.mono {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--text);
  opacity: 0.8;
  white-space: nowrap;
}

/* ===== 深夜实验室 ===== */
.lab-section {
  position: relative;
  padding: 80px 24px 110px;
}

.lab-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 64px;
  align-items: center;
}

.lab-body {
  min-width: 0;
}

.lab-motto {
  margin: 0 0 36px;
  font-size: 22px;
  letter-spacing: 2px;
  color: var(--accent);
}

.lab-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.skill-chip {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  color: var(--text-h);
  transition: border-color 0.2s, color 0.2s;
}

.skill-chip:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.lab-about {
  max-width: 480px;
  color: var(--text);
  line-height: 1.8;
}

.lab-about-title {
  font-size: 15px;
  letter-spacing: 3px;
  color: var(--text-h);
  margin: 0 0 14px;
}

.lab-cta {
  display: inline-block;
  margin-top: 36px;
  font-size: 15px;
  letter-spacing: 1px;
  color: var(--accent);
  text-decoration: none;
  transition: opacity 0.2s;
}

.lab-cta:hover {
  opacity: 0.8;
}

.hypercube-inner {
  position: relative;
  width: 100%;
  max-width: 440px;
  aspect-ratio: 1;
}

.lab-caption {
  margin: 8px 0 0;
  text-align: center;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--text);
  opacity: 0.7;
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

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
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
    padding: 72px 20px 0;
  }

  .hero-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .hero-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px 28px;
    border-left: none;
    border-top: 1px solid var(--border);
    padding: 20px 0 0;
  }

  .hero-title {
    font-size: 40px;
  }

  .hero-desc {
    font-size: 16px;
  }

  .hero-sub {
    font-size: 18px;
  }

  .hero-strip {
    flex-wrap: wrap;
    gap: 12px 24px;
  }

  .hero-scroll {
    margin-left: 0;
  }

  .section {
    padding: 56px 20px;
  }

  .lab-section {
    padding: 56px 20px 80px;
  }

  .sec-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 40px;
  }

  .sec-line {
    flex: none;
    width: 100%;
    transform: none;
    min-width: 0;
  }

  .sec-guide {
    text-align: left;
    max-width: none;
  }

  .lab-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .lab-motto {
    font-size: 18px;
  }

  .lab-about {
    margin-top: 0;
  }

  .footer-inner {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .hero-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
