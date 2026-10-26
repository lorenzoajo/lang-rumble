<script setup lang="ts">
import { computed, ref } from 'vue'
import { GRID_SIZE, isAdjacent, wordFromPath, type Path } from '@/domain/grid'
import { sfx } from '@/lib/sfx'

const props = defineProps<{ tiles: string[]; rolling: boolean; disabled?: boolean }>()
const emit = defineEmits<{ submit: [word: string, path: Path]; trace: [path: Path] }>()

// Only the inner part of a tile counts as a hit, so diagonal swipes don't clip neighbours.
const HIT_RADIUS = 0.7

const board = ref<HTMLElement | null>(null)
const path = ref<Path>([])
const shaking = ref(false)
const tracing = ref(false)

const display = (letter: string): string => (letter === 'ß' ? letter : letter.toUpperCase())

const points = computed(() =>
  path.value
    .map(
      (i) =>
        `${((i % GRID_SIZE) + 0.5) * (100 / GRID_SIZE)},${(Math.floor(i / GRID_SIZE) + 0.5) * (100 / GRID_SIZE)}`,
    )
    .join(' '),
)

function hit(e: PointerEvent): number | null {
  const rect = board.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  const cell = rect.width / GRID_SIZE
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const col = Math.floor(x / cell)
  const row = Math.floor(y / cell)
  if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) return null
  const dx = x - (col + 0.5) * cell
  const dy = y - (row + 0.5) * cell
  return Math.hypot(dx, dy) <= (cell / 2) * HIT_RADIUS ? row * GRID_SIZE + col : null
}

function add(i: number): void {
  path.value = [...path.value, i]
  sfx.play('tile', path.value.length)
  sfx.haptic(8)
  emit('trace', path.value)
}

function onDown(e: PointerEvent): void {
  if (props.disabled) return
  const i = hit(e)
  if (i === null) return
  board.value?.setPointerCapture(e.pointerId)
  tracing.value = true
  path.value = []
  add(i)
}

function onMove(e: PointerEvent): void {
  if (!tracing.value) return
  const i = hit(e)
  if (i === null) return
  const p = path.value
  if (p.at(-2) === i) {
    path.value = p.slice(0, -1)
    emit('trace', path.value)
  } else if (!p.includes(i) && isAdjacent(p.at(-1) ?? -1, i)) {
    add(i)
  }
}

function onUp(): void {
  if (!tracing.value) return
  tracing.value = false
  const p = path.value
  if (p.length >= 2) emit('submit', wordFromPath(props.tiles, p), p)
  path.value = []
}

function onCancel(): void {
  tracing.value = false
  path.value = []
}

function shake(): void {
  shaking.value = false
  requestAnimationFrame(() => (shaking.value = true))
}

defineExpose({ shake })
</script>

<template>
  <div
    ref="board"
    data-test="board"
    class="board"
    :class="{ 'is-shaking': shaking, 'is-disabled': disabled }"
    @pointerdown.prevent="onDown"
    @pointermove.prevent="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
    @animationend="shaking = false"
  >
    <div
      v-for="(letter, i) in tiles"
      :key="`${i}-${letter}`"
      class="tile"
      :class="{
        'is-active': path.includes(i),
        'is-head': path.at(-1) === i,
        'is-rolling': rolling,
      }"
      :style="{ '--col': i % 4, '--row': Math.floor(i / 4) }"
    >
      <span>{{ display(letter) }}</span>
    </div>
    <svg class="trace" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline v-if="path.length > 1" :points="points" />
    </svg>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  width: 100%;
  aspect-ratio: 1;
  padding: var(--space-2);
  border-radius: var(--radius-l);
  background: var(--surface-2);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.board.is-shaking {
  animation: shake 360ms ease;
}

.board.is-disabled {
  opacity: 0.6;
}

.tile {
  display: grid;
  place-items: center;
  border-radius: var(--radius-m);
  background: var(--tile-bg);
  color: var(--tile-ink);
  box-shadow: 0 5px 0 var(--tile-edge);
  font-size: clamp(1.6rem, 9vw, 2.4rem);
  font-weight: 900;
  transition:
    background var(--dur-fast),
    transform var(--dur-fast) var(--ease-bounce);
}

.tile.is-rolling {
  animation: roll-in 520ms var(--ease-bounce) both;
  animation-delay: calc(var(--col) * 70ms + var(--row) * 25ms);
}

.tile.is-active {
  background: var(--tile-active);
  color: var(--tile-active-ink);
  animation: pop 200ms var(--ease-bounce) both;
}

.tile.is-head {
  animation: wobble 420ms ease-in-out infinite;
}

.trace {
  position: absolute;
  inset: var(--space-2);
  width: calc(100% - 2 * var(--space-2));
  height: calc(100% - 2 * var(--space-2));
  pointer-events: none;
}

.trace polyline {
  fill: none;
  stroke: var(--trace);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
