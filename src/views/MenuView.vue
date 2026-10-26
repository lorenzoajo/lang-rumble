<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { availableModes, loadManifest } from '@/data/loader'
import { MODES, type Manifest, type Mode } from '@/domain/types'
import { langName, useI18n } from '@/i18n'
import { FLAGS } from '@/lib/flags'
import { sfx } from '@/lib/sfx'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { t, lang } = useI18n()

const manifest = ref<Manifest | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    manifest.value = await loadManifest()
  } catch {
    failed.value = true
  }
})

const target = computed(() => app.state.settings.activeTarget)
const names = computed(() => ({
  base: langName(lang.value, lang.value),
  target: target.value ? langName(target.value, lang.value) : '',
}))
const available = computed<Mode[]>(() =>
  manifest.value && app.activePair ? availableModes(manifest.value, app.activePair) : [],
)

function play(mode: Mode): void {
  sfx.play('tap')
  void router.push({ name: 'play', params: { mode } })
}
</script>

<template>
  <main class="menu">
    <header class="menu__header">
      <h1 class="menu__title">
        <span v-for="(ch, i) in t('app.title')" :key="i" :style="{ '--i': i }">{{ ch }}</span>
      </h1>
      <p class="muted">{{ t('app.tagline') }}</p>
      <RouterLink v-if="target" to="/settings" class="menu__pair">
        {{ FLAGS[lang] }} {{ t('menu.pair', names) }} {{ FLAGS[target] }}
      </RouterLink>
    </header>

    <p v-if="failed" class="menu__error card">{{ t('menu.noData') }}</p>

    <div class="menu__modes">
      <button
        v-for="(mode, i) in MODES"
        :key="mode"
        data-test="mode"
        type="button"
        class="mode"
        :style="{ '--mode': `var(--mode-${i + 1})`, '--i': i }"
        :disabled="!available.includes(mode)"
        @click="play(mode)"
      >
        <span class="mode__title">{{ t(`menu.mode.${mode}`, names) }}</span>
        <span class="mode__desc">
          {{
            manifest && !available.includes(mode)
              ? t('menu.unavailable')
              : t(`menu.modeDesc.${mode}`, names)
          }}
        </span>
      </button>
    </div>

    <nav class="menu__nav">
      <RouterLink class="btn btn--ghost" to="/progress">{{ t('menu.progress') }}</RouterLink>
      <RouterLink class="btn btn--ghost" to="/settings">{{ t('menu.settings') }}</RouterLink>
      <RouterLink class="menu__about muted" to="/about">{{ t('menu.about') }}</RouterLink>
    </nav>
  </main>
</template>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  flex: 1;
}

.menu__header {
  text-align: center;
  padding-top: var(--space-4);
}

.menu__title {
  font-size: clamp(2.4rem, 13vw, 3.4rem);
  font-weight: 900;
  letter-spacing: -0.02em;
}

.menu__title span {
  display: inline-block;
  color: var(--mode-1);
  animation: roll-in 600ms var(--ease-bounce) both;
  animation-delay: calc(var(--i) * 45ms);
}

.menu__title span:nth-child(4n + 2) {
  color: var(--mode-2);
}

.menu__title span:nth-child(4n + 3) {
  color: var(--mode-3);
}

.menu__title span:nth-child(4n) {
  color: var(--mode-4);
}

.menu__header p {
  margin: var(--space-2) 0 var(--space-3);
}

.menu__pair {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-weight: 800;
  text-decoration: none;
  box-shadow: var(--shadow);
}

.menu__error {
  color: var(--bad);
  font-weight: 700;
}

.menu__modes {
  display: grid;
  gap: var(--space-3);
}

.mode {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-height: 84px;
  padding: var(--space-4) var(--space-5);
  border: 0;
  border-radius: var(--radius-l);
  background: var(--mode);
  color: #fff;
  text-align: left;
  box-shadow: 0 7px 0 color-mix(in srgb, var(--mode) 60%, #000);
  animation: rise 420ms var(--ease-bounce) both;
  animation-delay: calc(120ms + var(--i) * 70ms);
  transition: transform var(--dur-fast) var(--ease-bounce);
}

.mode:active:not(:disabled) {
  transform: translateY(6px);
  box-shadow: none;
}

.mode:disabled {
  filter: grayscale(0.9);
  opacity: 0.55;
}

.mode__title {
  font-size: 1.35rem;
  font-weight: 900;
}

.mode__desc {
  font-weight: 700;
  opacity: 0.92;
}

.menu__nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-top: auto;
}

.menu__nav .btn {
  display: grid;
  place-items: center;
  text-decoration: none;
  font-size: 0.95rem;
  text-align: center;
  padding: 0 var(--space-3);
}

.menu__about {
  grid-column: 1 / -1;
  text-align: center;
  font-weight: 700;
}
</style>
