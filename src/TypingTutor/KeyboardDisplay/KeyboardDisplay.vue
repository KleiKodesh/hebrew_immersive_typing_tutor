<template>
  <div class="keyboard-wrap" ref="wrapEl">
    <div class="keyboard" ref="keyboardEl" :style="{ maxWidth: kbMaxWidth }">
      <div class="row" v-for="row in activeKeyboard" :key="row.join('')">
        <div
          class="key"
          :class="keyClasses(k)"
          :style="keyStyle(k)"
          v-for="k in row"
          :key="k"
        >
          <div v-if="isDualKey(k)" class="dual-key-content">
            <span class="shifted">{{ getShifted(k) }}</span>
            <span class="unshifted">{{ getUnshifted(k) }}</span>
          </div>
          <div v-else class="single-key-content">
            <svg v-if="k === 'Win'" class="win-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12.5v6.7l8.1 1.2v-7.9M10.1 3.7L2 4.9v6.7h8.1M21.9 11.5V2L11.1 3.6v8M11.1 20.5L21.9 22v-9.5H11.1"/>
            </svg>
            <template v-else>{{ displayKey(k) }}</template>
          </div>
        </div>
      </div>

      <!-- Both hands always rendered; active hand moves to the target key -->
      <div
        v-for="hand in handOverlays"
        :key="hand.side"
        class="hand-overlay"
        :class="[hand.side, { idle: hand.idle }]"
        :style="hand.style"
      >
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="hand-svg">
          <path
            class="hand-base"
            :transform="hand.side === 'left' ? 'scale(-1,1) translate(-32,0)' : undefined"
            d="M31 8.5c0 0-2.53 5.333-3.215 8.062-0.896 3.57 0.13 6.268-1.172 9.73-2.25 4.060-2.402 4.717-10.613 4.708-3.009-0.003-11.626-2.297-11.626-2.297-1.188-0.305-3.373-0.125-3.373-1.453s1.554-2.296 2.936-2.3l5.439 0.478c1.322-0.083 2.705-0.856 2.747-2.585-0.022-2.558-0.275-4.522-1.573-6.6l-5.042-7.867c-0.301-0.626-0.373-1.694 0.499-2.171s1.862 0.232 2.2 0.849l5.631 7.66c0.602 0.559 1.671 0.667 1.58-0.524l-2.487-11.401c-0.155-0.81 0.256-1.791 1.194-1.791 1.231 0 1.987 0.47 1.963 1.213l2.734 11.249c0.214 0.547 0.972 0.475 1.176-0.031l0.779-10.939c0.040-0.349 0.495-0.957 1.369-0.831s1.377 1.063 1.285 1.424l-0.253 10.809c0.177 0.958 0.93 1.098 1.517 0.563l3.827-6.843c0.232-0.574 1.143-0.693 1.67-0.466 0.491 0.32 0.81 0.748 0.81 1.351v0z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { KEYBOARD_HE, KEY_UNITS } from '../HebrewKeyboard'
import { useKeyboardSizing } from './useKeyboardSizing'
import { useHandOverlays } from './useHandOverlays'

const props = defineProps<{
  heldKey:        string
  nextKey:        string
  mistakeKey:     string
  prevKey?:       string
  unconstrained?: boolean
}>()

// ── Language detection ────────────────────────────────────────────────────────
const hebrewRe = /[\u05b0-\u05ea\ufb1d-\ufb4e]/
const latinRe  = /^[a-zA-Z]$/
const lang = ref<'en' | 'he'>('he')

function onKeyDown(e: KeyboardEvent) {
  if (e.key.length !== 1) return
  if (hebrewRe.test(e.key))     lang.value = 'he'
  else if (latinRe.test(e.key)) lang.value = 'en'
}

onMounted(()  => window.addEventListener('keydown', onKeyDown, true))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown, true))

