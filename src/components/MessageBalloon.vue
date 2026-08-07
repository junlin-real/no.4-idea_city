<template>
  <!-- ================= 气球场：fixed 全屏，仅气球本体可点 ================= -->
  <div class="balloon-field" v-show="isDay">
    <div
      v-for="balloon in balloons"
      :key="balloon.key"
      class="balloon"
      :style="{ '--balloon-color': balloon.color }"
      :ref="(el) => bindBalloonEl(balloon.key, el)"
      @click="onBalloonClick(balloon)"
    >
      <!-- 彩蛋气球：闪电 SVG 造型（保持原始形状，无光晕、无火圈） -->
      <template v-if="balloon.isEaster">
        <svg class="easter-svg" viewBox="0 0 48 46" fill="none" aria-hidden="true">
          <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
          <ellipse cx="5.508" cy="14.704" fill="#ede6ff" rx="5.508" ry="14.704" opacity="0.6" transform="matrix(.00324 1 1 -.00324 -4.47 31.516)"/>
          <ellipse cx="10.399" cy="29.851" fill="#ede6ff" rx="10.399" ry="29.851" opacity="0.5" transform="matrix(.00324 1 1 -.00324 -39.328 7.883)"/>
          <ellipse cx="5.508" cy="30.487" fill="#7e14ff" rx="5.508" ry="30.487" opacity="0.55" transform="rotate(89.814 -25.913 -14.639)scale(1 -1)"/>
          <ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" opacity="0.55" transform="rotate(89.814 -32.644 -3.334)scale(1 -1)"/>
          <ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" opacity="0.55" transform="matrix(.00324 1 1 -.00324 -34.34 30.47)"/>
          <ellipse cx="14.072" cy="22.078" fill="#ede6ff" rx="14.072" ry="22.078" opacity="0.5" transform="rotate(93.35 24.506 48.493)scale(-1 1)"/>
          <ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" opacity="0.6" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/>
          <ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" opacity="0.6" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/>
          <ellipse cx=".387" cy="8.972" fill="#7e14ff" rx="4.407" ry="29.108" opacity="0.55" transform="rotate(39.51 .387 8.972)"/>
          <ellipse cx="47.523" cy="-6.092" fill="#7e14ff" rx="4.407" ry="29.108" opacity="0.55" transform="rotate(37.892 47.523 -6.092)"/>
          <ellipse cx="41.412" cy="6.333" fill="#47bfff" rx="5.971" ry="9.665" opacity="0.6" transform="rotate(37.892 41.412 6.333)"/>
          <ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" opacity="0.55" transform="rotate(37.892 -1.88 38.332)"/>
          <ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" opacity="0.55" transform="rotate(37.892 -1.88 38.332)"/>
          <ellipse cx="35.651" cy="29.907" fill="#7e14ff" rx="4.407" ry="29.108" opacity="0.55" transform="rotate(37.892 35.651 29.907)"/>
          <ellipse cx="38.418" cy="32.4" fill="#47bfff" rx="5.971" ry="15.297" opacity="0.6" transform="rotate(37.892 38.418 32.4)"/>
        </svg>
      </template>
      <!-- 普通气球造型（shape 决定形状变体） -->
      <template v-else>
        <div class="balloon-body" :class="`shape-${balloon.shape}`">
          <div class="balloon-highlight" aria-hidden="true"></div>
          <span class="balloon-preview">{{ balloon.preview }}</span>
          <!-- 新留言入场火花：8 颗光点沿圆周散开 -->
          <span
            v-for="i in 8"
            :key="`spark-${i}`"
            v-if="balloon.spawned"
            class="spawn-spark"
            :style="{ '--i': i }"
            aria-hidden="true"
          ></span>
        </div>
        <!-- 新留言入场火圈：燃烧的火焰环围绕气球旋转（放在 body 外，避免被形状 clip-path 裁掉） -->
        <span v-if="balloon.spawned" class="spawn-fire-ring" aria-hidden="true"></span>
      </template>
      <!-- 气球小结（尾部三角） -->
      <span class="balloon-knot" aria-hidden="true"></span>

      <!-- 点赞标签：气球下端，左爱心 + 右数值 -->
      <span class="balloon-like">♥ {{ balloon.count }}</span>

      <!-- 绳子：锚点固定在气球底部，贝塞尔曲线自然下垂，末端渐隐无端点 -->
      <svg class="string" viewBox="0 0 60 46" aria-hidden="true">
        <defs>
          <linearGradient id="stringFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8a6a4d" stop-opacity="0.85" />
            <stop offset="0.75" stop-color="#8a6a4d" stop-opacity="0.45" />
            <stop offset="1" stop-color="#8a6a4d" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path class="string-line" stroke="url(#stringFade)" d="M 30 0 C 30 14 30 28 30 42" />
      </svg>

      <!-- 点击后展开的文本气泡（原地出现） -->
      <Transition name="bubble">
        <div v-if="balloon.showing" class="bubble" @click.stop>
          <p class="bubble-text">{{ balloon.msg.content }}</p>
          <button
            class="like-btn"
            :class="{ liked: balloon.liked }"
            :disabled="balloon.liked"
            @click.stop="onLike(balloon)"
          >
            {{ balloon.liked ? '已赞 ♥' : '赞一个 ♥' }}
          </button>
        </div>
      </Transition>
    </div>

    <!-- 烟花画布 -->
    <canvas ref="fxCanvasRef" class="fx-canvas" aria-hidden="true"></canvas>

    <!-- 形状裁切定义（隐藏）：贝塞尔圆润轮廓 + 米老鼠并集，保证拼接处无缝 -->
    <svg class="shape-clips" width="0" height="0" aria-hidden="true">
      <defs>
        <!-- 米老鼠：脸 + 两耳三个圆形并集，拼接处天然圆滑 -->
        <clipPath id="clip-mickey" clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.68" r="0.42" />
          <circle cx="0.2" cy="0.3" r="0.22" />
          <circle cx="0.8" cy="0.3" r="0.22" />
        </clipPath>
        <!-- 五角星：曲线圆角 + 描边圆角，尖角更钝更圆润 -->
        <clipPath id="clip-star" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.06
                   C 0.54 0.24 0.62 0.32 0.74 0.34
                   L 0.95 0.4
                   C 0.8 0.5 0.75 0.58 0.71 0.74
                   L 0.79 0.94
                   C 0.69 0.86 0.6 0.82 0.5 0.82
                   C 0.4 0.82 0.31 0.86 0.21 0.94
                   L 0.29 0.74
                   C 0.25 0.58 0.2 0.5 0.05 0.4
                   L 0.26 0.34
                   C 0.38 0.32 0.46 0.24 0.5 0.06 Z"
                fill="black"
                stroke="black"
                stroke-width="0.05"
                stroke-linejoin="round"
                stroke-linecap="round" />
        </clipPath>
        <!-- 带尾巴的三角形（风筝形）：顶部尖 + 两侧曲线 + 底部尾巴 -->
        <clipPath id="clip-triangle" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.02
                   C 0.6 0.28 0.85 0.46 0.95 0.58
                   L 0.62 0.58
                   L 0.5 0.96
                   L 0.38 0.58
                   L 0.05 0.58
                   C 0.15 0.46 0.4 0.28 0.5 0.02 Z" />
        </clipPath>
        <!-- 爱心：双圆弧顶部 + 底部尖 -->
        <clipPath id="clip-heart" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.95
                   C 0.42 0.78 0.14 0.66 0.14 0.42
                   C 0.14 0.22 0.3 0.05 0.5 0.22
                   C 0.7 0.05 0.86 0.22 0.86 0.42
                   C 0.86 0.66 0.58 0.78 0.5 0.95 Z" />
        </clipPath>
      </defs>
    </svg>
  </div>

  <!-- ================= 留言弹窗（Teleport 到 body，避免被定位父级裁剪） ================= -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modalOpen" class="modal-mask" @click.self="modalOpen = false">
        <div class="modal-card">
          <h3 class="modal-title">🎈 放飞一句心里话</h3>
          <textarea
            v-model="draft"
            class="modal-textarea"
            maxlength="200"
            rows="4"
            placeholder="写点什么，它会变成气球升上天空…"
          ></textarea>
          <div class="modal-foot">
            <span class="modal-count">{{ draft.length }}/200</span>
            <button class="modal-submit" :disabled="submitting || !draft.trim()" @click="submitMessage">
              放飞 🎈
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// ============================================================
// 留言气球 · 前端组件（单文件版 · 假数据模式）
//
// 职责：
//  1. 从数据层拿留言 → 建"球签池"，视口内维持 ≤10 个气球随机漂浮
//  2. 点击气球 → 原位展开文本气泡 + 点赞按钮，几秒后自然消失
//  3. 点赞成功且气球仍在视口内 → 放烟花
//  4. 留言弹窗：提交后立即放飞一个新气球（特殊情况，可突破 10 上限）
//  5. 仅白昼模式渲染：监听 html.dark-mode，黑夜自动隐藏并暂停
//
// ⚠️ 假数据说明：
//  目前数据来自下面的 MOCK_MESSAGES。后续接入真实后端时，
//  只需替换「数据访问层」的三个函数（fetchMessages / likeMessage / createMessage），
//  组件其余部分零改动。
// ============================================================

