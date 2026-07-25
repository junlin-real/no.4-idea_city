<template>
  <!-- 召唤按钮（仅白天模式） -->
  <button v-if="!isDark" class="drone-summon-btn" @click="summonDrone">
    🛸 小游戏
  </button>

  <!-- 拍照闪光遮罩 -->
  <Transition name="flash">
    <div v-if="showFlash" class="flash-overlay" />
  </Transition>

  <Teleport to="body">
    <!-- 无人机（仅白天模式） -->
    <template v-if="!isDark">
      <div
        v-for="d in drones"
        :key="d.id"
        class="drone"
        :class="{ falling: d.falling }"
        :style="droneStyle(d)"
        @mousedown.prevent="onDroneMouseDown($event, d)"
      >
        <div class="drone-body" :class="{ broken: d.falling }">
          <div class="drone-top" />
          <div class="drone-center" />
          <div class="drone-leg l1" /><div class="drone-leg l2" />
          <div class="drone-leg l3" /><div class="drone-leg l4" />
          <div class="drone-cam" />
        </div>
      </div>
    </template>

    <!-- 大炮（召唤后出现，仅白天模式） -->
    <template v-if="cannonVisible && !isDark">
      <div class="cannon" :class="{ firing: throwing }" :style="cannonStyle">
        <div class="cannon-wheel left" />
        <div class="cannon-wheel right" />
        <div class="cannon-body">
          <div class="cannon-barrel" :style="barrelStyle" />
          <div class="cannon-muzzle" :style="muzzleStyle" />
          <div class="cannon-ring" />
        </div>
        <!-- 炮口闪光 -->
        <div v-if="muzzleFlash" class="muzzle-flash" :style="muzzleFlashStyle" />
      </div>

      <!-- 大炮交互区域 -->
      <div class="cannon-hitarea" @mousedown.prevent="onCannonGrab" />

      <!-- 瞄准线 -->
      <svg v-if="throwing" class="aim-line">
        <defs>
          <marker id="aimDot" markerWidth="6" markerHeight="6" refX="3" refY="3">
            <circle cx="3" cy="3" r="2.5" :fill="aimColor" />
          </marker>
        </defs>
        <line
          :x1="cannonMouth.x" :y1="cannonMouth.y"
          :x2="aimEnd.x" :y2="aimEnd.y"
          :stroke="aimColor" stroke-width="2.5" stroke-dasharray="8 5"
          marker-end="url(#aimDot)" opacity="0.8"
        />
        <!-- 力度指示圆环 -->
        <circle
          :cx="cannonMouth.x" :cy="cannonMouth.y"
          :r="pullPower * 0.6 + 10"
          fill="none" :stroke="aimColor" stroke-width="1.5"
          stroke-dasharray="4 3" opacity="0.4"
        />
      </svg>

      <!-- 飞行中的石头 -->
      <div
        v-for="s in flyingStones"
        :key="s.id"
        class="flying-stone"
        :style="{ left: s.x + 'px', top: s.y + 'px' }"
      />
    </template>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import Matter from 'matter-js'

const { Engine, Bodies, Body, Events, Composite } = Matter

// ==================== 物理引擎 ====================
let engine = null
let animFrame = null
let groundBody = null

// ==================== 暗黑模式检测 ====================
const isDark = ref(false)
const cannonVisible = ref(false) // 大炮是否已召唤

function checkDark() {
  isDark.value = document.documentElement.classList.contains('dark-mode')
}

// ==================== 无人机列表 ====================
const drones = reactive([])
let droneIdCounter = 0
let droneBodies = new Map()

// ==================== 自主移动 ====================
const DRONE_SPEED = 1.5
const DRONE_FRICTION = 0.993

