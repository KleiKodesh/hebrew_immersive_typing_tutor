export type { ExerciseZones, Lesson, Stage, ExerciseMode, ZoneKey } from './TypingTypes'
export { getZoneName } from './useZoneProgress'

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { Lesson, Stage, ExerciseMode } from './TypingTypes'
import { stages as bundledStages } from 'virtual:stages'
import { fireConfetti } from '../composables/useConfetti'
import { AYIN } from '../KeyboardDisplay/HebrewKeyboard'
import { useSessionTimer } from './useSessionTimer'
import { useZoneProgress } from './useZoneProgress'
import { useLessonNavigation } from './useLessonNavigation'
import { useTypingInput } from './useTypingInput'
import { useBlindMode } from './useBlindMode'
import { useUserProfile } from '../composables/useUserProfile'
import { usePersistence } from '../composables/usePersistence'

export function useTyping(initialLesson: Lesson, userName?: Ref<string>) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const currentLesson = ref<Lesson>(initialLesson)
  const currentStage = ref<Stage | null>(null)
  const allStages = ref<Stage[]>([])
  const typed = ref('')
  const accuracy = ref(100)
  const wpm = ref(0)
  const progress = ref(0)
  const start = ref<number | null>(null)
  const lastKey = ref('')
  const heldKey = ref('')
  const mistakeKey = ref('')
  const weak = ref<Record<string, number>>({})
  const exerciseMode = ref<ExerciseMode>('copy')

  // ── Per-user key helpers ────────────────────────────────────────────────────
  function userPrefix(): string {
    const name = userName?.value?.trim()
    return name ? `user:${name}:` : ''
  }
  function userKey(key: string): string { return `${userPrefix()}${key}` }

  // ── Persistence ────────────────────────────────────────────────────────────
  const persistence = usePersistence()

  // ── Lesson completion tracking ──────────────────────────────────────────────
  const userProfile = useUserProfile()
  const { isLessonCompleted, markLessonCompleted, resetLessonCompleted, getLessonStats } = userProfile

  // ── Completion tracking (per-stage, managed by persistence) ──────────────────
  const stageCompletions = ref<Record<string, any>>({})

  function getStageCompletion(stageId: string) {
    if (!userName?.value) return { completed: false, lessons: [] }
    if (!stageCompletions.value[stageId]) {
      stageCompletions.value[stageId] = persistence.loadStageCompletion(userName.value, stageId)
    }
    return stageCompletions.value[stageId]
  }

  function isStageCompleted(stageId: string): boolean {
    return getStageCompletion(stageId).completed ?? false
  }

  function markZoneCompleted(stageId: string, lessonId: string, zoneIndex: number) {
    const completion = getStageCompletion(stageId)
    let lessonObj = completion.lessons.find((l: any) => l.id === lessonId)
    
    if (!lessonObj) {
      lessonObj = { id: lessonId, zones: [] }
      completion.lessons.push(lessonObj)
    }
    
    if (!lessonObj.zones.includes(zoneIndex)) {
      lessonObj.zones.push(zoneIndex)
    }
    
    if (userName?.value) {
      persistence.saveStageCompletion(userName.value, stageId, completion)
    }
  }

  function isZoneCompleted(stageId: string, lessonId: string, zoneIndex: number): boolean {
    const completion = getStageCompletion(stageId)
    const lessonObj = completion.lessons.find((l: any) => l.id === lessonId)
    return lessonObj?.zones.includes(zoneIndex) ?? false
  }

  function markLessonCompletedLocal(stageId: string, lessonId: string) {
    const completion = getStageCompletion(stageId)
    const exists = completion.lessons.some((l: any) => l.id === lessonId)
    
    if (!exists) {
      completion.lessons.push({ id: lessonId, zones: [] })
    }
    
    if (userName?.value) {
      persistence.saveStageCompletion(userName.value, stageId, completion)
    }
  }

  function isLessonCompletedLocal(stageId: string, lessonId: string): boolean {
    const completion = getStageCompletion(stageId)
    return completion.lessons.some((l: any) => l.id === lessonId) ?? false
  }

  function markStageCompleted(stageId: string) {
    const completion = getStageCompletion(stageId)
    completion.completed = true
    if (userName?.value) {
      persistence.saveStageCompletion(userName.value, stageId, completion)
    }
  }

  function resetStageCompletion(stageId: string) {
    const completion = getStageCompletion(stageId)
    completion.completed = false
    completion.lessons = []
    if (userName?.value) {
      persistence.saveStageCompletion(userName.value, stageId, completion)
    }
  }
  
  // ── Sub-composables ─────────────────────────────────────────────────────────
  const session = useSessionTimer(userKey)
  const blind = useBlindMode(userKey)

  const ayinCorrect = ref(0)
  const ayinTotal = ref(0)
  const ayinAccuracy = computed(() =>
    ayinTotal.value === 0 ? null : Math.round((ayinCorrect.value / ayinTotal.value) * 100)
  )

  const showSummary = ref(false)
  const summaryData = ref<{
    accuracy: number; wpm: number; ayinAccuracy: number | null
    timeUsedMs: number; hasAyinCheck: boolean
  } | null>(null)

  const showRedoConfirm = ref(false)
  const pendingRedoLesson = ref<Lesson | null>(null)
  const pendingRedoStage = ref<Stage | null>(null)
  const redoSummaryData = ref<ReturnType<typeof getLessonStats>>(null)

  function triggerLessonComplete() {
    const lessonId = currentLesson.value.lesson_id ?? currentLesson.value.title
    // Only show summary if this lesson hasn't been completed before
    if (isLessonCompleted(lessonId)) {
      return
    }
    fireConfetti()
    summaryData.value = {
      accuracy: accuracy.value, wpm: wpm.value,
      ayinAccuracy: currentLesson.value.ayin_check ? ayinAccuracy.value : null,
      timeUsedMs: session.sessionElapsedMs.value,
      hasAyinCheck: currentLesson.value.ayin_check ?? false,
    }
    showSummary.value = true
    markLessonCompleted(lessonId, {
      accuracy: accuracy.value, wpm: wpm.value,
      ayinAccuracy: currentLesson.value.ayin_check ? ayinAccuracy.value : null,
      timeUsedMs: session.sessionElapsedMs.value,
      hasAyinCheck: currentLesson.value.ayin_check ?? false,
    })
    
    // Mark lesson completed in hierarchical structure
    if (currentStage.value) {
      const stageId = currentStage.value.stage_id
      markLessonCompletedLocal(stageId, lessonId)
      
      // Check if all lessons in this stage are completed, if so mark stage as completed
      const allLessonsInStage = currentStage.value.lessons.map((l) => l.lesson_id ?? l.title)
      const allCompleted = allLessonsInStage.every((id) => isLessonCompletedLocal(stageId, id))
      if (allCompleted) {
        markStageCompleted(stageId)
      }
    }
  }

  const zone = useZoneProgress(
    currentLesson, exerciseMode, typed,
    () => resetZone(),
    () => triggerLessonComplete(),
  )

  // ── Display ─────────────────────────────────────────────────────────────────
  const displayText = computed(() => {
    if (exerciseMode.value === 'free') return ''
    if (exerciseMode.value === 'recall' && zone.recallHidden.value) return ''
    if (blind.blindHidden.value) return ''
    const target = zone.currentTarget.value
    let html = ''
    for (let i = 0; i < target.length; i++) {
      const c = target[i] === ' ' ? '\u00a0' : target[i]
      if (i < typed.value.length) {
        html += typed.value[i] === target[i]
          ? `<span class="correct">${c}</span>`
          : `<span class="wrong">${c}</span>`
      } else if (i === typed.value.length) {
        html += `<span class="current">${c}</span>`
      } else {
        html += c
      }
    }
    return html
  })

  const nextKey = computed(() => {
    if (exerciseMode.value === 'free') return ''
    const t = zone.currentTarget.value
    return typed.value.length < t.length ? t[typed.value.length] : ''
  })

  // ── Reset helpers ───────────────────────────────────────────────────────────
  function resetTyping() {
    typed.value = ''
    accuracy.value = 100; wpm.value = 0; progress.value = 0; start.value = null
    lastKey.value = ''; heldKey.value = ''; mistakeKey.value = ''
    ayinCorrect.value = 0; ayinTotal.value = 0
    showSummary.value = false; summaryData.value = null
    zone.resetZoneState(); zone.clearAutoAdvance(); blind.resetBlindReveal()
  }

  function resetZone() {
    typed.value = ''
    accuracy.value = 100; wpm.value = 0; progress.value = 0; start.value = null
    lastKey.value = ''; mistakeKey.value = ''
    zone.resetZoneState(); zone.clearAutoAdvance(); blind.resetBlindReveal()
  }

  // ── Lesson application ──────────────────────────────────────────────────────
  const EXERCISE_MODES: ExerciseMode[] = ['copy', 'recall', 'free']

  function applyLesson(lesson: Lesson, restoreZoneIndex?: number) {
    currentLesson.value = lesson
    // The lesson data drives the mode — recall lessons hide the text, free lessons drop the tunnel
    const mode = lesson.exercise_mode as ExerciseMode | undefined
    exerciseMode.value = mode && EXERCISE_MODES.includes(mode) ? mode : 'copy'
    resetTyping()
    // Restore zone index if provided, otherwise start at zone 0
    if (restoreZoneIndex !== undefined) {
      const maxIndex = zone.availableZones.value.length - 1
      zone.currentZoneIndex.value = Math.min(restoreZoneIndex, maxIndex)
    } else {
      zone.currentZoneIndex.value = 0
    }
    accuracy.value = 100; wpm.value = 0
    progress.value = Math.min(
      100,
      zone.currentTarget.value.length > 0
        ? Math.round((typed.value.length / zone.currentTarget.value.length) * 100)
        : 0
    )
    lastKey.value = typed.value.slice(-1)
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  const nav = useLessonNavigation(
    allStages, currentStage, currentLesson,
    applyLesson, session.stopSessionTimer,
    navigateToLesson,
  )

  const highlightNextStage = computed(
    () => zone.isComplete.value && !nav.canGoNext.value && nav.canGoNextStage.value
  )

  function dismissSummaryAndAdvance() {
    showSummary.value = false; summaryData.value = null
    if (nav.canGoNext.value) nav.goNextLesson()
    else if (nav.canGoNextStage.value) nav.goNextStage()
  }

  function dismissSummaryAndStay() {
    showSummary.value = false; summaryData.value = null
    zone.currentZoneIndex.value = 0
    resetTyping()
    // Reset completion flag so congrats shows again when user completes the lesson again
    const lessonId = currentLesson.value.lesson_id ?? currentLesson.value.title
    resetLessonCompleted(lessonId)
    // Reset local completion tracking
    if (currentStage.value && userName?.value) {
      const stageId = currentStage.value.stage_id
      const completion = persistence.loadStageCompletion(userName.value, stageId)
      completion.lessons = completion.lessons.filter((l: any) => l.id !== lessonId)
      completion.completed = false
      persistence.saveStageCompletion(userName.value, stageId, completion)
      stageCompletions.value[stageId] = completion
    }
  }

  function restartLesson() {
    session.stopSessionTimer()
    zone.currentZoneIndex.value = 0
    resetTyping()
    // Reset completion flag so congrats shows again when user completes the lesson again
    const lessonId = currentLesson.value.lesson_id ?? currentLesson.value.title
    resetLessonCompleted(lessonId)
    // Reset local completion tracking
    if (currentStage.value && userName?.value) {
      const stageId = currentStage.value.stage_id
      const completion = persistence.loadStageCompletion(userName.value, stageId)
      completion.lessons = completion.lessons.filter((l: any) => l.id !== lessonId)
      completion.completed = false
      persistence.saveStageCompletion(userName.value, stageId, completion)
      stageCompletions.value[stageId] = completion
    }
  }

  // ── Navigation with completion check ───────────────────────────────────────
  // All lesson navigation funnels through here so completed lessons always
  // prompt the user before overwriting their clean state.
  function navigateToLesson(lesson: Lesson, stage?: Stage) {
    const lessonId = lesson.lesson_id ?? lesson.title
    if (isLessonCompleted(lessonId)) {
      pendingRedoLesson.value = lesson
      pendingRedoStage.value = stage ?? null
      redoSummaryData.value = getLessonStats(lessonId)
      showRedoConfirm.value = true
    } else {
      if (stage) currentStage.value = stage
      applyLesson(lesson)
    }
  }

  function selectLesson(lesson: Lesson) {
    session.stopSessionTimer()
    navigateToLesson(lesson)
  }

  function confirmRedo() {
    if (pendingRedoLesson.value) {
      const lessonId = pendingRedoLesson.value.lesson_id ?? pendingRedoLesson.value.title
      resetLessonCompleted(lessonId)
      
      // Reset local completion tracking
      if (pendingRedoStage.value && userName?.value) {
        const stageId = pendingRedoStage.value.stage_id
        const completion = persistence.loadStageCompletion(userName.value, stageId)
        completion.lessons = completion.lessons.filter((l: any) => l.id !== lessonId)
        completion.completed = false
        persistence.saveStageCompletion(userName.value, stageId, completion)
        stageCompletions.value[stageId] = completion
      }
      
      if (pendingRedoStage.value) currentStage.value = pendingRedoStage.value
      applyLesson(pendingRedoLesson.value)
      pendingRedoLesson.value = null
      pendingRedoStage.value = null
      redoSummaryData.value = null
    }
    showRedoConfirm.value = false
  }

  function cancelRedo() {
    pendingRedoLesson.value = null
    pendingRedoStage.value = null
    redoSummaryData.value = null
    showRedoConfirm.value = false
  }

  // ── Input handling ──────────────────────────────────────────────────────────
  const input = useTypingInput(
    typed, accuracy, wpm, progress, start, lastKey, heldKey, mistakeKey,
    weak, ayinCorrect, ayinTotal, currentLesson, exerciseMode,
    zone.currentTarget, session.sessionExpired,
    session.startSessionTimer,
  )

  // ── Progress persistence ────────────────────────────────────────────────────
  function clearAllProgress() {
    resetTyping()
    weak.value = {}
    stageCompletions.value = {}
    if (userName?.value) {
      persistence.resetUserData(userName.value)
    }
  }

  function clearAllProgressAndSession() {
    clearAllProgress()
    session.resetSession()
  }

  // ── Weak-letter drill ───────────────────────────────────────────────────────
  function generateWeakLesson() {
    const weakLetters = Object.entries(weak.value)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0])
    if (weakLetters.length === 0) return
    const lesson: Lesson = {
      title: 'תרגיל חיזוק',
      text: 'תרגיל מותאם אישית — האותיות שגרמו לך לטעויות הכי הרבה.',
      exercise_zones: { zone_a: null, zone_b: null, zone_c: (weakLetters.join(' ') + ' ').repeat(20).trim() },
      exercise_mode: 'copy',
      ayin_check: weakLetters.includes(AYIN),
    }
    currentLesson.value = lesson
    exerciseMode.value = 'copy'
    zone.currentZoneIndex.value = 0
    resetTyping()
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────────
  onMounted(async () => {
    try {
      const results: (Stage | null)[] = await Promise.resolve(bundledStages)
      for (const stage of results) { if (stage) allStages.value.push(stage as Stage) }
    } catch (error) { console.error('Failed to load stages:', error) }

    // Load user data from persistence if user is set
    if (userName?.value && allStages.value.length > 0) {
      weak.value = persistence.loadWeak(userName.value)
      blind.loadBlindMode()
      const position = persistence.loadPosition(userName.value)
      const stage = allStages.value[Math.min(position.stageIndex, allStages.value.length - 1)]
      if (stage) {
        currentStage.value = stage
        const lesson = stage.lessons.find((l) => (l.lesson_id ?? l.title) === position.lessonId)
        applyLesson(lesson ?? stage.lessons[0], position.zoneIndex ?? 0)
        return
      }
    }

    // Default: start at first stage
    if (allStages.value.length > 0) {
      currentStage.value = allStages.value[0]
      applyLesson(allStages.value[0].lessons[0])
    }
  })

  watch(
    () => ({ stage: nav.currentStageIndex.value, lesson: nav.currentLessonIndex.value }),
    () => {
      if (nav.stageProgression.value && nav.lessonProgression.value)
        document.title = `הקלדה עברית — ${nav.lessonStageLabel.value}`
    },
    { immediate: true }
  )

  // ── Position watcher: save to persistence when position changes ───────────────
  watch(
    () => ({
      stage: currentStage.value?.stage_id,
      lesson: currentLesson.value?.lesson_id ?? currentLesson.value?.title,
      zone: zone.currentZoneIndex.value,
    }),
    () => {
      if (userName?.value) {
        const stageIndex = currentStage.value
          ? allStages.value.findIndex((s) => s.stage_id === currentStage.value!.stage_id)
          : 0
        const lessonId = currentLesson.value.lesson_id ?? currentLesson.value.title
        persistence.savePosition(userName.value, {
          stageIndex: Math.max(0, stageIndex),
          lessonId,
          zoneIndex: zone.currentZoneIndex.value,
        })
      }
    }
  )

  // ── Zone completion tracking ────────────────────────────────────────────────
  watch(
    () => zone.isComplete.value,
    (isComplete) => {
      if (isComplete && currentStage.value) {
        const stageId = currentStage.value.stage_id
        const lessonId = currentLesson.value.lesson_id ?? currentLesson.value.title
        const zoneIndex = zone.currentZoneIndex.value
        markZoneCompleted(stageId, lessonId, zoneIndex)
      }
    }
  )

  // ── Weak letters watcher ────────────────────────────────────────────────────
  watch(
    () => weak.value,
    () => {
      if (userName?.value) {
        persistence.saveWeak(userName.value, weak.value)
      }
    },
    { deep: true }
  )

  if (userName) {
    watch(userName, () => {
      if (!userName.value || allStages.value.length === 0) return

      // Reload all user data from persistence
      weak.value = persistence.loadWeak(userName.value)
      stageCompletions.value = {} // Clear cache, will be loaded on demand
      session.reloadSessionForUser()
      blind.loadBlindMode()

      // Restore position
      const position = persistence.loadPosition(userName.value)
      const stage = allStages.value[Math.min(position.stageIndex, allStages.value.length - 1)]
      if (stage) {
        currentStage.value = stage
        const lesson = stage.lessons.find((l) => (l.lesson_id ?? l.title) === position.lessonId)
        applyLesson(lesson ?? stage.lessons[0], position.zoneIndex ?? 0)
      } else {
        currentStage.value = allStages.value[0]
        applyLesson(allStages.value[0].lessons[0])
      }
    })
  }

  onUnmounted(() => {
    // session timer, zone auto-advance, and input timers clean themselves up
  })

  return {
    typed, accuracy, wpm, progress, lastKey, heldKey, nextKey, mistakeKey,
    englishWarning: input.englishWarning,
    isComplete: zone.isComplete, isZoneDone: zone.isZoneDone,
    currentLesson, currentStage, allStages, displayText, exerciseMode,
    currentZone: zone.currentZone, currentZoneIndex: zone.currentZoneIndex,
    availableZones: zone.availableZones, isLastZone: zone.isLastZone,
    advanceZone: zone.advanceZone,
    recallReady: zone.recallReady, recallHidden: zone.recallHidden,
    startRecall: zone.startRecall,
    blindMode: blind.blindMode, blindHidden: blind.blindHidden,
    toggleBlindMode: blind.toggleBlindMode, revealBlind: blind.revealBlind,
    sessionElapsedMs: session.sessionElapsedMs,
    sessionWarning: session.sessionWarning, sessionExpired: session.sessionExpired,
    sessionSecondsDisplay: session.sessionSecondsDisplay,
    sessionMinutesLeft: session.sessionMinutesLeft,
    ayinAccuracy, ayinTotal,
    showSummary, summaryData, dismissSummaryAndAdvance, dismissSummaryAndStay,
    showRedoConfirm, confirmRedo, cancelRedo, redoSummaryData,
    canGoPrev: nav.canGoPrev, canGoNext: nav.canGoNext,
    canGoPrevStage: nav.canGoPrevStage, canGoNextStage: nav.canGoNextStage,
    highlightNextStage,
    lessonProgression: nav.lessonProgression, stageProgression: nav.stageProgression,
    lessonStageLabel: nav.lessonStageLabel,
    goPrevLesson: nav.goPrevLesson, goNextLesson: nav.goNextLesson,
    goPrevStage: nav.goPrevStage, goNextStage: nav.goNextStage,
    onInput: input.onInput, onKeyDown: input.onKeyDown, onKeyUp: input.onKeyUp,
    clearHeldKey: input.clearHeldKey,
    triggerMistake: input.triggerMistake,
    triggerEnglishWarning: input.triggerEnglishWarning,
    selectLesson, restartLesson,
    dismissExpired: session.dismissExpired,
    continueAfterExpiration: session.continueAfterExpiration,
    clearAllProgress, clearAllProgressAndSession, generateWeakLesson,
    currentTarget: zone.currentTarget,
    jumpToZone: (index: number) => {
      zone.clearAutoAdvance()
      zone.currentZoneIndex.value = index
      resetZone()
    },
  }
}