const emit = defineEmits(['day'])

// ---------- 常量 ----------
const MAX_ON_SCREEN = 10      // 正常情况视口内气球上限
const BUBBLE_DURATION = 2500  // 文本气泡停留时间（毫秒）
const MARGIN = 220            // 出界判定边距（px），保证彻底飞出才回收
// 速度向量：vx 恒正（向右）、vy 恒负（向上），两方向独立随机数值（上快于右，符合气球上升感）
// 范围故意拉大 → 气球散布差异大，进场/离场时间错开，不会"一轮飞完才第二轮"
const VX_MIN = 20
const VX_MAX = 100
const VY_MIN = 40
const VY_MAX = 100
// 绳子伪物理参数
const ROPE_LENGTH = 34        // 绳长（px）
const ROPE_STIFFNESS = 10     // 弹簧刚度：绳子趋近目标摆角的快慢
const ROPE_DAMP = 2.4         // 阻尼系数（越大摆动越快停下）
const COLORS = [
  '#ff8fab', '#7bdff2', '#f9c74f', '#90be6d', '#b388eb',
  '#f28482', '#80ed99', '#ffd166', '#a2d2ff', '#f7b2b7',
]

// 气球形状：米老鼠 / 五角星 / 椭圆 / 带尾巴三角形 / 爱心（见样式区 .shape-*）
const SHAPES = ['mickey', 'star', 'oval', 'triangle', 'heart']

