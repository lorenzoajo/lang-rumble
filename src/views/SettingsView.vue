<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BASE_LANGS, TARGET_LANGS, type LangCode } from '@/domain/types'
import { langName, useI18n } from '@/i18n'
import { FLAGS } from '@/lib/flags'
import type { Settings } from '@/lib/storage'
import { useAppStore } from '@/stores/app'
import BackLink from '@/components/BackLink.vue'

const app = useAppStore()
const route = useRoute()
const router = useRouter()
const { t, lang } = useI18n()

const settings = computed(() => app.state.settings)
const onboarding = computed(() => route.query.onboarding === '1')
const targets = computed(() => TARGET_LANGS.filter((l) => l !== settings.value.base))
const themes: Settings['theme'][] = ['system', 'light', 'dark']

function study(target: LangCode): void {
  app.setActiveTarget(target)
}

function done(): void {
  void router.push('/')
}
</script>

<template>
  <main class="settings">
    <header class="page-header">
      <BackLink v-if="!onboarding" />
      <h1>{{ t('settings.title') }}</h1>
    </header>

    <p v-if="onboarding" class="settings__welcome card">{{ t('settings.welcome') }}</p>

    <section class="card settings__section">
      <h2>{{ t('settings.base') }}</h2>
      <div class="segmented">
        <button
          v-for="b in BASE_LANGS"
          :key="b"
          type="button"
          :class="{ 'is-on': settings.base === b }"
          @click="app.setBase(b)"
        >
          {{ FLAGS[b] }} {{ langName(b, lang) }}
        </button>
      </div>
    </section>

    <section class="card settings__section">
      <h2>{{ t('settings.targets') }}</h2>
      <ul class="targets">
        <li v-for="l in targets" :key="l" data-test="target-row" :data-lang="l" class="target">
          <span class="target__name">{{ FLAGS[l] }} {{ langName(l, lang) }}</span>
          <template v-if="settings.targets.includes(l)">
            <span v-if="settings.activeTarget === l" class="target__active">{{
              t('settings.active')
            }}</span>
            <button v-else type="button" class="btn target__btn" @click="study(l)">
              {{ t('settings.activate') }}
            </button>
            <button type="button" class="btn btn--ghost target__btn" @click="app.removeTarget(l)">
              {{ t('settings.remove') }}
            </button>
          </template>
          <button v-else type="button" class="btn target__btn" @click="study(l)">
            {{ t('settings.add') }}
          </button>
        </li>
      </ul>
    </section>

    <section v-if="!onboarding" class="card settings__section">
      <h2>{{ t('settings.theme') }}</h2>
      <div class="segmented">
        <button
          v-for="th in themes"
          :key="th"
          type="button"
          :class="{ 'is-on': settings.theme === th }"
          @click="app.setTheme(th)"
        >
          {{ t(`settings.theme.${th}`) }}
        </button>
      </div>
      <h2 class="settings__sub">{{ t('settings.sound') }}</h2>
      <div class="segmented">
        <button type="button" :class="{ 'is-on': settings.sound }" @click="app.setSound(true)">
          {{ t('settings.on') }}
        </button>
        <button type="button" :class="{ 'is-on': !settings.sound }" @click="app.setSound(false)">
          {{ t('settings.off') }}
        </button>
      </div>
    </section>

    <button
      v-if="onboarding"
      type="button"
      class="btn settings__done"
      :disabled="!settings.activeTarget"
      @click="done"
    >
      {{ t('settings.done') }}
    </button>
  </main>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.settings__welcome {
  margin: 0;
  font-weight: 800;
  font-size: 1.1rem;
}

.settings__section h2 {
  font-size: 1rem;
  font-weight: 900;
  margin-bottom: var(--space-3);
}

.settings__sub {
  margin-top: var(--space-4);
}

.segmented {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: var(--radius-m);
  background: var(--surface-2);
}

.segmented button {
  flex: 1;
  min-height: 44px;
  border: 0;
  border-radius: var(--radius-s);
  background: transparent;
  font-weight: 800;
}

.segmented button.is-on {
  background: var(--primary);
  color: var(--primary-ink);
}

.targets {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

.target {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap);
}

.target__name {
  flex: 1;
  font-weight: 800;
  font-size: 1.05rem;
}

.target__btn {
  min-height: 40px;
  padding: 0 var(--space-3);
  font-size: 0.9rem;
}

.target__active {
  padding: var(--space-1) var(--space-3);
  border-radius: 999px;
  background: var(--ok-soft);
  color: var(--ok);
  font-weight: 900;
  font-size: 0.85rem;
}

.settings__done {
  margin-top: var(--space-2);
}
</style>