function updateDroneMovement() {
  for (const d of drones) {
    if (d.falling || d.grabbing) continue
    if (d.vx === undefined) {
      d.vx = (Math.random() - 0.5) * 6
      d.moveTimer = 0
      d.dir = Math.random() > 0.5 ? 1 : -1
    }
    // 定时换方向
    d.moveTimer--
    if (d.moveTimer <= 0) {
      d.dir = -d.dir
      d.moveTimer = 150 + Math.random() * 200
    }
    // 持续加速
    d.vx += d.dir * DRONE_SPEED * 0.05
    d.vx *= DRONE_FRICTION
    d.vx = Math.max(-DRONE_SPEED, Math.min(DRONE_SPEED, d.vx))
    // 边界反弹
    if (d.x <= 30) { d.x = 30; d.dir = 1; d.moveTimer = 100 + Math.random() * 100 }
    if (d.x >= window.innerWidth - 30) { d.x = window.innerWidth - 30; d.dir = -1; d.moveTimer = 100 + Math.random() * 100 }
    d.x += d.vx
    const body = droneBodies.get(d.id)
    if (body) Body.setPosition(body, { x: d.x, y: d.y })
  }
}

// ==================== 拍照闪光 ====================
const showFlash = ref(false)

function takePhoto(d) {
  if (d.falling) return
  showFlash.value = true
  setTimeout(() => { showFlash.value = false }, 150)
  d.flash = true
  setTimeout(() => { d.flash = false }, 300)
}

// ==================== 召唤无人机 ====================
function summonDrone() {
  cannonVisible.value = true

  const vw = window.innerWidth
  const vh = window.innerHeight
  const id = droneIdCounter++

  const d = reactive({
    id,
    x: vw / 2 + (Math.random() - 0.5) * 300,
    y: vh * 0.25 + (Math.random() - 0.5) * 100,
    grabbing: false,
    grabOffsetX: 0,
    grabOffsetY: 0,
    flash: false,
    falling: false,
    fallY: 0,
    fallVy: 0,
    fallRotation: 0,
    fallRotationSpeed: 0,
  })

  drones.push(d)

  const body = Bodies.circle(d.x, d.y, 30, {
    isStatic: true,
    restitution: 0.3,
    label: 'drone',
    collisionFilter: { category: 0x0002, mask: 0x0001 },
  })
  Composite.add(engine.world, body)
  droneBodies.set(id, body)
}

function droneStyle(d) {
  if (d.falling) {
    return {
      left: d.x + 'px',
      top: d.fallY + 'px',
      opacity: Math.max(0, 1 - (d.fallY - d.y) / window.innerHeight),
      transform: `rotate(${d.fallRotation}deg)`,
    }
  }
  return {
    left: d.x + 'px',
    top: d.y + 'px',
  }
}

// ==================== 无人机拖拽 ====================
let droneMouseDownPos = null
let droneMouseDownTime = 0

function onDroneMouseDown(e, d) {
  if (d.falling) return
  droneMouseDownPos = { x: e.clientX, y: e.clientY }
  droneMouseDownTime = Date.now()
  d.grabbing = true
  d.grabOffsetX = e.clientX - d.x
  d.grabOffsetY = e.clientY - d.y
}

function moveDrone(e) {
  for (const d of drones) {
    if (!d.grabbing || d.falling) continue
    d.x = e.clientX - d.grabOffsetX
    d.y = e.clientY - d.grabOffsetY
    const body = droneBodies.get(d.id)
    if (body) Body.setPosition(body, { x: d.x, y: d.y })
  }
}

function releaseDrone() {
  for (const d of drones) {
    if (d.grabbing) {
      // 判断是否为点击（未移动且时间短）
      if (droneMouseDownPos) {
        const dx = d.x - (droneMouseDownPos.x - d.grabOffsetX)
        const dy = d.y - (droneMouseDownPos.y - d.grabOffsetY)
        const dist = Math.sqrt(dx * dx + dy * dy)
        const elapsed = Date.now() - droneMouseDownTime
        if (dist < 5 && elapsed < 300) {
          takePhoto(d)
        }
      }
      d.grabbing = false
    }
  }
  droneMouseDownPos = null
}

// ==================== 大炮 ====================
const throwing = ref(false)
const pullPos = reactive({ x: 0, y: 0 })
const cannonPos = reactive({ x: 0, y: 0 })
const cannonMouth = reactive({ x: 0, y: 0 })
const pullPower = ref(0)
const pullAngle = ref(0) // 弧度
const muzzleFlash = ref(false)

const aimColor = computed(() => {
  const p = pullPower.value
  if (p < 30) return '#4fc3f7'
  if (p < 60) return '#ffb74d'
  if (p < 80) return '#ff8a65'
  return '#ff5252'
})