// ============================================================
// 数据访问层（假数据）
// 数据结构约定：留言对象 = { id, content, like_count }
// ============================================================

// 彩蛋：用户先发一条留言 → 刷新页面 → 再发一条留言时，彩蛋气球出现
const EASTER_EGG = { id: 'easter-egg', content: '哈哈，我没弄后端哦', like_count: 999 }
const SENT_FLAG_KEY = 'midinmy_balloon_sent' // localStorage 标记：刷新前是否发过留言

// 组件启动时读取"刷新前是否发过留言"
let hadSentBefore = false
try {
  hadSentBefore = localStorage.getItem(SENT_FLAG_KEY) === '1'
} catch { /* 隐私模式下 localStorage 不可用，忽略 */ }

// 内置假留言：初始气球就从这里取
const MOCK_MESSAGES = [
  { id: 1, content: '你好呀，欢迎来到我的小站 🎈', like_count: 3 },
  { id: 2, content: '把想法做成看得见的东西', like_count: 7 },
  { id: 3, content: '白天是程序，深夜是魔法', like_count: 12 },
  { id: 4, content: '愿你今天也有好心情 ☀️', like_count: 5 },
  { id: 5, content: '前端开发者的快乐很简单：一个能跑起来的 demo', like_count: 2 },
  { id: 6, content: '人生苦短，我用 Vue', like_count: 9 },
  { id: 7, content: '每一次点击，都是一次小小的鼓励', like_count: 4 },
  { id: 8, content: '希望这里的每个气球都能飞到想去的地方', like_count: 6 },
  { id: 9, content: '加班写代码，也要记得抬头看看天空', like_count: 8 },
  { id: 10, content: '看到这里的你，今天也很棒 ✨', like_count: 11 },
  { id: 11, content: '代码是写给未来自己的信', like_count: 5 },
  { id: 12, content: '愿你眼中有光，心中有火', like_count: 9 },
  { id: 13, content: '世界上只有一种英雄主义：热爱生活', like_count: 14 },
  { id: 14, content: '保持好奇，保持热爱', like_count: 6 },
  { id: 15, content: '慢慢来，比较快', like_count: 10 },
  { id: 16, content: '每一个深夜都是灵感的孵化器', like_count: 7 },
  { id: 17, content: '愿你被这个世界温柔以待', like_count: 13 },
  { id: 18, content: '梦想不是用来想的，是用来实现的', like_count: 8 },
  { id: 19, content: '今天也要加油鸭 🦆', like_count: 4 },
  { id: 20, content: '谢谢你点开这封来自天空的信', like_count: 16 },
]

// 假数据库：内存数组（刷新页面即重置，符合"假数据演示"定位）
const db = ref([...MOCK_MESSAGES])

// 拉取留言列表（返回 Promise<留言数组>，新留言在前）
function fetchMessages() {
  return Promise.resolve([...db.value])
}

// 点赞（返回 Promise<新点赞数>；同一浏览器同一消息只允许一次，由 likedSet 拦截）
function likeMessage(id) {
  // 彩蛋不在假数据库里，直接按 id 特殊处理
  if (id === EASTER_EGG.id) {
    EASTER_EGG.like_count += 1
    return Promise.resolve(EASTER_EGG.like_count)
  }
  const msg = db.value.find((m) => m.id === id)
  if (!msg) return Promise.reject(new Error('消息不存在'))
  msg.like_count += 1
  return Promise.resolve(msg.like_count)
}

// 发布留言（返回 Promise<新留言对象>）
function createMessage(content) {
  const msg = { id: Date.now(), content, like_count: 0 }
  db.value.unshift(msg)
  return Promise.resolve(msg)
}

