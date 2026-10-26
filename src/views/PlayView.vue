<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Reveal } from '@/domain/evaluate'
import { MODES, type Mode } from '@/domain/types'
import { langName, useI18n } from '@/i18n'
import { sfx } from '@/lib/sfx'
import { useAppStore } from '@/stores/app'
import { useRoundStore } from '@/stores/round'
import LetterBoard from '@/components/LetterBoard.vue'
import PromptCard from '@/components/PromptCard.vue'
import RevealPopup from '@/components/RevealPopup.vue'
import RoundHud from '@/components/RoundHud.vue'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const rounds = useRoundStore()
const { t, lang } = useI18n()

const board = ref<InstanceType<typeof LetterBoard> | null>(null)
const reveal = ref<Reveal | null>(null)
const pausedByUser = ref(false)
const gridVersion = ref(0)

const mode = computed<Mode | null>(() => {
  const m = String(route.params.mode)
  return (MODES as readonly string[]).includes(m) ? (m as Mode) : null
})
const round = computed(() => rounds.round)
const prompt = computed(() => round.value?.state.prompt ?? null)
const answerLang = computed(() => {
  const target = app.state.settings.activeTarget
  if (!prompt.value || !target) return ''
  return langName(prompt.value.answerSide === 'target' ? target : lang.value, lang.value)
})

watch(
  () => prompt.value,
  () => gridVersion.value++,
)

function onSubmit(word: string): void {
  const r = round.value
  if (!r) return
  const { evaluation } = r.submit(word)
  if (evaluation.kind === 'invalid') {
    sfx.play('invalid')
    sfx.haptic([20, 40, 20])
    board.value?.shake()
    return
  }
  sfx.play(evaluation.kind === 'correct' ? 'correct' : 'wrong')
  sfx.haptic(evaluation.kind === 'correct' ? [30, 30, 60] : 80)
  reveal.value = evaluation.reveal
}

function closeReveal(): void {
  const r = round.value
  const wasCorrect = reveal.value?.correct ?? false
  reveal.value = null
  if (!r) return
  if (wasCorrect) r.next()
  else r.resume()
}

function skip(): void {
  sfx.play('tap')
  round.value?.skip()
}

function pause(): void {
  round.value?.pause()
  pausedByUser.value = true
}

function resume(): void {
  pausedByUser.value = false
  round.value?.resume()
}

function quit(): void {
  pausedByUser.value = false
  rounds.end()
}

function onVisibility(): void {
  if (document.visibilityState === 'hidden' && round.value && !reveal.value) pause()
}

onMounted(() => {
  if (!mode.value) {
    void router.replace('/')
    return
  }
  document.addEventListener('visibilitychange', onVisibility)
  void rounds.start(mode.value, () => void router.replace('/results'))
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  // Leaving mid-round still saves what was played.
  if (rounds.round) rounds.end()
})
</script>

<template>
  <main class="play">
    <p v-if="rounds.loading" class="play__status">{{ t('common.loading') }}</p>
    <p v-else-if="rounds.error" class="play__status card">{{ t('menu.noData') }}</p>

    <template v-else-if="round && prompt">
      <RoundHud
        :remaining-ms="rounds.remainingMs"
        :score="round.state.score"
        :streak="round.state.streak"
      />
      <PromptCard :key="`p-${gridVersion}`" :prompt="prompt" :answer-lang="answerLang" />
      <LetterBoard
        ref="board"
        :key="`b-${gridVersion}`"
        :tiles="round.state.tiles"
        :rolling="true"
        :disabled="round.state.paused"
        @submit="onSubmit"
      />
      <div class="play__actions">
        <button type="button" class="btn btn--ghost" @click="pause">{{ t('round.pause') }}</button>
        <button type="button" class="btn" @click="skip">{{ t('round.skip') }}</button>
      </div>
    </template>

    <p v-else-if="!rounds.round && !rounds.loading" class="play__status card">
      {{ t('round.empty') }}
    </p>

    <RevealPopup v-if="reveal" :reveal="reveal" @close="closeReveal" />

    <div v-if="pausedByUser" class="overlay">
      <div class="card pause">
        <h2>{{ t('round.paused') }}</h2>
        <button type="button" class="btn" @click="resume">{{ t('round.resume') }}</button>
        <button type="button" class="btn btn--ghost" @click="quit">{{ t('round.quit') }}</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.play {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  flex: 1;
}

.play__status {
  margin: auto;
  font-weight: 800;
  text-align: center;
}

.play__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-top: auto;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: var(--overlay);
}

.pause {
  display: grid;
  gap: var(--space-3);
  width: min(100%, 360px);
  text-align: center;
  animation: rise var(--dur-med) var(--ease-bounce) both;
}

.pause h2 {
  font-size: 1.8rem;
  font-weight: 900;
}
</style>
