/**
 * 戰鬥系統類型定義
 * Quiz Battle Gamification System
 */

// ==================== 技能系統 ====================

/** 技能等級 */
export type SkillTier = 'basic' | 'intermediate' | 'advanced' | 'ultimate' | 'epic' | 'legendary';

/** 技能動畫元素類型 */
type SkillElement = 'fire' | 'ice' | 'lightning' | 'void' | 'holy' | 'cosmic';

/** 技能定義 */
export interface Skill {
  id: string;
  name: string;
  tier: SkillTier;
  element: SkillElement;
  description: string;
}

/** 戰鬥資料 registry */
export interface BattleRegistry {
  monsters: readonly Monster[];
  skills: readonly Skill[];
}

/** 可注入亂數來源 */
export interface BattleRandomSource {
  next: () => number;
}

/** 可注入識別碼產生器 */
export interface BattleIdFactory {
  create: (prefix: string) => string;
}

/** 可注入時鐘 */
export interface BattleClock {
  now: () => number;
}

/** 純引擎 runtime 依賴 */
export interface BattleEngineDependencies {
  rng: BattleRandomSource;
  idFactory: BattleIdFactory;
  clock: BattleClock;
  registry: BattleRegistry;
  heroMaxHp?: number;
  critChance?: number;
  critMultiplier?: number;
  /** Hook 內存冪等集合；不進 durable snapshot */
  processedEventIds?: ReadonlySet<string>;
}

/** 單一待生成遭遇 */
export interface EncounterSchedule {
  nextEncounterKind: MonsterDifficulty | null;
  lastEliteMilestone: number;
  lastBossMilestone: number;
}

/** 可持久化、與 UI 無關的戰鬥進度 */
export interface BattleProgressState {
  schemaVersion: 2;
  battleId: string;
  sessionId: string;
  heroHp: number;
  heroMaxHp: number;
  shield: number;
  currentMonsterId: string | null;
  currentMonsterHp: number;
  currentMonsterMaxHp: number;
  streak: number;
  maxStreak: number;
  questionsAnswered: number;
  monstersDefeated: number;
  seenMonsters: string[];
  encounterSchedule: EncounterSchedule;
  isActive: boolean;
}

/** 已確認答案事件 */
export interface BattleAnswerEvent {
  eventId: string;
  correlationId: string;
  isCorrect: boolean;
  createdAt: number;
}

/** 戰鬥失敗碼 */
type BattleFailureCode =
  | 'MONSTER_UNAVAILABLE'
  | 'INVALID_STATE'
  | 'INVALID_ANSWER'
  | 'PERSISTENCE_UNAVAILABLE';

/** 可復原的 typed failure */
export interface BattleFailure {
  code: BattleFailureCode;
  message: string;
  recoverable: true;
}

/** 呈現事件種類 */
export type BattlePresentationEventKind =
  | 'hero_attack'
  | 'monster_attack'
  | 'skill_cast'
  | 'monster_defeat'
  | 'hero_defeat'
  | 'monster_spawn'
  | 'boss_entrance'
  | 'settle';

/** 呈現 phase */
export type BattlePresentationPhase =
  | 'idle'
  | 'anticipation'
  | 'travel'
  | 'impact'
  | 'hurt'
  | 'defeat'
  | 'entrance'
  | 'spawn'
  | 'settle'
  | 'fallback';

/** 動畫時序設定 */
export interface MotionProfile {
  anticipationMs: number;
  travelMs: number;
  impactMs: number;
  settleMs: number;
  safetyDeadlineMs: number;
  reducedMotionMs: number;
}

/** 呈現事件 payload */
export interface BattlePresentationPayload {
  damage: number;
  baseDamage: number;
  isCrit: boolean;
  multiplier: number;
  shieldAbsorbed: number;
  element?: SkillElement;
  skillId?: string;
  skillName?: string;
  monsterId?: string;
  monsterDifficulty?: MonsterDifficulty;
  fallback?: boolean;
}

/** 單一有序戰鬥呈現事件 */
export interface BattlePresentationEvent {
  eventId: string;
  correlationId: string;
  sequence: number;
  kind: BattlePresentationEventKind;
  actorId: string;
  targetId: string | null;
  phase: BattlePresentationPhase;
  durationProfile: MotionProfile;
  payload: BattlePresentationPayload;
}