// ── Layouts ───────────────────────────────────────────────────────────────────
const KEYBOARD_EN: string[][] = [
  ['`~', '1!', '2@', '3#', '4$', '5%', '6^', '7&', '8*', '9(', '0)', '-_', '=+', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[{', ']}', '\\|'],
  ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';:', '\'"', 'Enter'],
  ['LShift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',<', '.>', '/?', 'Shift'],
  ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Fn', 'Ctrl'],
]

const activeKeyboard = computed(() => lang.value === 'he' ? KEYBOARD_HE : KEYBOARD_EN)

// ── Dual-key helpers ──────────────────────────────────────────────────────────
const dualSecondChars = new Set([
  '~','!','@','#','$','%','^','&','*','(',')',
  '_','+','{','}','|','"','<','>','?','\\',':','״',
])

function isDualKey(key: string)    { return key.length === 2 && dualSecondChars.has(key.charAt(1)) }
function getShifted(key: string)   { return key.charAt(1) }
function getUnshifted(key: string) { return key.charAt(0) }

// ── Key rendering ─────────────────────────────────────────────────────────────
const wideKeys = new Set(['Backspace','Tab','Caps','Enter','LShift','Shift','Ctrl','Win','Alt','Fn','Space'])

function normalizeKey(key: string) {
  if (key === ' ')      return 'Space'
  if (key === 'LShift') return 'Shift'
  // For dual keys (e.g., 'ף:'), extract just the first character for comparison
  if (key.length > 1 && isDualKey(key)) return key.charAt(0)
  return key
}

function keyClasses(key: string) {
  const norm = (v: string) => normalizeKey(v) === normalizeKey(key)
  return {
    held:    norm(props.heldKey),
    next:    norm(props.nextKey),
    mistake: norm(props.mistakeKey),
    special: wideKeys.has(key) || (key.length > 1 && !isDualKey(key)),
  }
}

function keyStyle(key: string) {
  const units = KEY_UNITS[key] ?? 1
  return { flex: `${units} ${units} 0` }
}

function displayKey(key: string) {
  if (key === 'Backspace') return '⌫'
  if (key === 'LShift')    return 'Shift'
  return key
}

// ── Sizing & hand overlays ────────────────────────────────────────────────────
const wrapEl     = ref<HTMLElement>()
const keyboardEl = ref<HTMLElement>()

const { kbWidth, kbHeight, kbMaxWidth } = useKeyboardSizing(
  wrapEl as any, keyboardEl as any, () => props.unconstrained ?? false,
)

const nextKeyRef  = computed(() => props.nextKey)
const prevKeyRef  = computed(() => props.prevKey)
const handOverlays = useHandOverlays(nextKeyRef, prevKeyRef, lang, kbWidth, kbHeight)
</script>

<style scoped>
.keyboard-wrap {
  width: 100%;
  margin: 2px auto 0;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.keyboard {
  background: var(--bg-secondary);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 4px;
  border-radius: 1px;
  border: 1px solid var(--border-subtle);
  direction: ltr;
  width: 100%;
  aspect-ratio: 3.2 / 1;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
}

.row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-wrap: nowrap;
  flex: 1 1 0;
  min-height: 0;
}

.key {
  flex: 1 1 0;
  min-width: 0;
  width: 0;
  height: 100%;
  margin-right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 1px;
  background: rgba(236, 237, 244, 0.85);
  border: 0.5px solid rgba(192, 194, 204, 0.7);
  font-size: clamp(9px, 2vw, 12px);
  font-weight: 500;
  color: var(--text-primary);
  padding: 0 1px;
  white-space: nowrap;
  overflow: hidden;
  box-sizing: border-box;
  transition: transform 180ms ease;
  cursor: default;
  user-select: none;
  letter-spacing: 0.01em;
}

[data-theme='dark'] .key {
  background: rgba(236, 237, 244, 0.12);
  border-color: rgba(192, 194, 204, 0.18);
}

.single-key-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.dual-key-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 1px;
  line-height: 1;
}

.dual-key-content .shifted   { font-size: clamp(6px, 1.5vw, 8px); opacity: 0.55; }
.dual-key-content .unshifted { font-size: clamp(10px, 2.3vw, 13px); }

.key.special {
  background: rgba(236, 237, 244, 0.95);
  border-color: rgba(192, 194, 204, 0.85);
  color: #4a4c5a;
  font-weight: 500;
}

[data-theme='dark'] .key.special {
  background: rgba(236, 237, 244, 0.18);
  border-color: rgba(192, 194, 204, 0.28);
  color: #b0b0d0;
}

.key.held {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1e3a8a;
}

.key.next {
  background: #d4e8d0;
  border-color: #8ab88a;
  color: #1e3a1e;
  box-shadow: inset 0 0 0 1px #8ab88a;
}

.key.special.next {
  background: #d4e8d0;
  border-color: #8ab88a;
  color: #1e3a1e;
  box-shadow: inset 0 0 0 2px #8ab88a;
}

[data-theme='dark'] .key.next,
[data-theme='dark'] .key.special.next {
  background: rgba(100, 160, 90, 0.28);
  border-color: #6aaa60;
  color: #c8ecc4;
  box-shadow: inset 0 0 0 1px #6aaa60;
}

.key.mistake {
  background: #fdf2f2;
  border-color: #fecaca;
  color: #991b1b;
}

.win-icon {
  width: clamp(8px, 1.9vw, 12px);
  height: clamp(8px, 1.9vw, 12px);
  display: block;
}

/* ── Hand overlay ── */
.hand-overlay {
  position: absolute;
  pointer-events: none;
  transition: left 180ms ease, top 180ms ease, opacity 180ms ease;
  z-index: 10;
}

.hand-overlay.idle { opacity: 0.25; }

.hand-svg {
  width: 100%;
  height: auto;
  display: block;
}

.hand-base {
  fill: rgba(15, 23, 42, 0.4);
  opacity: 1;
}

[data-theme='dark'] .hand-base {
  fill: rgba(226, 232, 240, 0.4);
  opacity: 1;
}
</style>
