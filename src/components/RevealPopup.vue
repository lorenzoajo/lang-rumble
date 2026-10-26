<script setup lang="ts">
import { computed } from 'vue'
import type { Reveal } from '@/domain/evaluate'
import { useI18n } from '@/i18n'

const props = defineProps<{ reveal: Reveal }>()
defineEmits<{ close: [] }>()
const { t } = useI18n()

const translations = computed(() => props.reveal.translations.join(', '))
</script>

<template>
  <div class="overlay" @click.self="$emit('close')">
    <div
      role="dialog"
      aria-modal="true"
      class="popup"
      :class="reveal.correct ? 'is-correct' : 'is-wrong'"
    >
      <header class="popup__header">
        <span class="popup__icon" aria-hidden="true">{{ reveal.correct ? '✓' : '✗' }}</span>
        <h2>{{ reveal.correct ? t('reveal.correct') : t('reveal.wrong') }}</h2>
      </header>
      <p v-if="!reveal.correct" class="popup__hint">{{ t('reveal.wrongHint') }}</p>

      <p class="popup__word">{{ reveal.word }}</p>
      <p v-if="reveal.lemma" class="popup__lemma">
        {{ t('reveal.lemma', { lemma: reveal.lemma }) }}
      </p>

      <dl class="popup__info">
        <template v-if="translations">
          <dt>{{ t('reveal.translations') }}</dt>
          <dd class="popup__tr">{{ translations }}</dd>
        </template>
        <dt>{{ t('reveal.definition') }}</dt>
        <dd>{{ reveal.definition ?? t('reveal.noDefinition') }}</dd>
      </dl>

      <button class="btn popup__close" type="button" @click="$emit('close')">
        {{ t('reveal.continue') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: end center;
  padding: var(--space-4);
  padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  background: var(--overlay);
}

.popup {
  --accent: var(--ok);
  --accent-soft: var(--ok-soft);
  width: 100%;
  max-width: var(--max-width);
  padding: var(--space-5);
  border-radius: var(--radius-l);
  border: 4px solid var(--accent);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  animation: rise var(--dur-med) var(--ease-bounce) both;
}

.popup.is-wrong {
  --accent: var(--bad);
  --accent-soft: var(--bad-soft);
}

.popup__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-5)) var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-radius: calc(var(--radius-l) - 4px) calc(var(--radius-l) - 4px) 0 0;
  background: var(--accent);
  color: #fff;
}

.popup__header h2 {
  font-size: 1.5rem;
  font-weight: 900;
}

.popup__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  font-size: 1.4rem;
  font-weight: 900;
}

.popup__hint {
  margin: 0 0 var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-s);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 700;
}

.popup__word {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--accent);
  word-break: break-word;
}

.popup__lemma {
  margin: 0;
  color: var(--text-muted);
  font-weight: 700;
}

.popup__info {
  margin: var(--space-4) 0;
}

.popup__info dt {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.popup__info dd {
  margin: var(--space-1) 0 var(--space-3);
  font-size: 1.05rem;
  line-height: 1.4;
}

.popup__tr {
  font-weight: 800;
}

.popup__close {
  width: 100%;
  background: var(--accent);
  color: #fff;
}
</style>