const aimEnd = computed(() => {
  return {
    x: cannonMouth.x + Math.cos(pullAngle.value) * pullPower.value * 3,
    y: cannonMouth.y + Math.sin(pullAngle.value) * pullPower.value * 3,
  }
})

const cannonStyle = computed(() => ({
  left: cannonPos.x + 'px',
  top: cannonPos.y + 'px',
}))

const barrelAngle = computed(() => {
  // 炮管默认朝上（0rad），跟随拉动方向旋转
  // pullAngle: 向右=0, 向上=-PI/2, 向左=±PI
  // 需要偏移让默认朝上时 angle=0
  return pullAngle.value + Math.PI / 2
})

const barrelStyle = computed(() => ({
  transform: `rotate(${barrelAngle.value}rad)`,
}))

const muzzleStyle = computed(() => ({
  transform: `rotate(${barrelAngle.value}rad)`,
}))

const muzzleFlashStyle = computed(() => ({
  left: cannonMouth.x + 'px',
  top: cannonMouth.y + 'px',
}))

function updateCannonPos() {
  cannonPos.x = window.innerWidth / 2
  cannonPos.y = window.innerHeight - 30
  // 炮口在大炮顶部偏上
  cannonMouth.x = cannonPos.x
  cannonMouth.y = cannonPos.y - 58
}

function onCannonGrab(e) {
  updateCannonPos()
  throwing.value = true
  pullPos.x = e.clientX
  pullPos.y = e.clientY
  updatePull()
}

function updatePull() {
  const dx = pullPos.x - cannonMouth.x
  const dy = pullPos.y - cannonMouth.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  pullPower.value = Math.min(100, dist * 0.5)
  pullAngle.value = Math.atan2(dy, dx)
}

function moveCannon(e) {
  if (!throwing.value) return
  pullPos.x = e.clientX
  pullPos.y = e.clientY
  updatePull()
}

function releaseCannon() {
  if (!throwing.value) return
  throwing.value = false

  const power = pullPower.value
  pullPower.value = 0

  if (power < 8) return

  // 发射方向 = 拉动方向（同向）
  const angle = pullAngle.value
  const speed = power * 0.22

  // 炮口闪光
  muzzleFlash.value = true
  setTimeout(() => { muzzleFlash.value = false }, 200)

  // 生成石头
  const stone = reactive({
    id: Date.now(),
    x: cannonMouth.x,
    y: cannonMouth.y,
  })
  flyingStones.push(stone)

  const body = Bodies.circle(stone.x, stone.y, 8, {
    isStatic: false,
    restitution: 0.4,
    friction: 0.3,
    label: 'stone',
    collisionFilter: { category: 0x0001, mask: 0x0002 },
  })
  Body.setVelocity(body, {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
  })
  Composite.add(engine.world, body)
  flyingStoneBodies.set(stone.id, body)
}

// ==================== 飞行石头 ====================
const flyingStones = reactive([])
const flyingStoneBodies = new Map()

// ==================== 碰撞检测 ====================
function setupCollision() {
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA
      const b = pair.bodyB

      let droneBody = null
      if (a.label === 'drone' && b.label === 'stone') droneBody = a
      else if (a.label === 'stone' && b.label === 'drone') droneBody = b

      if (!droneBody) continue

      for (const d of drones) {
        if (droneBodies.get(d.id) === droneBody && !d.falling) {
          startDroneFall(d)
          break
        }
      }
    }
  })
}

// ==================== 无人机掉落 ====================
function startDroneFall(d) {
  d.falling = true
  d.fallY = d.y
  d.fallVy = 0
  d.fallRotation = 0
  d.fallRotationSpeed = (Math.random() - 0.5) * 12

  const body = droneBodies.get(d.id)
  if (body) {
    Composite.remove(engine.world, body)
    droneBodies.delete(d.id)
  }

  setTimeout(() => {
    const idx = drones.indexOf(d)
    if (idx !== -1) drones.splice(idx, 1)
  }, 5000)
}

function updateDroneFalls() {
  for (const d of drones) {
    if (!d.falling) continue
    d.fallVy += 0.4
    d.fallY += d.fallVy
    d.fallRotation += d.fallRotationSpeed
  }
}

