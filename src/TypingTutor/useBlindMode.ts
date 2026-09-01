import { ref, computed, watch } from 'vue'

const STORAGE_SUFFIX = 'blindMode'

/**
 * "Blind typing" — the learner hides the target text and types it from memory.
 *
 * `blindMode` is a sticky per-user preference; `revealed` is a temporary peek
 * that lasts until the current zone is reset, so every new zone starts hidden
 * again.
 */
export function useBlindMode(userKey: (key: string) => string) {
  const blindMode = ref(false)
  const revealed = ref(false)

  function loadBlindMode() {
    try {
      blindMode.value = localStorage.getItem(userKey(STORAGE_SUFFIX)) === '1'
    } catch {
      blindMode.value = false
    }
    revealed.value = false
  }

  loadBlindMode()

  watch(blindMode, (on) => {
    try {
      localStorage.setItem(userKey(STORAGE_SUFFIX), on ? '1' : '0')
    } catch {
      // storage unavailable (private mode) — preference stays session-only
    }
  })

  /** True while the target text must not be shown. */
  const blindHidden = computed(() => blindMode.value && !revealed.value)

  function toggleBlindMode() {
    blindMode.value = !blindMode.value
    revealed.value = false
  }

  function revealBlind()      { revealed.value = true }
  function resetBlindReveal() { revealed.value = false }

  return {
    blindMode,
    blindHidden,
    toggleBlindMode,
    revealBlind,
    resetBlindReveal,
    loadBlindMode,
  }
}
