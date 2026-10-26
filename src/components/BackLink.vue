<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <RouterLink class="back" to="/" :aria-label="t('common.back')">←</RouterLink>
</template>

<style scoped>
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  font-size: 1.4rem;
  font-weight: 900;
  text-decoration: none;
  box-shadow: var(--shadow);
}
</style>