// ==================== 物理循环 ====================
function physicsLoop() {
  if (engine) Engine.update(engine, 1000 / 60)

  for (const s of flyingStones) {
    const body = flyingStoneBodies.get(s.id)
    if (body) {
      s.x = body.position.x
      s.y = body.position.y
      if (s.y > window.innerHeight + 50 || s.x < -50 || s.x > window.innerWidth + 50 || s.y < -50) {
        Composite.remove(engine.world, body)
        flyingStoneBodies.delete(s.id)
        const idx = flyingStones.indexOf(s)
        if (idx !== -1) flyingStones.splice(idx, 1)
      }
    }
  }

  updateDroneMovement()
  updateDroneFalls()
  animFrame = requestAnimationFrame(physicsLoop)
}

// ==================== 全局鼠标事件 ====================
function onMouseMove(e) {
  moveDrone(e)
  moveCannon(e)
}

function onMouseUp(e) {
  releaseDrone()
  releaseCannon()
}

// ==================== 生命周期 ====================
let darkObserver = null

onMounted(() => {
  engine = Engine.create({ gravity: { x: 0, y: 1 } })

  groundBody = Bodies.rectangle(
    window.innerWidth / 2, window.innerHeight + 25,
    window.innerWidth * 2, 50,
    { isStatic: true, label: 'ground' }
  )
  Composite.add(engine.world, [groundBody])

  checkDark()
  darkObserver = new MutationObserver(checkDark)
  darkObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  setupCollision()
  updateCannonPos()
  physicsLoop()

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('resize', updateCannonPos)
})

onUnmounted(() => {
  cancelAnimationFrame(animFrame)
  if (darkObserver) darkObserver.disconnect()
  if (engine) Engine.clear(engine)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('resize', updateCannonPos)
})
</script>

<style scoped>
/* ===== 召唤按钮 ===== */
.drone-summon-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1100;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}
.drone-summon-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

/* ===== 闪光遮罩 ===== */
.flash-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(255, 255, 255, 0.85);
  pointer-events: none;
}
.flash-enter-active, .flash-leave-active { transition: opacity 0.15s; }
.flash-enter-from, .flash-leave-to { opacity: 0; }

/* ===== 无人机 ===== */
.drone {
  position: fixed;
  z-index: 1050;
  width: 60px;
  height: 60px;
  margin-left: -30px;
  margin-top: -30px;
  cursor: grab;
  user-select: none;
  will-change: transform, left, top;
}
.drone:active { cursor: grabbing; }

.drone-body {
  position: relative;
  width: 100%;
  height: 100%;
  animation: hover 2s ease-in-out infinite;
}
.drone-body.broken { animation: spin-fall 0.4s linear infinite; }

