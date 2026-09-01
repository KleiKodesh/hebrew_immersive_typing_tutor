<template>
  <div class="hide-text-row">
    <button
      type="button"
      class="hide-text-btn"
      :class="{ 'hide-text-btn--on': active }"
      :aria-pressed="active"
      :title="active ? 'הטקסט מוסתר — לחץ להצגה' : 'הסתר את הטקסט והקלד מהזיכרון'"
      @click="$emit('toggle')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="active">
          <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3 8 10 8a9.1 9.1 0 0 0 5.39-1.61" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M2 2l20 20" />
        </template>
        <template v-else>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
          <circle cx="12" cy="12" r="3" />
        </template>
      </svg>
      <span>{{ active ? 'הצג טקסט' : 'הסתר טקסט' }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ active?: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<style scoped>
.hide-text-row {
  display: flex;
  justify-content: flex-start;
  direction: rtl;
  flex-shrink: 0;
}

.hide-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-family: inherit;
  font-size: clamp(10px, 1.5vw, 12px);
  font-weight: 600;
  cursor: pointer;
  transition: all 160ms ease;
}

.hide-text-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.hide-text-btn--on {
  background: rgba(0, 120, 212, 0.12);
  border-color: rgba(0, 120, 212, 0.3);
  color: var(--accent-primary);
}

.hide-text-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
</style>