/** Presenter 接受的完成訊號；實際去重與推進只由 scheduler 執行。 */
export type PresentationCompletionCause = 'ended' | 'error' | 'timeout' | 'manual';

/** 純轉移輸出 */
export interface BattleTransitionResult {
  nextState: BattleProgressState;
  presentationEvents: BattlePresentationEvent[];
  diagnostics: BattleFailure[];
}

/** 怪物解析結果；不可用時不回傳 undefined */
export interface MonsterResolution {
  monster: Monster | null;
  seenMonsters: string[];
  difficulty: MonsterDifficulty | null;
  failure?: BattleFailure;
}

/** runtime asset 類型 */
export type BattleAssetKind =
  | 'character'
  | 'skillIcon'
  | 'projectile'
  | 'impact'
  | 'background'
  | 'video'
  | 'audio'
  | 'environment';

type BattleAssetAction = 'idle' | 'attack' | 'hurt' | 'defeat' | 'cast' | 'entrance';

export type BattleSoundCue =
  | 'hit_basic'
  | 'hit_critical'
  | 'shield_absorb'
  | 'monster_defeat'
  | 'monster_spawn'
  | 'boss_entrance'
  | 'skill_fire_cast'
  | 'skill_fire_impact'
  | 'skill_ice_cast'
  | 'skill_ice_impact'
  | 'skill_lightning_cast'
  | 'skill_lightning_impact';

export interface BattleAssetEntry {
  id: string;
  src: string;
  kind: BattleAssetKind;
  action?: BattleAssetAction;
  fallbackId: string | null;
  width?: number;
  height?: number;
  anchor?: { x: number; y: number };
  facing?: 'left' | 'right';
  visualScale?: number;
  opaque?: boolean;
}

// ==================== 怪物系統 ====================

/** 怪物難度等級 */
type MonsterDifficulty = 'normal' | 'elite' | 'boss';

/** 怪物定義 */
export interface Monster {
  id: string;
  name: string;
  difficulty: MonsterDifficulty;
  maxHp: number;
  attackPower: number;
  attackDialogues: string[];
  hurtDialogues: string[];
  defeatDialogues: string[];
}

// ==================== 主角系統 ====================

// ==================== 戰鬥狀態 ====================

/** 戰鬥狀態 */
export interface BattleState {
  /** 連續答對次數 */
  streak: number;
  /** 最高連擊記錄 */
  maxStreak: number;
  /** 主角當前血量 */
  heroHp: number;
  /** 主角最大血量 */
  heroMaxHp: number;
  /** 怪物當前血量 */
  monsterHp: number;
  /** 怪物最大血量 */
  monsterMaxHp: number;
  /** 當前怪物 */
  currentMonster: Monster | null;
  /** 已擊敗怪物數量 */
  monstersDefeated: number;
  /** 已作答題數 (用於 Boss 出場判定) */
  questionsAnswered: number;
  /** 已出現過的怪物 (用於重置) */
  seenMonsters: string[];
  /** 戰鬥是否進行中 */
  isActive: boolean;
  /** V2 durable state；舊 caller 可不提供 */
  progress?: BattleProgressState;
  /** 可復原引擎錯誤 */
  failure?: BattleFailure;
}

/** 暴擊判定結果 */
interface CritResult {
  isCrit: boolean;
  multiplier: number;
}

/** 傷害計算結果 */
export interface DamageResult {
  baseDamage: number;
  critResult: CritResult;
  finalDamage: number;
}

/** 引擎傷害輸入 */
export interface BattleDamageInput {
  monster: Monster;
  streak: number;
  skill?: Skill | null;
  critChance?: number;
  critMultiplier?: number;
}

/** 戰鬥狀態初始值 */
export const INITIAL_BATTLE_STATE: BattleState = {
  streak: 0,
  maxStreak: 0,
  heroHp: 100,
  heroMaxHp: 100,
  monsterHp: 100,
  monsterMaxHp: 100,
  currentMonster: null,
  monstersDefeated: 0,
  questionsAnswered: 0,
  seenMonsters: [],
  isActive: false,
};

/**
 * 驗證未知值是否為合法的 BattleState (安全防禦守衛)
 */
