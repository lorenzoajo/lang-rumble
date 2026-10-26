<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadManifest } from '@/data/loader'
import { isMastered } from '@/domain/repetition'
import { pairKey, type Manifest } from '@/domain/types'
import { langName, useI18n } from '@/i18n'
import { FLAGS } from '@/lib/flags'
import { useAppStore } from '@/stores/app'
import BackLink from '@/components/BackLink.vue'

const REVIEW_LIMIT = 20

const app = useAppStore()
const { t, lang } = useI18n()
const manifest = ref<Manifest | null>(null)

onMounted(async () => {
  try {
    manifest.value = await loadManifest()
  } catch {
    manifest.value = null
  }
})

const rows = computed(() =>
  app.state.settings.targets.map((target) => {
    const key = pairKey(app.state.settings.base, target)
    const p = app.state.progress[key]
    const words = Object.entries(p?.words ?? {})
    const review = words
      .filter(([, d]) => [d.production, d.recognition].some((s) => s && s.box === 0 && s.seen > 0))
      .sort(([, a], [, b]) => lastSeen(b) - lastSeen(a))
      .slice(0, REVIEW_LIMIT)
      .map(([id]) => id)
    return {
      target,
      total: manifest.value?.pairs[key]?.words ?? 0,
      seen: words.length,
      mastered: words.filter(([, d]) => isMastered(d.production) && isMastered(d.recognition))
        .length,
      points: p?.points ?? 0,
      bestStreak: p?.bestStreak ?? 0,
      rounds: p?.rounds ?? 0,
      review,
    }
  }),
)

function lastSeen(d: {
  production?: { lastSeen: number }
  recognition?: { lastSeen: number }
}): number {
  return Math.max(d.production?.lastSeen ?? 0, d.recognition?.lastSeen ?? 0)
}
</script>

<template>
  <main class="progress">
    <header class="page-header">
      <BackLink />
      <h1>{{ t('progress.title') }}</h1>
    </header>

    <p v-if="!rows.some((r) => r.rounds)" class="card muted">{{ t('progress.empty') }}</p>

    <section v-for="r in rows" :key="r.target" class="card lang">
      <h2>{{ FLAGS[r.target] }} {{ langName(r.target, lang) }}</h2>
      <div class="bar" role="progressbar" :aria-valuenow="r.mastered" :aria-valuemax="r.total">
        <span class="bar__seen" :style="{ width: `${r.total ? (r.seen / r.total) * 100 : 0}%` }" />
        <span
          class="bar__mastered"
          :style="{ width: `${r.total ? (r.mastered / r.total) * 100 : 0}%` }"
        />
      </div>
      <dl class="stats">
        <div>
          <dt>{{ t('progress.mastered') }}</dt>
          <dd>{{ r.mastered }}</dd>
        </div>
        <div>
          <dt>{{ t('progress.seen') }}</dt>
          <dd>{{ r.seen }}</dd>
        </div>
        <div>
          <dt>{{ t('progress.total') }}</dt>
          <dd>{{ r.total }}</dd>
        </div>
        <div>
          <dt>{{ t('progress.points') }}</dt>
          <dd>{{ r.points }}</dd>
        </div>
        <div>
          <dt>{{ t('progress.bestStreak') }}</dt>
          <dd>{{ r.bestStreak }}</dd>
        </div>
        <div>
          <dt>{{ t('progress.rounds') }}</dt>
          <dd>{{ r.rounds }}</dd>
        </div>
      </dl>
      <template v-if="r.review.length">
        <h3>{{ t('progress.review') }}</h3>
        <ul class="review">
          <li v-for="w in r.review" :key="w">{{ w }}</li>
        </ul>
      </template>
    </section>
  </main>
</template>

<style scoped>
.progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.lang h2 {
  font-size: 1.3rem;
  font-weight: 900;
}

.lang h3 {
  font-size: 0.95rem;
  font-weight: 900;
  margin-top: var(--space-4);
}

.bar {
  position: relative;
  height: 14px;
  margin: var(--space-3) 0;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
}

.bar__seen {
  background: color-mix(in srgb, var(--mode-2) 45%, transparent);
}

.bar__mastered {
  background: var(--mode-4);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin: 0;
}

.stats dt {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stats dd {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 900;
}

.review {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.review li {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--bad-soft);
  color: var(--bad);
  font-weight: 800;
}
</style>
