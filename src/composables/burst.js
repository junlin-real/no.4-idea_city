// 通用碎片生成：灯泡/月亮破碎特效共用（PendantLight / DarkMore）
// 返回碎片数组，每个碎片由 CSS 变量驱动动画（--tx/--ty/--rot/--size/--delay/--color）
export function makeFragments({
  count = 10,
  distMin = 40,
  distMax = 110,
  sizeMin = 4,
  sizeMax = 12,
  colors = ['#FFD43B', '#E6A800', '#FFE066', '#FFF', '#B0B0B0'],
} = {}) {
  const fragments = []
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i + (Math.random() * 30 - 15)
    const dist = distMin + Math.random() * (distMax - distMin)
    const rad = (angle * Math.PI) / 180
    const tx = Math.cos(rad) * dist
    const ty = Math.sin(rad) * dist
    const rot = Math.random() * 720 - 360
    const size = sizeMin + Math.random() * (sizeMax - sizeMin)
    const delay = Math.random() * 80
    const color = colors[Math.floor(Math.random() * colors.length)]
    fragments.push({ tx, ty, rot, size, delay, color, id: i })
  }
  return fragments
}