.drone-center {
  position: absolute;
  top: 50%; left: 50%;
  width: 28px; height: 14px;
  margin: -7px 0 0 -14px;
  background: linear-gradient(180deg, #555, #333);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.drone-top {
  position: absolute;
  top: 38%; left: 50%;
  width: 10px; height: 6px;
  margin: -3px 0 0 -5px;
  background: #ff4444;
  border-radius: 50%;
  box-shadow: 0 0 6px #ff4444;
  animation: blink 1s ease-in-out infinite;
}

.drone-leg {
  position: absolute;
  width: 3px; height: 16px;
  background: #666;
  border-radius: 2px;
}
.drone-leg.l1 { top: 50%; left: 12px; transform: rotate(-20deg); }
.drone-leg.l2 { top: 50%; right: 12px; transform: rotate(20deg); }
.drone-leg.l3 { top: 50%; left: 12px; transform: rotate(20deg); }
.drone-leg.l4 { top: 50%; right: 12px; transform: rotate(-20deg); }

.drone-leg::after {
  content: '';
  position: absolute;
  bottom: -4px; left: 50%;
  width: 12px; height: 4px;
  margin-left: -6px;
  background: rgba(100, 200, 255, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(100, 200, 255, 0.5);
  animation: prop-spin 0.3s linear infinite;
}

.drone-cam {
  position: absolute;
  bottom: 8px; left: 50%;
  width: 8px; height: 6px;
  margin-left: -4px;
  background: #222;
  border-radius: 2px;
  border: 1px solid #555;
}
.drone-cam::after {
  content: '';
  position: absolute;
  top: 1px; left: 50%;
  width: 3px; height: 3px;
  margin-left: -1.5px;
  background: #4fc3f7;
  border-radius: 50%;
  box-shadow: 0 0 4px #4fc3f7;
}

@keyframes hover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes prop-spin {
  from { transform: scaleX(1); }
  50% { transform: scaleX(0.3); }
  to { transform: scaleX(1); }
}
@keyframes spin-fall {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== 大炮 ===== */
.cannon {
  position: fixed;
  z-index: 1090;
  pointer-events: none;
}

.cannon-body {
  position: relative;
  width: 56px;
  height: 32px;
  margin-left: -28px;
  margin-top: -32px;
  background: linear-gradient(180deg, #5d6d7e, #34495e, #2c3e50);
  border-radius: 8px 8px 4px 4px;
  box-shadow:
    inset 0 2px 4px rgba(255,255,255,0.15),
    0 3px 10px rgba(0,0,0,0.4);
}

.cannon-ring {
  position: absolute;
  top: -4px;
  left: 50%;
  width: 60px;
  height: 7px;
  margin-left: -30px;
  background: linear-gradient(180deg, #7f8c8d, #5d6d7e);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.cannon-barrel {
  position: absolute;
  top: 0;
  left: 50%;
  width: 16px;
  height: 32px;
  margin-left: -8px;
  margin-top: -28px;
  background: linear-gradient(90deg, #4a5568, #6b7d8e, #4a5568);
  border-radius: 4px 4px 2px 2px;
  transform-origin: 8px 28px;
  box-shadow:
    inset 2px 0 3px rgba(0,0,0,0.2),
    inset -2px 0 3px rgba(0,0,0,0.2),
    0 -2px 4px rgba(0,0,0,0.2);
}

.cannon-muzzle {
  position: absolute;
  top: 0;
  left: 50%;
  width: 20px;
  height: 8px;
  margin-left: -10px;
  margin-top: -34px;
  background: linear-gradient(90deg, #3d4f5f, #6b7d8e, #3d4f5f);
  border-radius: 3px 3px 0 0;
  transform-origin: 10px 34px;
  box-shadow: 0 -1px 3px rgba(0,0,0,0.3);
}

.cannon-muzzle::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 50%;
  width: 10px;
  height: 5px;
  margin-left: -5px;
  background: #1a1a2e;
  border-radius: 2px;
}

.cannon-wheel {
  position: absolute;
  bottom: -8px;
  width: 22px;
  height: 22px;
  background: radial-gradient(circle at 40% 40%, #6d5c4a, #4a3c2e, #2e2418);
  border-radius: 50%;
  border: 2px solid #3e3226;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
}
.cannon-wheel::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 6px; height: 6px;
  margin: -3px 0 0 -3px;
  background: #8d7b6a;
  border-radius: 50%;
}
.cannon-wheel.left { left: -18px; }
.cannon-wheel.right { right: -18px; }

.cannon.firing .cannon-body {
  animation: recoil 0.15s ease-out;
}

@keyframes recoil {
  0% { transform: translateY(0); }
  30% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}

.muzzle-flash {
  position: fixed;
  z-index: 1092;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,200,50,0.9), rgba(255,100,20,0.6), transparent 70%);
  animation: flash-pop 0.2s ease-out forwards;
}

@keyframes flash-pop {
  0% { transform: scale(0.3); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(0.1); opacity: 0; }
}

.cannon-hitarea {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1095;
  width: 120px;
  height: 100px;
  cursor: crosshair;
}

/* ===== 瞄准线 ===== */
.aim-line {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
  width: 100vw;
  height: 100vh;
}

/* ===== 飞行石头 ===== */
.flying-stone {
  position: fixed;
  z-index: 1060;
  width: 14px;
  height: 12px;
  margin: -6px 0 0 -7px;
  background: linear-gradient(135deg, #8d6e4a, #6b5239);
  border-radius: 40% 50% 45% 55%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  pointer-events: none;
  animation: spin-stone 0.3s linear infinite;
}

@keyframes spin-stone {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
