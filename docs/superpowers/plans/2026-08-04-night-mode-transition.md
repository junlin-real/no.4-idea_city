# 四角灯泡渐进熄灯过渡黑夜模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"两灯泡全碎 → 硬切黑夜"改为四角灯泡逐个破碎、页面分区渐进变暗、平滑过渡到黑夜模式。

**Architecture:** 在 App.vue 内新增全屏 fixed 光照遮罩层（夜晚底色 + 4 个径向渐变光斑），用 computed 暗度模型（`max(自身暗度, 全局基线)`）驱动 CSS opacity transition；4 个角落各放一个现有 `Light` 组件，破碎后 emit 事件到 App.vue；四角全碎后沿用现有黑夜刀光加载动画流程。Light.vue 零改动，不新增任何文件。

**Tech Stack:** Vue 3 (`<script setup>` + reactive/computed)、Vite、CSS transition、现有 gsap 刀光加载动画。

## Global Constraints

- **不新增文件**：所有改动只在 `src/App.vue`（以及零改动的 `src/components/Light.vue`）。
- **不改变 Light.vue**：灯泡破碎交互（3 击破碎）、破碎动画、`emit('broken')` 全部保留。
- **不改变 loding.vue**：黑夜刀光加载动画本身及其 mode 切换逻辑保留。
- **黑夜最终色**：`linear-gradient(180deg, #0c0c1a 0%, #08081a 35%, #0a0a1e 60%, #050512 100%)`（与 loding.vue 第 148 行 night 背景一致）。
- **过渡时长**：遮罩所有 opacity 变化 `0.8s ease`。
- **提交规范**：中文短提交信息（参考仓库历史："动画优化"、"灯光优化"）。

---

### Task 1: App.vue 状态改造 —— 4 角布尔 + 暗度模型

**Files:**
- Modify: `src/App.vue:18-41`（script 中灯泡状态与破碎处理）

**Interfaces:**
- Consumes: 无（本任务为状态基础）
- Produces:
  - `const corners = reactive({ tl: false, tr: false, bl: false, br: false })`
  - `const brokenCount = computed(() => Object.values(corners).filter(Boolean).length)`
  - `const baseDark = computed(() => brokenCount.value / 4)`
  - `const dark = computed(() => ({ tl: corners.tl ? 1 : baseDark.value, tr: corners.tr ? 1 : baseDark.value, bl: corners.bl ? 1 : baseDark.value, br: corners.br ? 1 : baseDark.value }))`
  - `function onCornerBroken(corner) { corners[corner] = true; checkAllBroken() }`
  - `function checkAllBroken() { if (brokenCount.value === 4) { /* 触发黑夜流程 */ } }`

- [ ] **Step 1: 替换现有灯泡状态与处理函数**

将 `src/App.vue` 第 18-41 行的以下代码：

```js
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
```

替换为：

```js
import { ref, reactive, computed } from 'vue'
// ...原有 imports 保持，仅将第一行 import 展开为包含 computed、reactive

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
```

注意：`App.vue` 第 1 行 `import { ref } from 'vue'` 需改为 `import { ref, reactive, computed } from 'vue'`。

- [ ] **Step 2: 更新 onTransitionDone 与 onSwitchToLight**

将现有（第 43-55 行）：

```js
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
```

替换为：

```js
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
```

- [ ] **Step 3: 语法验证**

Run: `npm run build`
Expected: 构建成功，无编译错误。若有未使用变量警告（如 `leftBroken` 已被删除），确认无残留引用。

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "状态改造：四角灯泡与暗度模型"
```

---

### Task 2: 模板与样式 —— 4 灯泡四角定位 + 光照遮罩层

**Files:**
- Modify: `src/App.vue:79-87`（灯泡层模板）、`src/App.vue:179-201`（灯泡层样式）

**Interfaces:**
- Consumes: Task 1 的 `corners`、`onCornerBroken`、`baseDark`、`dark`、`maskVisible`
- Produces: 模板中的 `.bulb-tl/.bulb-tr/.bulb-bl/.bulb-br` 四角容器与 `.light-mask` 遮罩（含 `.night-base` 与 4 个 `.spot`）

- [ ] **Step 1: 替换灯泡层模板**

将现有（第 80-87 行）：

```html
<div class="bulb-layer">
  <div class="bulb-left">
    <Light :key="'left-' + bulbKey" @broken="onLeftBroken" />
  </div>
  <div class="bulb-right">
    <Light :key="'right-' + bulbKey" @broken="onRightBroken" />
  </div>
</div>
```

替换为：

```html
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
```

- [ ] **Step 2: 替换灯泡层样式并新增遮罩样式**

将现有（第 178-201 行）：

```css
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
```

替换为：

```css
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
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功，无编译错误。

- [ ] **Step 4: 手动验证渐进变暗**

Run: `npm run dev`，浏览器打开站点，依次点击 4 个灯泡（每角 3 次）：
- 碎第 1 个：该角象限逐渐变暗（0.8s 过渡），页面其余部分微微变暗
- 碎第 2 个：第二角变暗，已暗的第一角进一步变暗（全局基线 0.5）
- 碎第 3 个：三角变暗，全屏接近夜晚色
- 碎第 4 个：全屏黑夜色

Expected: 变暗平滑、区域呈"从角落向外熄灭"的柔和过渡、亮区呈暖黄光斑。

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "遮罩层：四角光源与渐进变暗"
```

---

### Task 3: 黑夜收尾流程验证与切回白天回归

**Files:**
- Modify: 无（验证 Task 1-2 产出的完整流程；若发现缺陷则修复 `src/App.vue`）

**Interfaces:**
- Consumes: Task 1 的 `checkAllBroken` / `onTransitionDone` / `onSwitchToLight`、Task 2 的遮罩层
- Produces: 完整可用的黑夜切换与切回白天闭环

- [ ] **Step 1: 验证四角全碎后进入黑夜**

Run: `npm run dev`，碎完 4 个灯泡。
Expected:
- 遮罩全屏黑夜色
- 游戏隐藏（`gameVisible = false`）
- 播放黑夜刀光加载动画（loding night 模式）
- 动画播完后进入完整黑夜模式（dark-mode 类生效、文字/导航变暗色）、遮罩隐藏（maskVisible = false）

- [ ] **Step 2: 验证切回白天**

在黑夜模式下，点击 Dark_more 的月亮 3 次。
Expected:
- `switchToLight` 触发：4 个灯泡重置并重新出现（bulbKey++ 重建）
- 遮罩重新显示且暗度归零（页面恢复白天）
- 游戏恢复显示
- 再次碎 4 个灯泡，流程可重复

- [ ] **Step 3: 边界情况回归**

- 灯泡破碎动画进行中再次点击 → 无反应（Light.vue 现有防抖）
- 遮罩过渡中途再碎另一个灯泡 → 过渡自动衔接、无跳变
- 窗口缩放（含移动端宽度）→ 光斑与灯泡定位正常、无错位
- 若发现导航栏（z-index 100）未随遮罩变暗属预期行为（导航始终可见），如用户不满意可在本任务调整遮罩 z-index 至 100 以上

- [ ] **Step 4: 若有缺陷修复并提交**

```bash
git add src/App.vue
git commit -m "修复：黑夜切换闭环问题"
```

（若 Step 1-3 全部通过，跳过本步，直接进入下一步。）

- [ ] **Step 5: 最终构建确认**

Run: `npm run build`
Expected: 构建成功。交付完成。
