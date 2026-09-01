<template>
  <div class="typing-card">

    <!-- ── English keyboard warning ── -->
    <div v-if="englishWarning" class="warning-popup">
      ⚠️ הקלדה באנגלית — עבור לעברית
    </div>

    <!-- ── Stage intro overlay ── -->
    <StageIntroOverlay
      v-if="showStageIntro && stageIntroData"
      :stage-title="stageIntroData.title"
      :stage-subtitle="stageIntroData.subtitle"
      :description="stageIntroData.description"
      :phase-context="stageIntroData.context"
      @done="dismissStageIntro"
    />

    <!-- ── Session expired overlay ── -->
    <SessionExpiredOverlay
      v-if="sessionExpired"
      @dismiss="dismissExpired"
      @continue="continueAfterExpiration"
    />

    <!-- ── Lesson completion summary ── -->
    <LessonSummaryOverlay
      v-if="showSummary && summaryData"
      :title="summaryTitle"
      :advance-label="canGoNext ? 'שיעור הבא' : canGoNextStage ? 'שלב הבא' : 'סיום'"
      :data="summaryData"
      @stay="dismissSummaryAndStay"
      @advance="dismissSummaryAndAdvance"
    />

    <!-- ── Redo lesson prompt (reuses summary overlay, no confetti) ── -->
    <LessonSummaryOverlay
      v-if="showRedoConfirm && redoSummaryData"
      title="כבר השלמת את השיעור הזה"
      advance-label="המשך"
      stay-label="עשה שוב"
      :data="redoSummaryData"
      @stay="confirmRedo"
      @advance="cancelRedo"
    />

    <!-- ── Navigation bar ── -->
    <NavigationButtons
      :can-go-prev="canGoPrev"
      :can-go-next="canGoNext"
      :can-go-prev-stage="canGoPrevStage"
      :can-go-next-stage="canGoNextStage"
      :highlight-next-stage="highlightNextStage"
      :phase-label="currentLesson?.phase_label"
      :session-seconds-display="sessionSecondsDisplay"
      :session-warning="sessionWarning"
      :lesson-stage-label="lessonStageLabel"
      @prev-stage="goPrevStage"
      @prev-lesson="goPrevLesson"
      @restart-lesson="restartLesson"
      @next-lesson="goNextLesson"
      @next-stage="goNextStage"
      @show-intro="emit('show-intro')"
      @new-user="emit('new-user')"
      @reset-all="handleResetLesson"
    />

    <!-- ── Main content ── -->
    <div class="content-area">

      <!-- Lesson info card -->
      <LessonInfoCard
        v-if="currentLesson?.text"
        :lesson-id="currentLesson.lesson_id"
        :title="currentLesson.title"
        :text="currentLesson.text"
        :guidance="currentLesson.session_guidance"
      />

      <!-- Zone progress indicator (only when multiple zones exist) -->
      <div v-if="availableZones.length > 1" class="zone-bar">
        <button
          v-for="(zone, i) in availableZones"
          :key="zone"
          class="zone-pip"
          :class="{
            'zone-pip--done': i < currentZoneIndex,
            'zone-pip--active': i === currentZoneIndex,
          }"
          @click="jumpToZone(i)"
          :aria-label="getZoneName(zone)"
          :aria-pressed="i === currentZoneIndex"
        >
          <span class="zone-pip-label">{{ getZoneName(zone) }}</span>
        </button>
      </div>

      <!-- Zone text for free mode -->
      <div v-if="exerciseMode === 'free' && zoneText" class="zone-text">
        <div v-if="currentZone !== 'zone_c'" class="zone-text-title">{{ getZoneName(currentZone) }}</div>
        <div class="zone-text-body" dir="rtl">{{ zoneText }}</div>
      </div>

      <!-- Blind typing: hide the target text on demand (recall lessons hide it anyway) -->
      <HideTextToggle
        v-if="exerciseMode === 'copy'"
        :active="blindMode"
        @toggle="toggleBlindMode"
      />

      <!-- Recall mode: show text → hide → type -->
      <RecallPanel
        v-if="exerciseMode === 'recall' && !recallReady"
        :text="currentTarget"
        @start="startRecall"
      />

      

      <!-- Free mode: no target, just a textarea -->
      <FreeTypingPanel
        v-else-if="exerciseMode === 'free'"
        ref="freeInputRef"
        v-model="typed"
        @input="onInput"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
      />

      <!-- Copy / recall-hidden mode: exercise strip + input strip -->
      <InputArea
        ref="inputAreaRef"
        v-else
        :model-value="typed"
        :display-text="displayText"
        :is-hidden="(exerciseMode === 'recall' && recallHidden) || blindHidden"
        @update:modelValue="typed = $event"
        @input="onInput"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @blur="onBlur"
        @reveal="showRecallPanel"
      />

      

    </div>

    <!-- ── Stats bar ── -->
    <StatsBar
      :accuracy="accuracy"
      :wpm="wpm"
      :progress="progress"
      :ayin-accuracy="currentLesson?.ayin_check ? ayinAccuracy : null"
    />

    <!-- ── Keyboard display ── -->
    <KeyboardDisplay
      :last-key="lastKey"
      :held-key="heldKey"
      :next-key="nextKey"
      :prev-key="lastKey"
      :mistake-key="mistakeKey"
    />

    <!-- ── Reset confirmation dialog ── -->
    <ConfirmDialog
      :is-open="showResetConfirm"
      cancel-label="ביטול"
      confirm-label="מחק הכל"
      @confirm="confirmReset"
      @cancel="showResetConfirm = false"
    >
      <template #message>האם אתה בטוח שברצונך למחוק את כל הנתונים?</template>
      <template #warning>לא ניתן לבטל פעולה זו.</template>
    </ConfirmDialog>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import NavigationButtons from './NavigationButtons.vue'
