<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{ remainingMs: number; score: number; streak: number }>()
const { t } = useI18n()

const LOW_MS = 10_000
const TWEEN_MS = 400

const time = computed(() => {
  const s = Math.ceil(props.remainingMs / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

// Score rolls up like a slot-machine counter.
const shown = ref(props.score)
const bumping = ref(false)
let frame = 0
watch(
  () => props.score,
  (to, from) => {
    cancelAnimationFrame(frame)
    const start = performance.now()
    bumping.value = true
    const step = (now: number): void => {
      const k = Math.min(1, (now - start) / TWEEN_MS)
      shown.value = Math.round(from + (to - from) * k)
      if (k < 1) frame = requestAnimationFrame(step)
      else bumping.value = false
    }
    frame = requestAnimationFrame(step)
  },
)
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="hud">
    <div class="hud__cell">
      <span class="hud__label">{{ t('round.time') }}</span>
      <span
        data-test="timer"
        class="hud__value hud__timer"
        :class="{ 'is-low': remainingMs < LOW_MS }"
        >{{ time }}</span
      >
    </div>
    <div class="hud__cell hud__cell--center">
      <span v-if="streak > 1" class="hud__streak">{{ t('round.streak', { n: streak }) }}</span>
    </div>
    <div class="hud__cell hud__cell--end">
      <span class="hud__label">{{ t('round.score') }}</span>
      <span class="hud__value" :class="{ 'is-bumping': bumping }">{{ shown }}</span>
    </div>
  </div>
</template>

<style scoped>
.hud {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-3);
}

.hud__cell {
  display: flex;
  flex-direction: column;
}

.hud__cell--center {
  align-items: center;
}

.hud__cell--end {
  align-items: flex-end;
}

.hud__label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hud__value {
  font-size: 1.9rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.hud__value.is-bumping {
  animation: bump 300ms var(--ease-bounce);
  color: var(--mode-3);
}

.hud__timer.is-low {
  color: var(--bad);
  animation: pulse 1s infinite;
}

.hud__streak {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--mode-1);
  color: #fff;
  font-weight: 900;
  animation: bump 300ms var(--ease-bounce);
}
</style>