export function isBattleState(value: unknown): value is BattleState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.streak === 'number' && Number.isFinite(s.streak) && s.streak >= 0 &&
    typeof s.maxStreak === 'number' && Number.isFinite(s.maxStreak) && s.maxStreak >= 0 &&
    typeof s.heroHp === 'number' && Number.isFinite(s.heroHp) && s.heroHp >= 0 && s.heroHp <= 200 &&
    typeof s.heroMaxHp === 'number' && Number.isFinite(s.heroMaxHp) && s.heroMaxHp > 0 &&
    typeof s.monsterHp === 'number' && Number.isFinite(s.monsterHp) && s.monsterHp >= 0 &&
    typeof s.monsterMaxHp === 'number' && Number.isFinite(s.monsterMaxHp) && s.monsterMaxHp > 0 &&
    typeof s.monstersDefeated === 'number' && Number.isFinite(s.monstersDefeated) && s.monstersDefeated >= 0 &&
    typeof s.questionsAnswered === 'number' && Number.isFinite(s.questionsAnswered) && s.questionsAnswered >= 0 &&
    Array.isArray(s.seenMonsters) && s.seenMonsters.every(id => typeof id === 'string') &&
    typeof s.isActive === 'boolean'
  );
}

// ==================== 戰鬥事件 ====================

// ==================== Hook 回傳類型 ====================

/** useBattleSystem Hook 回傳 */
export interface UseBattleSystemReturn {
  /** 當前戰鬥狀態 */
  battleState: BattleState;
  /** 戰鬥系統狀態是否已初始化完成 (防篡改驗證完畢) */
  isInitialized: boolean;
  /** 觸發答題動作 */
  triggerAnswer: (isCorrect: boolean, answerEventId?: string) => void;
  /** 開始戰鬥 */
  startBattle: () => void;
  /** 結束戰鬥 */
  endBattle: () => void;
  /** 開始新階段時重置戰鬥 */
  resetForNewChunk: () => void;
  /** Presenter 唯一 active event；UI 不再從 BattleState 反推動畫。 */
  activePresentationEvent: BattlePresentationEvent | null;
  /** 將媒體／動畫訊號交回 presenter 的 event-ID gate。 */
  completePresentationEvent: (
    eventId: string,
    cause: PresentationCompletionCause,
  ) => boolean;
}

/** 進度持久化資料結構 */
export interface SavedQuizProgress {
  bankIds: string[];
  questionIds: string[];
  currentIndex: number;
  score: number;
  wrongQuestionIds: string[];
  savedAt: number;
}

type PracticeChunkStatus = 'pending' | 'in_progress' | 'completed';

export interface PracticeChunk {
  index: number;
  questionIds: string[];
  status: PracticeChunkStatus;
  score: number;
  totalQuestions: number;
  wrongQuestionIds: string[];
  startedAt?: number;
  completedAt?: number;
}

export interface ChunkedPracticeSession {
  id: string;
  userId?: string;
  bankIds: string[];
  bankNames: string[];
  bankQuestionMap: Record<string, string[]>;
  chunkSize: number;
  questionIds: string[];
  chunks: PracticeChunk[];
  status: 'active' | 'completed' | 'abandoned';
  createdAt: number;
  updatedAt: number;
  dirty?: boolean;
  retryCount?: number;
  lastSyncError?: string;
}

export interface ChunkMeta {
  chunkIndex: number;
  totalChunks: number;
  sessionId: string;
}

export interface ChunkDraftState {
  sessionId: string;
  chunkIndex: number;
  currentQuestionIndex: number;
  score: number;
  wrongQuestionIds: string[];
  updatedAt: number;
}
// ==================== 用戶設定 ====================

export interface UserSettings {
  restBreakInterval: number; // 0 = 關閉, 任意正整數 = 間隔
  betaFeatures?: {
    knowledgeGraph: boolean;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  restBreakInterval: 20
};

// ==================== 錯題回顧 ====================

export interface MistakeDetail {
  questionId: string;
  questionText: string;
  options: string[];
  userAnswer: string | string[];
  correctAnswer: string | string[];
}

export interface RecentMistakeSession {
  sessionId: string;
  timestamp: number;
  bankNames: string[];
  mistakes: MistakeDetail[];
}
