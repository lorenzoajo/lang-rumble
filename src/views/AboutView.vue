<script setup lang="ts">
import { useI18n } from '@/i18n'
import BackLink from '@/components/BackLink.vue'

const { t } = useI18n()

const sources = [
  {
    name: 'Wiktionary (via kaikki.org / Wiktextract)',
    url: 'https://kaikki.org/',
    license: 'CC BY-SA 4.0',
  },
  { name: 'Tatoeba', url: 'https://tatoeba.org/', license: 'CC BY 2.0 FR' },
  {
    name: 'FrequencyWords (OpenSubtitles 2018)',
    url: 'https://github.com/hermitdave/FrequencyWords',
    license: 'MIT',
  },
]
</script>

<template>
  <main class="about">
    <header class="page-header">
      <BackLink />
      <h1>{{ t('about.title') }}</h1>
    </header>
    <p class="card">{{ t('about.intro') }}</p>
    <section class="card">
      <h2>{{ t('about.data') }}</h2>
      <p class="muted">{{ t('about.license') }}</p>
      <ul>
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener">{{ s.name }}</a> — {{ s.license }}
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.about h2 {
  font-size: 1rem;
  font-weight: 900;
}

.about ul {
  padding-left: var(--space-4);
  line-height: 1.6;
}

.about a {
  color: var(--primary);
  font-weight: 800;
}
</style>
