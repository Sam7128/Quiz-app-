/**
 * 戰鬥系統類型定義
 * Quiz Battle Gamification System
 */

// ==================== 技能系統 ====================

/** 技能等級 */
export type SkillTier = 'basic' | 'intermediate' | 'advanced' | 'ultimate' | 'epic' | 'legendary';

/** 技能動畫類型 */
export type SkillAnimationType = 'css' | 'lottie' | 'sequence' | 'video';

/** 技能動畫元素類型 */
export type SkillElement = 'fire' | 'ice' | 'lightning' | 'void' | 'holy' | 'cosmic';

/** 技能定義 */
export interface Skill {
  id: string;
  name: string;
  tier: SkillTier;
  element: SkillElement;
  animationType: SkillAnimationType;
  assetPath: string;
  duration: number; // milliseconds
  description: string;
}

/** 技能觸發閾值配置 */
export interface SkillThreshold {
  tier: SkillTier;
  requiredStreak: number;
}

/** 預設技能觸發閾值 */
export const SKILL_THRESHOLDS: SkillThreshold[] = [
  { tier: 'basic', requiredStreak: 5 },
  { tier: 'intermediate', requiredStreak: 10 },
  { tier: 'advanced', requiredStreak: 20 },
  { tier: 'ultimate', requiredStreak: 30 },
  { tier: 'epic', requiredStreak: 40 },
  { tier: 'legendary', requiredStreak: 50 },
];

// ==================== 怪物系統 ====================

/** 怪物難度等級 */
export type MonsterDifficulty = 'normal' | 'elite' | 'boss';

/** 怪物定義 */
export interface Monster {
  id: string;
  name: string;
  difficulty: MonsterDifficulty;
  imagePath: string;
  hurtImagePath: string;
  attackImagePath: string;
  maxHp: number;
  attackPower: number;
  attackDialogues: string[];
  hurtDialogues: string[];
  defeatDialogues: string[];
  visualScale?: number;
}

// ==================== 主角系統 ====================

/** 主角狀態 */
export interface Hero {
  name: string;
  imagePath: string;
  attackImagePath: string;
  hurtImagePath: string;
  maxHp: number;
  currentHp: number;
  attackDialogues: string[];
  hurtDialogues: string[];
  victoryDialogues: string[];
  skillDialogues: Record<SkillTier, string[]>;
}

// ==================== 戰鬥狀態 ====================

/** 戰鬥動作類型 */
export type BattleActionType =
  | 'idle'
  | 'hero_attack'
  | 'hero_hurt'
  | 'monster_attack'
  | 'monster_hurt'
  | 'skill_cast'
  | 'victory'
  | 'defeat'
  | 'stage_transition';

/** 當前進行中的動畫 */
export interface ActiveAnimation {
  type: BattleActionType;
  skill?: Skill;
  dialogue?: string;
  startTime: number;
  duration: number;
}

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
  /** 剩餘怪物池 (用於不重複隨機) */
  monsterPool: string[];
  /** 已出現過的怪物 (用於重置) */
  seenMonsters: string[];
  /** 待觸發的技能 */
  pendingSkill: Skill | null;
  /** 當前動畫 */
  currentAnimation: ActiveAnimation | null;
  /** 上一個動作 */
  lastAction: BattleActionType;
  /** 戰鬥是否進行中 */
  isActive: boolean;
  /** 當前對話氣泡內容 */
  currentDialogue: {
    speaker: 'hero' | 'monster';
    text: string;
  } | null;
  /** 上一次造成的傷害 (用於 UI 顯示) */
  lastDamage: number;
  /** 上一次攻擊是否暴擊 */
  isLastHitCrit: boolean;
}

/** 暴擊判定結果 */
export interface CritResult {
  isCrit: boolean;
  multiplier: number;
}

/** 傷害計算結果 */
export interface DamageResult {
  baseDamage: number;
  critResult: CritResult;
  finalDamage: number;
  shieldAbsorbed?: number;
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
  monsterPool: [],
  seenMonsters: [],
  pendingSkill: null,
  currentAnimation: null,
  lastAction: 'idle',
  isActive: false,
  currentDialogue: null,
  lastDamage: 0,
  isLastHitCrit: false,
};

// ==================== 戰鬥事件 ====================

/** 戰鬥事件類型 */
export type BattleEvent =
  | { type: 'START_BATTLE'; monster: Monster }
  | { type: 'ANSWER_CORRECT' }
  | { type: 'ANSWER_WRONG' }
  | { type: 'TRIGGER_SKILL'; skill: Skill }
  | { type: 'ANIMATION_COMPLETE' }
  | { type: 'MONSTER_DEFEATED' }
  | { type: 'HERO_DEFEATED' }
  | { type: 'SPAWN_NEW_MONSTER' }
  | { type: 'END_BATTLE' };

// ==================== Hook 回傳類型 ====================

/** useBattleSystem Hook 回傳 */
export interface UseBattleSystemReturn {
  /** 當前戰鬥狀態 */
  battleState: BattleState;
  /** 觸發答題動作 */
  triggerAnswer: (isCorrect: boolean) => void;
  /** 開始戰鬥 */
  startBattle: () => void;
  /** 結束戰鬥 */
  endBattle: () => void;
  /** 動畫完成回調 */
  onAnimationComplete: () => void;
  /** 檢查是否有技能待觸發 */
  hasPendingSkill: boolean;
  /** 當前連擊達到的技能等級 */
  currentSkillTier: SkillTier | null;
}

/** 進度持久化資料結構 */
export interface SavedQuizProgress {
  bankIds: string[];
  questionIds: string[];
  currentIndex: number;
  score: number;
  wrongQuestionIds: string[];
  battleState?: Partial<BattleState>;
  savedAt: number;
}
// ==================== 用戶設定 ====================

export interface UserSettings {
  restBreakInterval: number; // 0 = 關閉, 任意正整數 = 間隔
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
