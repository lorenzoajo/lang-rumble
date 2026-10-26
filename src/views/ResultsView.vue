<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useRoundStore } from '@/stores/round'

const rounds = useRoundStore()
const router = useRouter()
const { t } = useI18n()

const summary = computed(() => rounds.lastSummary)
const shownPoints = ref(0)
const ROLL_MS = 900

onMounted(() => {
  const s = summary.value
  if (!s) {
    void router.replace('/')
    return
  }
  const start = performance.now()
  const step = (now: number): void => {
    const k = Math.min(1, (now - start) / ROLL_MS)
    shownPoints.value = Math.round(s.score * (1 - (1 - k) ** 3))
    if (k < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
})
</script>

<template>
  <main v-if="summary" class="results">
    <h1 class="results__title">{{ t('results.title') }}</h1>

    <section class="card results__points">
      <span class="results__label">{{ t('results.points') }}</span>
      <span class="results__big">{{ shownPoints }}</span>
      <span class="results__streak">{{ t('results.bestStreak') }}: {{ summary.bestStreak }}</span>
    </section>

    <section class="card">
      <h2>{{ t('results.correct') }} · {{ summary.correct.length }}</h2>
      <p v-if="!summary.correct.length" class="muted">{{ t('results.none') }}</p>
      <ul class="chips">
        <li v-for="(w, i) in summary.correct" :key="`${w}-${i}`" class="chip chip--ok">{{ w }}</li>
      </ul>
    </section>

    <section v-if="summary.newlyMastered.length" class="card">
      <h2>{{ t('results.mastered') }} · {{ summary.newlyMastered.length }}</h2>
      <ul class="chips">
        <li v-for="w in summary.newlyMastered" :key="w" class="chip chip--star">★ {{ w }}</li>
      </ul>
    </section>

    <section class="card">
      <h2>{{ t('results.wrongReal') }} · {{ summary.wrongReal.length }}</h2>
      <p v-if="!summary.wrongReal.length" class="muted">{{ t('results.none') }}</p>
      <ul class="others">
        <li v-for="r in summary.wrongReal" :key="r.word">
          <strong>{{ r.word }}</strong>
          <span v-if="r.translations.length"> → {{ r.translations.join(', ') }}</span>
        </li>
      </ul>
    </section>

    <div class="results__actions">
      <RouterLink class="btn" :to="{ name: 'play', params: { mode: summary.mode } }">
        {{ t('results.playAgain') }}
      </RouterLink>
      <RouterLink class="btn btn--ghost" to="/">{{ t('results.menu') }}</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.results {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.results__title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--mode-1);
  animation: roll-in 600ms var(--ease-bounce) both;
}

.results h2 {
  font-size: 1rem;
  font-weight: 900;
  margin-bottom: var(--space-3);
}

.results__points {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.results__label {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.results__big {
  font-size: 4rem;
  font-weight: 900;
  color: var(--mode-3);
  font-variant-numeric: tabular-nums;
}

.results__streak {
  font-weight: 800;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chip {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  font-weight: 800;
}

.chip--ok {
  background: var(--ok-soft);
  color: var(--ok);
}

.chip--star {
  background: var(--mode-3);
  color: #fff;
}

.others {
  margin: 0;
  padding-left: var(--space-4);
  display: grid;
  gap: var(--space-1);
}

.results__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.results__actions .btn {
  display: grid;
  place-items: center;
  text-decoration: none;
}
</style>
