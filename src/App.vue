<script setup>
import { ref } from 'vue'
import Light from './components/Light.vue'
import Dark_more from './components/Dark_more.vue'
import DroneGame from './components/DroneGame.vue'

const leftBroken = ref(false)
const rightBroken = ref(false)

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
    document.documentElement.classList.add('dark-mode')
  }
}

const navLinks = [
  { label: '文章', href: '#posts' },
  { label: '作品', href: '#portfolio' },
  { label: '关于', href: '#about' },
]

const recentPosts = ref([
  {
    title: '第一篇文章标题',
    summary: '这里是一段简短的文章摘要，描述文章的核心内容和要点，吸引读者点击阅读完整内容。',
    date: '2026-07-25',
  },
  {
    title: '第二篇文章标题',
    summary: '这里是一段简短的文章摘要，描述文章的核心内容和要点，吸引读者点击阅读完整内容。',
    date: '2026-07-20',
  },
  {
    title: '第三篇文章标题',
    summary: '这里是一段简短的文章摘要，描述文章的核心内容和要点，吸引读者点击阅读完整内容。',
    date: '2026-07-15',
  },
])

const portfolioItems = ref([
  {
    title: '项目名称',
    description: '简短的项目描述，说明这个项目做了什么',
    tags: ['Vue', 'JavaScript'],
    accent: '#aa3bff',
  },
  {
    title: '项目名称',
    description: '简短的项目描述，说明这个项目做了什么',
    tags: ['React', 'TypeScript'],
    accent: '#3b82f6',
  },
  {
    title: '项目名称',
    description: '简短的项目描述，说明这个项目做了什么',
    tags: ['Node.js', 'Express'],
    accent: '#10b981',
  },
  {
    title: '项目名称',
    description: '简短的项目描述，说明这个项目做了什么',
    tags: ['Python', 'Django'],
    accent: '#f59e0b',
  },
])
</script>

<template>
  <div class="site">
    <!-- 星空背景 -->
    <Dark_more />

    <!-- 无人机石头大战 -->
    <DroneGame />

    <!-- 灯泡层 -->
    <div class="bulb-layer">
      <div class="bulb-left">
        <Light @broken="onLeftBroken" />
      </div>
      <div class="bulb-right">
        <Light @broken="onRightBroken" />
      </div>
    </div>

    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-inner">
        <a href="#" class="logo">YourName</a>
        <nav class="nav-links">
          <a v-for="link in navLinks" :key="link.label" :href="link.href" class="nav-link">
            {{ link.label }}
          </a>
        </nav>
      </div>
    </header>

    <!-- Hero 横幅 -->
    <section class="hero">
      <p class="hero-tag">个人博客 & 作品集</p>
      <h1 class="hero-title">你好，我是<br /><span class="accent">吴俊林</span></h1>
      <p class="hero-desc">
        这里是一句简短的个人简介，描述你擅长的领域、正在做的事情，或者你想传达的理念。
      </p>
      <div class="hero-actions">
        <a href="#posts" class="btn btn-primary">浏览文章</a>
        <a href="#portfolio" class="btn btn-secondary">查看作品</a>
      </div>
    </section>

    <!-- 最近文章 -->
    <section id="posts" class="section">
      <div class="section-inner">
        <h2 class="section-title">最近文章</h2>
        <div class="posts-grid">
          <article v-for="post in recentPosts" :key="post.title" class="post-card">
            <time class="post-date">{{ post.date }}</time>
            <h3 class="post-title">{{ post.title }}</h3>
            <p class="post-summary">{{ post.summary }}</p>
            <a href="#" class="post-link">阅读全文 →</a>
          </article>
        </div>
      </div>
    </section>

    <!-- 作品展示 -->
    <section id="portfolio" class="section section-alt">
      <div class="section-inner">
        <h2 class="section-title">作品展示</h2>
        <div class="portfolio-grid">
          <div v-for="item in portfolioItems" :key="item.title" class="portfolio-card">
            <div class="portfolio-cover" :style="{ background: item.accent + '15' }">
              <div class="portfolio-icon" :style="{ background: item.accent }">
                {{ item.title[0] }}
              </div>
            </div>
            <div class="portfolio-body">
              <h3 class="portfolio-title">{{ item.title }}</h3>
              <p class="portfolio-desc">{{ item.description }}</p>
              <div class="portfolio-tags">
                <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
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

/* ===== Hero ===== */
.hero {
  max-width: 1120px;
  margin: 0 auto;
  padding: 100px 24px 80px;
  text-align: center;
}

.hero-tag {
  font-size: 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
}

.hero-title {
  font-size: 52px;
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

/* ===== 文章卡片 ===== */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.post-card {
  padding: 28px;
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  transition: box-shadow 0.2s, transform 0.2s, background-color 0.4s ease, border-color 0.4s ease;
  display: flex;
  flex-direction: column;
}

.post-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.post-date {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 12px;
}

.post-title {
  font-size: 20px;
  margin: 0 0 10px;
  color: var(--text-h);
  line-height: 1.3;
}

.post-summary {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 16px;
  flex: 1;
}

.post-link {
  font-size: 14px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}

.post-link:hover {
  text-decoration: underline;
}

/* ===== 作品卡片 ===== */
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.portfolio-card {
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s, background-color 0.4s ease, border-color 0.4s ease;
}

.portfolio-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.portfolio-cover {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.portfolio-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.portfolio-body {
  padding: 24px;
}

.portfolio-title {
  font-size: 18px;
  margin: 0 0 8px;
  color: var(--text-h);
}

.portfolio-desc {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 16px;
}

.portfolio-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--code-bg);
  color: var(--text);
  transition: background-color 0.4s ease, color 0.4s ease;
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
    padding: 60px 20px 50px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-desc {
    font-size: 16px;
  }

  .posts-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-grid {
    grid-template-columns: 1fr;
  }

  .section {
    padding: 50px 20px;
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
