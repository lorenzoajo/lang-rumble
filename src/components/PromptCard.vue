<script setup lang="ts">
import { computed } from 'vue'
import type { Prompt } from '@/domain/prompt'
import { useI18n } from '@/i18n'

const props = defineProps<{ prompt: Prompt; answerLang: string }>()
const { t } = useI18n()

/** Splits the phrase so blank runs can be highlighted. */
const parts = computed(() =>
  (props.prompt.phraseText ?? '')
    .split(/(＿+)/)
    .filter(Boolean)
    .map((text) => ({ text, gap: text.startsWith('＿') })),
)
</script>

<template>
  <section class="prompt card" aria-live="polite">
    <template v-if="prompt.phraseText">
      <p class="prompt__hint">{{ prompt.hint }}</p>
      <p class="prompt__phrase">
        <span v-for="(p, i) in parts" :key="i" :class="{ prompt__gap: p.gap }">{{ p.text }}</span>
      </p>
      <p class="prompt__instruction">{{ t('round.fillGap', { lang: answerLang }) }}</p>
    </template>
    <template v-else>
      <p class="prompt__word">{{ prompt.shown }}</p>
      <p class="prompt__instruction">{{ t('round.buildIn', { lang: answerLang }) }}</p>
    </template>
  </section>
</template>

<style scoped>
.prompt {
  text-align: center;
  padding: var(--space-4) var(--space-5);
  animation: rise var(--dur-med) var(--ease-bounce) both;
}

.prompt__word {
  margin: 0;
  font-size: clamp(2rem, 11vw, 2.8rem);
  font-weight: 900;
  word-break: break-word;
}

.prompt__hint {
  margin: 0 0 var(--space-2);
  color: var(--text-muted);
  font-style: italic;
}

.prompt__phrase {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.35;
}

.prompt__gap {
  color: var(--primary);
  letter-spacing: 0.08em;
}

.prompt__instruction {
  margin: var(--space-2) 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