import InputArea from './InputArea.vue'
import KeyboardDisplay from '../KeyboardDisplay/KeyboardDisplay.vue'
import StatsBar from './StatsBar.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import SessionExpiredOverlay from './SessionExpiredOverlay.vue'
import LessonSummaryOverlay from './LessonSummaryOverlay.vue'
import RecallPanel from './RecallPanel.vue'
import HideTextToggle from './HideTextToggle.vue'
import FreeTypingPanel from './FreeTypingPanel.vue'
import LessonInfoCard from './LessonInfoCard.vue'
import StageIntroOverlay from './StageIntroOverlay.vue'
import { useTyping, getZoneName } from './UseTyping'
import { useUserProfile } from '../composables/useUserProfile'

const emit = defineEmits<{ 'show-intro': []; 'new-user': []; 'reset-to-intro': [] }>()

const { userName, isStageIntroSeen, markStageIntroSeen, resetIntro } = useUserProfile()

const inputAreaRef = ref<InstanceType<typeof InputArea> | null>(null)
const freeInputRef = ref<InstanceType<typeof FreeTypingPanel> | null>(null)

const showStageIntro = ref(false)
const stageIntroData = ref<{ title: string; subtitle?: string; description: string; context?: string } | null>(null)

const {
  typed, accuracy, wpm, progress, lastKey, heldKey, nextKey, mistakeKey,
  englishWarning, currentLesson, currentStage, allStages, displayText, exerciseMode,
  currentZone, currentZoneIndex, availableZones,
  recallReady, recallHidden, startRecall,
  blindMode, blindHidden, toggleBlindMode, revealBlind,
  sessionSecondsDisplay, sessionWarning, sessionExpired,
  ayinAccuracy, showSummary, summaryData,
  dismissSummaryAndAdvance, dismissSummaryAndStay,
  showRedoConfirm, confirmRedo, cancelRedo, redoSummaryData,
  canGoPrev, canGoNext, canGoPrevStage, canGoNextStage, highlightNextStage,
  lessonStageLabel,
  goPrevLesson, goNextLesson, goPrevStage, goNextStage,
  restartLesson, dismissExpired, continueAfterExpiration,
  onInput, onKeyDown, onKeyUp,
  clearAllProgressAndSession, currentTarget, jumpToZone,
} = useTyping({ title: '', text: '' }, userName)

function showRecallPanel() {
  // 'הצג שוב' — peek at the target text again
  if (blindHidden.value) revealBlind()
  if (exerciseMode.value === 'recall') {
    // return to the recall view so the user can re-read the whole text
    recallReady.value = false
    recallHidden.value = false
  }
}

const zoneText = computed(() => {
  const lesson = currentLesson.value
  const z = currentZone.value ?? 'zone_c'
  return lesson?.exercise_zones?.[z] ?? ''
})