// ============================================================
// 组件状态
// ============================================================

const balloons = ref([])   // 视口内的气球（渲染列表）
const pool = ref([])       // 球签池：数据层拉来的全部留言
const runtime = new Map()  // key → 运动状态 { x, y, vx, vy, phase, swayAmp, swaySpeed, el }（非响应式，每帧直写 DOM）
const likedSet = new Set() // 本次访问已赞过的留言 id（刷新后重置）
const isDay = ref(true)
const modalOpen = ref(false)
const draft = ref('')
const fxCanvasRef = ref(null)

let rafId = null
let lastTime = 0
let seedKey = 0
let darkObserver = null

// ---------- 数据加载 ----------
async function loadMessages() {
  try {
    pool.value = await fetchMessages()
  } catch (err) {
    console.warn('留言加载失败', err)
    pool.value = []
  }
}

// ---------- 生成与回收 ----------
// 从池里挑一条还没上屏的留言，返回其对象；池空返回 null
function pickFromPool() {
  const onScreen = new Set(balloons.value.map((b) => b.msg.id))
  const free = pool.value.filter((m) => !onScreen.has(m.id))
  if (!free.length) return null
  return free[Math.floor(Math.random() * free.length)]
}

// 出现位置：第三象限外侧边缘（以视口中心为原点，第三象限 = 屏幕左下）
// 位置跨度大 + 速度差异大 → 各球进场/离场时间错开，屏幕任何时刻都有不同阶段的球，
// 不会出现"一轮全部飞完才第二轮"的空窗
function spawnSpot() {
  return {
    x: -(10 + Math.random() * 140),   // 左边缘外侧：x ∈ [-150, -10]
    // 下边缘外侧：y 上限必须小于出界判定 (h + MARGIN)，否则一出生就被回收
    y: window.innerHeight + 10 + Math.random() * 180, // y ∈ [h+10, h+190]
  }
}

// 放飞一个气球（msg 为留言对象；特殊放飞 force=true 时忽略上限）
function launch(msg, force = false, isEaster = false) {
  if (!msg) return
  if (!force && balloons.value.length >= MAX_ON_SCREEN) return
  const key = `balloon-${++seedKey}`

  // 彩蛋：复活点固定左下角外侧，严格沿 左下→右上 对角线直线飞行
  // 方向固定（45° 对角线），速率随机 → 路线不变、快慢有差异
  let spot, vx, vy, swayAmp
  if (isEaster) {
    spot = { x: -50, y: window.innerHeight + 50 } // 固定左下角复活点
    const speed = 70 + Math.random() * 80         // 速率随机（70~150）
    const dir = Math.SQRT1_2                       // cos(45°) = sin(45°)
    vx = speed * dir
    vy = -speed * dir
    swayAmp = 0                                    // 摆动归零，保证严格直线
  } else {
    spot = spawnSpot()
    vx = VX_MIN + Math.random() * (VX_MAX - VX_MIN)
    vy = -(VY_MIN + Math.random() * (VY_MAX - VY_MIN))
    swayAmp = 10 + Math.random() * 14
  }

  const balloon = {
    key,
    msg,
    preview: msg.content.slice(0, 5),           // 气球上显示留言开头几个字
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    count: msg.like_count,
    showing: false,
    liked: likedSet.has(msg.id),
    special: force, // 特殊放飞（留言提交）的气球才有入场特效
    spawned: false,
    isEaster, // 彩蛋气球：闪电 SVG 造型，无光晕、无火圈
  }
  balloons.value.push(balloon)
  runtime.set(key, {
    balloon,
    x: spot.x,
    y: spot.y,
    vx,
    vy,
    phase: Math.random() * Math.PI * 2,
    swayAmp,
    swaySpeed: 0.6 + Math.random() * 1.2,
    // 绳子摆锤状态：theta 为摆角（0 = 垂直下垂），thetaVel 为角速度
    theta: (Math.random() - 0.5) * 0.4,
    thetaVel: 0,
    boost: 0, // 点赞放飞标记：>0 时速度倍增，且随时间衰减
    el: null,
    stringEl: null,
  })
}

// Vue 渲染完气球 DOM 后回调：把元素存进运动状态，供每帧直写 transform / 绳子路径
function bindBalloonEl(key, el) {
  const r = runtime.get(key)
  if (r) {
    r.el = el
    r.stringEl = el?.querySelector('.string')
  }
}

// 回收飞出视界的气球：从渲染列表与运动表移除，再从池里补新
function recycle(key) {
  const r = runtime.get(key)
  if (r?.balloon) {
    const idx = balloons.value.indexOf(r.balloon)
    if (idx >= 0) balloons.value.splice(idx, 1)
  }
  runtime.delete(key)
  // 未满员且池里有货 → 补一个新气球（保持"视图内恒 ≤10"）
  if (balloons.value.length < MAX_ON_SCREEN) launch(pickFromPool())
}

