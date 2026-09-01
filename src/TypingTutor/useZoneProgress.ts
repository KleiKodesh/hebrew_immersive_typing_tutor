import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Lesson, ExerciseMode, ZoneKey } from './TypingTypes'

function getZones(lesson: Lesson): ZoneKey[] {
  if (!lesson.exercise_zones) return ['zone_c']
  const keys: ZoneKey[] = ['zone_a', 'zone_b', 'zone_c']
  return keys.filter((k) => lesson.exercise_zones![k] !== null)
}

export function getZoneText(lesson: Lesson, zone: ZoneKey): string {
  return lesson.exercise_zones?.[zone] ?? ''
}

export function getZoneName(zone: ZoneKey): string {
  return { zone_a: 'הכרה', zone_b: 'מילים', zone_c: 'ערבוב' }[zone]
}

export function useZoneProgress(
  currentLesson: Ref<Lesson>,
  exerciseMode: Ref<ExerciseMode>,
  typed: Ref<string>,
  onZoneAdvance: () => void,
  onLessonComplete: () => void,
) {
  const currentZoneIndex = ref(0)

  const availableZones = computed(() => getZones(currentLesson.value))

  const currentZone = computed<ZoneKey>(
    () => availableZones.value[currentZoneIndex.value] ?? 'zone_c'
  )

  const isLastZone = computed(
    () => currentZoneIndex.value >= availableZones.value.length - 1
  )

  const currentTarget = computed(() => {
    const lesson = currentLesson.value
    const zone = currentZone.value
    const zoneText = getZoneText(lesson, zone)
    if (zoneText) return zoneText
    if (lesson.exercise_zones) {
      for (const z of getZones(lesson)) {
        const t = getZoneText(lesson, z)
        if (t) return t
      }
    }
    return lesson.exercise ?? lesson.text
  })

  const isZoneDone = computed(() => {
    const t = currentTarget.value
    return t.length > 0 && typed.value.length >= t.length
  })

  // Free-mode lessons still have a target paragraph, so they complete on length
  // like any other zone — otherwise stage 6 could never be finished.
  const isComplete = computed(() => isZoneDone.value && isLastZone.value)

  // recall mode
  const recallReady = ref(false)
  const recallHidden = ref(false)

  function startRecall() {
    recallReady.value = true
    recallHidden.value = true
  }

  function resetZoneState() {
    recallReady.value = false
    recallHidden.value = false
  }

  function advanceZone() {
    if (isLastZone.value) return
    currentZoneIndex.value++
  }

  // auto-advance on zone completion
  let autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null

  watch(isZoneDone, (done) => {
    if (!done) return
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer)
    autoAdvanceTimer = setTimeout(() => {
      autoAdvanceTimer = null
      if (!isLastZone.value) {
        advanceZone()
        onZoneAdvance()
      } else {
        onLessonComplete()
      }
    }, 600)
  })

  function clearAutoAdvance() {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      autoAdvanceTimer = null
    }
  }

  onUnmounted(() => clearAutoAdvance())

  return {
    currentZoneIndex,
    currentZone,
    availableZones,
    isLastZone,
    currentTarget,
    isZoneDone,
    isComplete,
    recallReady,
    recallHidden,
    startRecall,
    resetZoneState,
    advanceZone,
    clearAutoAdvance,
  }
}