function onBlur() {}

// ── Reset ────────────────────────────────────────────────────────────────────
const showResetConfirm = ref(false)
const handleResetLesson = () => { showResetConfirm.value = true }
const confirmReset = () => {
  showResetConfirm.value = false
  clearAllProgressAndSession()
  resetIntro()
  emit('reset-to-intro')
}

// ── Auto-focus on lesson/zone change ─────────────────────────────────────────
function focusInput() {
  if (exerciseMode.value === 'free') freeInputRef.value?.focus()
  else inputAreaRef.value?.focusInput()
}

watch(() => currentLesson.value?.lesson_id, () => focusInput())
watch(() => currentZoneIndex.value, () => focusInput())

// ── Stage intro ──────────────────────────────────────────────────────────────
watch(() => currentStage.value, (stage) => {
  if (stage && !isStageIntroSeen(stage.stage_id)) {
    stageIntroData.value = {
      title: stage.stage_title,      subtitle: stage.stage_subtitle,      description: stage.description,
      context: stage.phase_context,
    }
    showStageIntro.value = true
  }
})

function dismissStageIntro() {
  if (currentStage.value) {
    markStageIntroSeen(currentStage.value.stage_id)
  }
  showStageIntro.value = false
}

// ── Personalised compliments ──────────────────────────────────────────────────
const compliments = ['כל הכבוד', 'עבודה מצוינת', 'מדהים', 'ממשיכים קדימה', 'מושלם']
const summaryTitle = ref('✓ שיעור הושלם')

watch(showSummary, (visible) => {
  if (!visible) return
  const base = compliments[Math.floor(Math.random() * compliments.length)]
  summaryTitle.value = userName.value ? `${base}, ${userName.value}! ✓` : '✓ שיעור הושלם'
})
</script>

<style scoped>
/* ── Shell ── */
.typing-card {
  background: var(--bg-primary);
  width: 100%;
  height: 100dvh;
  min-height: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

@media (max-width: 480px) { .typing-card { padding: 6px; gap: 4px; } }
@media (max-height: 600px) { .typing-card { padding: 4px; gap: 3px; } }

/* ── Content area ── */
.content-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 480px) { .content-area { gap: 6px; } }
@media (max-height: 600px) { .content-area { gap: 4px; } }

/* ── Zone progress bar ── */
.zone-bar {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  direction: rtl;
}

.zone-pip {
  flex: 1;
  height: clamp(20px, 3.5vw, 28px);
  border-radius: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(9px, 1.4vw, 12px);
  font-weight: 600;
  color: var(--text-tertiary);
  transition: all 200ms ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  padding: 0;
}

.zone-pip:hover { background: var(--bg-tertiary); border-color: var(--border-color); }
.zone-pip--active { background: rgba(0,120,212,0.12); border-color: rgba(0,120,212,0.3); color: var(--accent-primary); font-weight: 700; }
.zone-pip--done { background: rgba(16,124,16,0.1); border-color: rgba(16,124,16,0.25); color: var(--success-color); }
.zone-pip-label { pointer-events: none; }

/* ── Zone text shown in free mode ── */
.zone-text {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-primary);
  direction: rtl;
  font-size: 16px;
}
.zone-text-title {
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 6px;
}
.zone-text-body {
  white-space: pre-wrap;
  line-height: 1.6;
}

/* ── English warning popup ── */
.warning-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255,242,241,0.97);
  color: #991b1b;
  border: 1px solid rgba(252,165,165,0.75);
  border-radius: 12px;
  padding: clamp(14px, 2vw, 20px) clamp(18px, 3vw, 26px);
  font-size: clamp(13px, 2vw, 16px);
  font-weight: 700;
  text-align: center;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.06),
    0 4px 12px rgba(0,0,0,0.08),
    0 16px 40px rgba(0,0,0,0.07);
  z-index: 300;
  animation: popIn 280ms cubic-bezier(0.34,1.56,0.64,1);
  max-width: 88%;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

[data-theme='dark'] .warning-popup {
  background: rgba(60,20,20,0.97);
  color: #fca5a5;
  border-color: rgba(239,68,68,0.4);
}

@keyframes popIn {
  from { opacity: 0; transform: translate(-50%,-50%) scale(0.86); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

/* recall controls removed — InputArea now provides inline 'הצג' */
</style>
