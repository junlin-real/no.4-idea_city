<script setup>
defineProps({
  title: String,
  description: String,
  tags: Array,
  accent: String,
  detail: String,
})
</script>

<template>
  <div class="flip-container">
    <div class="flip-inner">
      <!-- 正面 -->
      <div class="flip-front">
        <div class="card-cover" :style="{ background: accent + '15' }">
          <div class="card-icon" :style="{ background: accent }">
            {{ title[0] }}
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title">{{ title }}</h3>
          <p class="card-desc">{{ description }}</p>
          <div class="card-tags">
            <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
      <!-- 背面 -->
      <div class="flip-back">
        <div class="card-body">
          <h3 class="card-title">{{ title }}</h3>
          <div class="card-detail">{{ detail }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flip-container {
  perspective: 1000px;
  width: 220px;
  height: 300px;
  cursor: pointer;
  flex-shrink: 0;
}

.flip-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
}

.flip-front,
.flip-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: background-color 0.4s ease, border-color 0.4s ease;
}

.flip-back {
  transform: rotateY(180deg);
}

.card-cover {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 16px;
  margin: 0 0 6px;
  color: var(--text-h);
}

.card-desc {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  margin: 0 0 12px;
  flex: 1;
}

.card-tags {
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

.card-detail {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  white-space: pre-wrap;
  overflow-y: auto;
  flex: 1;
}
</style>