// ---------- 运动循环 ----------
function tick(now) {
  rafId = requestAnimationFrame(tick)
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  for (const [key, r] of runtime) {
    if (r.paused) continue // 气泡展开时气球停飘
    r.phase += dt * r.swaySpeed
    // 点赞放飞加速：boost 从 1 平滑衰减到 0，期间速度倍增、摆动加剧（放飞感）
    const speedMul = 1 + (r.boost || 0) * 6
    if (r.boost > 0) r.boost = Math.max(0, r.boost - dt * 0.35)
    // 直线漂移 + 正弦摆动 → 像气球一样飘
    r.x += (r.vx * speedMul + Math.sin(r.phase) * r.swayAmp) * dt
    r.y += r.vy * speedMul * dt
    if (r.el) {
      r.el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0) rotate(${Math.sin(r.phase * 0.7) * 5}deg)`
      // 留言放飞的气球首次进入视口 → 触发入场特效（光环 + 星星，只播一次）
      const b = r.balloon
      if (b && b.special && !b.spawned && r.x >= 0 && r.y <= window.innerHeight) {
        b.spawned = true
        // 特效播完后移除特效元素，避免永久滞留 DOM（3s 足够动画播完）
        setTimeout(() => {
          if (b) b.spawned = false
        }, 3000)
      }
    }
    // 绳子伪物理：弹簧-阻尼摆锤模型
    // 稳态偏角由速度方向决定（绳子拖在运动方向的反侧），叠加正弦摆动的抖动
    const targetTheta = -Math.atan2(r.vx, -r.vy) * 0.7 + Math.sin(r.phase * 0.9) * 0.06
    r.thetaVel += (targetTheta - r.theta) * ROPE_STIFFNESS * dt
    r.thetaVel *= Math.exp(-ROPE_DAMP * dt)
    r.theta += r.thetaVel * dt
    updateString(r)
    // 飞出视界（含边距）→ 回收并补新
    if (r.x < -MARGIN || r.x > window.innerWidth + MARGIN || r.y < -MARGIN || r.y > window.innerHeight + MARGIN) {
      recycle(key)
    }
  }
}

// 根据摆角更新绳子路径：锚点（气球底部中心）→ 三次贝塞尔自然下垂
// 控制点让绳身先竖直垂下一段，再向摆角方向弯曲，模拟真实绳子的柔软
function updateString(r) {
  const svg = r.stringEl
  if (!svg) return
  const path = svg.querySelector('path')
  const W = svg.viewBox.baseVal.width
  const midX = W / 2
  const endX = midX + Math.sin(r.theta) * ROPE_LENGTH * 0.9
  const endY = ROPE_LENGTH
  // 控制点：上半段几乎竖直（惯性小），下半段向摆角方向弯（惯性大）
  const c1x = midX + Math.sin(r.theta) * ROPE_LENGTH * 0.15
  const c1y = ROPE_LENGTH * 0.28
  const c2x = midX + Math.sin(r.theta) * ROPE_LENGTH * 0.62
  const c2y = ROPE_LENGTH * 0.72
  path.setAttribute('d', `M ${midX} 0 C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`)
}

// ---------- 交互：点击气球 → 文本气泡 ----------
// 每个气球独立的消失定时器，互不干扰（点 A 再点 B，A 的气泡仍会按时消失）
const bubbleTimers = new Map()

function onBalloonClick(balloon) {
  if (balloon.showing) return
  const r = runtime.get(balloon.key)
  if (r) r.paused = true // 暂停漂浮，让文本"在原地"展示
  balloon.showing = true
  clearTimeout(bubbleTimers.get(balloon.key))
  bubbleTimers.set(
    balloon.key,
    setTimeout(() => {
      balloon.showing = false
      const rr = runtime.get(balloon.key)
      if (rr) rr.paused = false // 恢复漂浮
      bubbleTimers.delete(balloon.key)
    }, BUBBLE_DURATION)
  )
}

// ---------- 交互：点赞 → 计数 +1，放烟花并立即放飞气球 ----------
async function onLike(balloon) {
  if (balloon.liked) return
  try {
    balloon.count = await likeMessage(balloon.msg.id)
    balloon.liked = true
    likedSet.add(balloon.msg.id)

    const r = runtime.get(balloon.key)
    if (!r?.el) return
    // 放烟花
    fireworks(r.x, r.y)
    // 立即放飞：取消暂停（若有展开的气泡），并加速向右上飞出视界
    if (r.paused) {
      r.paused = false
      balloon.showing = false
      clearTimeout(bubbleTimers.get(balloon.key))
      bubbleTimers.delete(balloon.key)
    }
    r.boost = 1 // tick 中按 boost 放大速度
  } catch (err) {
    console.warn('点赞失败', err)
  }
}

// ---------- 烟花（共享粒子系统：多个烟花并发互不干扰，粒子清空后自动停帧） ----------
let fxParticles = []
let fxRaf = 0
let fxLastT = 0

// 仅在画布尺寸变化时重置（避免每次点赞清掉正在播放的粒子）
function prepareFxCanvas() {
  const canvas = fxCanvasRef.value
  if (!canvas) return null
  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  return canvas.getContext('2d')
}

function fireworks(px, py) {
  const ctx = prepareFxCanvas()
  if (!ctx) return

  const colors = ['#ff5f6d', '#ffc371', '#5eead4', '#a78bfa', '#fbbf24', '#f472b6']
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 120 + Math.random() * 260
    fxParticles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.02,
      size: 2 + Math.random() * 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
    })
  }

  if (!fxRaf) {
    fxLastT = performance.now()
    fxRaf = requestAnimationFrame(fxDraw)
  }
}

function fxDraw(now) {
  const ctx = prepareFxCanvas()
  const dt = Math.min((now - fxLastT) / 1000, 0.05)
  fxLastT = now

  if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  for (let i = fxParticles.length - 1; i >= 0; i--) {
    const p = fxParticles[i]
    if (p.life <= 0) { fxParticles.splice(i, 1); continue }
    p.vy += 320 * dt // 简单重力
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= p.decay * dt * 60
    ctx.globalAlpha = Math.max(p.life, 0)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
    ctx.fill()
  }
  if (ctx) ctx.globalAlpha = 1

  if (fxParticles.length) {
    fxRaf = requestAnimationFrame(fxDraw)
  } else {
    fxRaf = 0
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  }
}

// ---------- 留言弹窗 ----------
const submitting = ref(false) // 提交防抖：连点不会重复放飞

function submitMessage() {
  if (submitting.value) return
  const content = draft.value.trim()
  if (!content) return
  submitting.value = true
  // 乐观释放：先放飞，失败再回滚
  const optimistic = { id: Date.now(), content, like_count: 0 }
  launch(optimistic, true) // force=true：特殊放飞，突破 10 上限，原气球不动
  modalOpen.value = false
  draft.value = ''

  // 彩蛋触发：刷新前发过留言（localStorage 标记），本次再发留言 → 彩蛋同时放飞
  // 触发后清除标记，想再看彩蛋需重新走"发留言 → 刷新 → 发留言"三步
  if (hadSentBefore) {
    hadSentBefore = false
    try {
      localStorage.removeItem(SENT_FLAG_KEY)
    } catch { /* ignore */ }
    launch(EASTER_EGG, true, true) // 彩蛋：闪电造型 + 紫蓝光晕
  }

  // 记录本次留言，供刷新后检测（三步流程的第一步）
  try {
    localStorage.setItem(SENT_FLAG_KEY, '1')
  } catch { /* ignore */ }

  createMessage(content)
    .then((saved) => {
      pool.value.unshift(saved) // 并入池中，下次补球可再抽到
      const b = balloons.value.find((x) => x.msg.id === optimistic.id)
      if (b) b.msg = saved // 换成数据层返回的真实记录
    })
    .catch((err) => {
      console.warn('留言发送失败', err)
      const b = balloons.value.find((x) => x.msg.id === optimistic.id)
      if (b) {
        const r = runtime.get(b.key)
        if (r) r.el?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' })
        setTimeout(() => {
          const idx = balloons.value.indexOf(b)
          if (idx >= 0) balloons.value.splice(idx, 1)
          runtime.delete(b.key)
        }, 420)
      }
    })
    .finally(() => { submitting.value = false })
}

// ---------- 白天/黑夜切换：黑夜隐藏并暂停，白天恢复 ----------
function syncDayMode() {
  const dark = document.documentElement.classList.contains('dark-mode')
  // 当前值与目标值不一致时才更新（避免无意义的重复 emit）
  if (dark !== !isDay.value) {
    isDay.value = !dark
    emit('day', isDay.value)
  }
}

// 暴露给父组件的打开弹窗方法（导航栏/页脚按钮调用）
function open() {
  modalOpen.value = true
}

defineExpose({ open })

// ---------- 生命周期 ----------
onMounted(async () => {
  syncDayMode()
  // 监听 html class 变化（吊灯破碎 → 黑夜）
  darkObserver = new MutationObserver(syncDayMode)
  darkObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  await loadMessages()
  // 初始放飞：填满到上限（留言不足则少放）
  while (balloons.value.length < MAX_ON_SCREEN) {
    const msg = pickFromPool()
    if (!msg) break
    launch(msg)
  }
  lastTime = performance.now()
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  if (fxRaf) cancelAnimationFrame(fxRaf)
  darkObserver?.disconnect()
  bubbleTimers.forEach((t) => clearTimeout(t))
  bubbleTimers.clear()
})
</script>

<style scoped>
/* ===== 气球场：覆盖全屏，不拦截鼠标（只有气球本体可点） ===== */
.balloon-field {
  position: fixed;
  inset: 0;
  z-index: 40;              /* 内容之上、导航栏(100)之下 */
  pointer-events: none;
  overflow: hidden;
}

/* ===== 单个气球（原 84×104 的 1/3） ===== */
.balloon {
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 34px;
  pointer-events: auto;
  cursor: pointer;
  will-change: transform;
}

/* 气球身体：椭圆 + 球面体积感
   三层渐变模拟真实气球：
   ① 左上主高光（拉丝光泽） ② 底部环境反射 ③ 主色球面渐变（顶部亮、底部深）
   --balloon-scale：非椭圆形状 1.3 倍视觉放大（见 .shape-* 定义） */
.balloon-body {
  position: absolute;
  inset: 0 3px 7px 3px;
  border-radius: 50% 50% 46% 46% / 55% 55% 45% 45%;
  background:
    radial-gradient(ellipse at 30% 22%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.3) 26%, rgba(255, 255, 255, 0) 46%),
    radial-gradient(ellipse at 68% 90%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 30%),
    radial-gradient(ellipse at 50% 40%, color-mix(in srgb, var(--balloon-color) 85%, white 15%) 0%, var(--balloon-color) 52%, color-mix(in srgb, var(--balloon-color) 70%, black 30%) 100%);
  /* clip-path 会裁掉 box-shadow，外阴影用 drop-shadow（跟随形状轮廓） */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.16));
  box-shadow: inset -2px -3px 5px rgba(0, 0, 0, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(var(--balloon-scale, 1));
  transition: transform 0.25s ease;
}

.balloon:hover .balloon-body {
  /* hover 放大在基础缩放之上叠加（非椭圆形状 hover 后为 1.3 × 1.06） */
  transform: scale(calc(var(--balloon-scale, 1) * 1.06));
}

/* ===== 气球形状变体 ===== */

/* ① 普通椭圆（默认） */
.shape-oval {
  border-radius: 50% 50% 46% 46% / 55% 55% 45% 45%;
}

/* ② 米老鼠：脸 + 两耳圆形并集（见模板 #clip-mickey），拼接处天然无缝圆润 */
.shape-mickey {
  --balloon-scale: 1.3; /* 非椭圆形状放大 1.3 倍，补偿视觉面积 */
  border-radius: 50%;
  clip-path: url(#clip-mickey);
}

/* ③ 五角星：曲线圆角（见模板 #clip-star） */
.shape-star {
  --balloon-scale: 1.3;
  border-radius: 0;
  clip-path: url(#clip-star);
}

/* ④ 带尾巴的三角形（风筝形）：顶部尖 + 两侧曲线 + 底部尾巴（见模板 #clip-triangle） */
.shape-triangle {
  --balloon-scale: 1.3;
  border-radius: 0;
  clip-path: url(#clip-triangle);
}

/* ⑤ 爱心：双圆弧顶部 + 底部尖（见模板 #clip-heart） */
.shape-heart {
  --balloon-scale: 1.3;
  border-radius: 0;
  clip-path: url(#clip-heart);
}

/* 隐藏的形状定义 SVG：不占位、不响应鼠标 */
.shape-clips {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}

/* ===== 彩蛋气球：闪电 SVG（保持原始形状） ===== */
.easter-svg {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 34px;
  height: 33px;
  transform: translate(-50%, -50%);
  overflow: visible;
  pointer-events: none;
}

/* ===== 新留言入场特效：火圈 + 火花 ===== */
/* 火圈：围绕气球的燃烧火焰环（conic-gradient 橙红黄火焰色带 + 旋转 + 脉动发光） */
.spawn-fire-ring {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 168%;
  height: 168%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 3;
  /* 火焰色带：8 段渐变色沿圆周分布，形成燃烧环 */
  background: conic-gradient(
    from 0deg,
    #ff4500 0deg,
    #ff8c00 22deg,
    #ffd700 45deg,
    #ff8c00 68deg,
    #ff4500 90deg,
    #ff8c00 112deg,
    #ffd700 135deg,
    #ff8c00 158deg,
    #ff4500 180deg,
    #ff8c00 202deg,
    #ffd700 225deg,
    #ff8c00 248deg,
    #ff4500 270deg,
    #ff8c00 292deg,
    #ffd700 315deg,
    #ff8c00 338deg,
    #ff4500 360deg
  );
  /* 中心挖空成环：内缘模糊模拟火焰边缘 */
  -webkit-mask: radial-gradient(circle, transparent 52%, #000 56% 78%, transparent 84%);
  mask: radial-gradient(circle, transparent 52%, #000 56% 78%, transparent 84%);
  filter: drop-shadow(0 0 10px rgba(255, 120, 30, 0.95));
  animation:
    fire-ring-spin 1.1s linear infinite,
    fire-ring-pulse 0.55s ease-in-out infinite alternate;
}

@keyframes fire-ring-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes fire-ring-pulse {
  from { opacity: 0.82; }
  to { opacity: 1; }
}

/* 火花：8 颗光点沿圆周均匀分布（--i: 1~8），从球心向外旋转散开 */
.spawn-spark {
  position: absolute;
  left: 50%;
  top: 46%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #ffe08a;
  box-shadow: 0 0 6px rgba(255, 224, 138, 0.95);
  animation: spawn-spark 1s ease-out forwards;
  pointer-events: none;
}

@keyframes spawn-spark {
  0% {
    opacity: 1;
    /* 起始聚集在球心（偏移 0），通过 rotate 让每颗从自己的角度出发 */
    transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translateY(0);
  }
  100% {
    opacity: 0;
    /* 先旋转定角，再沿自身方向飞出 → 环绕扩散 */
    transform: translate(-50%, -50%) rotate(calc(var(--i) * 45deg)) translateY(34px);
  }
}

/* 气球本体：新放飞时轻微弹性放大（配合特效更醒目） */
.balloon:has(.spawn-fire-ring) .balloon-body {
  animation: spawn-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes spawn-pop {
  0% {
    transform: scale(calc(var(--balloon-scale, 1) * 0.4));
  }
  60% {
    transform: scale(calc(var(--balloon-scale, 1) * 1.12));
  }
  100% {
    transform: scale(var(--balloon-scale, 1));
  }
}

/* 气球小结：双色三角立体感（亮面 + 暗面） */
.balloon-knot {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  border: 2.5px solid transparent;
  border-top: 4.5px solid var(--balloon-color);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.18));
}

.balloon-knot::after {
  content: '';
  position: absolute;
  left: 0.5px;
  top: -3.5px;
  border: 2px solid transparent;
  border-top: 3.5px solid rgba(255, 255, 255, 0.45);
}

/* 留言预览：气球上显示开头几个字（白色 + 轻投影，保证在彩色球面上可读） */
.balloon-preview {
  position: relative;
  z-index: 1;
  max-width: 70%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 7px;
  font-weight: 700;
  color: #fff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 3px rgba(0, 0, 0, 0.2);
  letter-spacing: 0.3px;
}

/* ===== 点赞标签：气球下端，左爱心 + 右数值 ===== */
.balloon-like {
  position: absolute;
  left: 50%;
  bottom: -2px;
  transform: translateX(-50%);
  z-index: 2;
  padding: 0 4px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  font-size: 7px;
  font-weight: 700;
  line-height: 1.6;
  color: #e5484d;
  white-space: nowrap;
  font-family: var(--mono);
}

/* ===== 绳子：锚点在气球底部，随摆角弯折，末端渐隐无端点 ===== */
.string {
  position: absolute;
  top: 34px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 46px;
  pointer-events: none;
  z-index: 1;
}

.string-line {
  fill: none;
  stroke-width: 1.3;
  stroke-linecap: round;
}

/* ===== 文本气泡：原地出现，正下方是点赞按钮 ===== */
.bubble {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 14px);
  transform: translateX(-50%);
  width: 210px;
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px 10px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  z-index: 60;
}

/* 气泡小尾巴（指向气球） */
.bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-top-color: #fff;
}

.bubble-text {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #222;
  word-break: break-word;
}

.like-btn {
  width: 100%;
  padding: 7px 0;
  border: none;
  border-radius: 999px;
  background: #ffe1e3;
  color: #e5484d;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.like-btn:hover:not(:disabled) {
  background: #ffcdd1;
  transform: translateY(-1px);
}

.like-btn.liked,
.like-btn:disabled {
  background: #f1f1f1;
  color: #999;
  cursor: default;
}

/* 气泡淡入淡出 */
.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px) scale(0.92);
}

/* ===== 烟花画布 ===== */
.fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 70;
}

/* ===== 留言弹窗 ===== */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 20, 35, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
}

.modal-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: #222;
}

.modal-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e5e4e7;
  border-radius: 10px;
  font: inherit;
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  min-height: 96px;
  color: #222;
  background: #fafaf8;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.modal-textarea:focus {
  border-color: var(--accent, #aa3bff);
  box-shadow: 0 0 0 3px rgba(170, 59, 255, 0.15);
}

.modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.modal-count {
  font-family: var(--mono);
  font-size: 12px;
  color: #999;
}

.modal-submit {
  padding: 9px 22px;
  border: none;
  border-radius: 999px;
  background: var(--accent, #aa3bff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-submit:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.modal-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 弹窗淡入淡出 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: translateY(16px) scale(0.96);
}
</style>
