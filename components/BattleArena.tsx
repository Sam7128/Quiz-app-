import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Flame, Layers, Skull, Trophy, Zap } from 'lucide-react';
import {
  BattleAssetEntry,
  BattlePresentationEvent,
  BattleProgressState,
  BattleState,
  Monster,
  PresentationCompletionCause,
} from '../types/battleTypes';
import { getBattleAsset, getBattleCharacterAsset } from '../constants/battleAssetRegistry';
import { ALL_MONSTERS } from '../constants/monstersData';
import { BattleSkillOverlay } from './BattleSkillOverlay';
import { DialogueBubble } from './DialogueBubble';
import { useSoundEffects } from '../hooks/useSoundEffects';

export interface BattleArenaProps {
  battleState: BattleState;
  activeEvent: BattlePresentationEvent | null;
  onPresentationComplete: (
    eventId: string,
    cause: PresentationCompletionCause,
  ) => void;
}

const CHARACTER_HURT_ANIMATION = {
  x: [0, -10, 10, -5, 5, 0],
  opacity: [1, 0.5, 1],
};

const HERO_ATTACK_ANIMATION = {
  x: [0, 30, 0],
  scale: [1, 1.1, 1],
};

const MONSTER_ATTACK_ANIMATION = {
  x: [0, -30, 0],
  scale: [1, 1.1, 1],
};

const CHARACTER_DEFEAT_ANIMATION = {
  opacity: 0,
  y: 24,
  scale: 0.8,
};

const CHARACTER_ANTICIPATION_ANIMATION = {
  scale: [1, 1.06, 1],
};

const reportedImageErrors = new Set<string>();

const VICTORY_ANIMATION = {
  scale: [0, 1],
  opacity: [0, 1],
};

const getNextMonsterForPreload = (
  progress: BattleProgressState | undefined,
  monsters: readonly Monster[],
): Monster | null => {
  const difficulty = progress?.encounterSchedule.nextEncounterKind;
  if (!difficulty) return null;
  const unseen = monsters.find(
    (monster) => monster.difficulty === difficulty && !progress.seenMonsters.includes(monster.id),
  );
  return unseen ?? monsters.find((monster) => monster.difficulty === difficulty) ?? null;
};

const getDialogue = (
  event: BattlePresentationEvent | null,
  monster: Monster,
): { speaker: 'hero' | 'monster'; text: string } | null => {
  if (!event) return null;
  const lines = event.kind === 'monster_attack'
    ? monster.attackDialogues
    : event.kind === 'monster_defeat'
      ? monster.defeatDialogues
      : event.kind === 'hero_attack' || event.kind === 'skill_cast'
        ? monster.hurtDialogues
        : [];
  const text = lines[0];
  return text ? { speaker: 'monster', text } : null;
};

interface AttackCoordinates {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

const BattleAttackEffect: React.FC<{
  event: BattlePresentationEvent;
  coordinates: AttackCoordinates;
  reducedMotion: boolean;
}> = ({ event, coordinates, reducedMotion }) => {
  const reverse = event.kind === 'monster_attack';
  const startX = reverse ? coordinates.targetX : coordinates.startX;
  const startY = reverse ? coordinates.targetY : coordinates.startY;
  const targetX = reverse ? coordinates.startX : coordinates.targetX;
  const targetY = reverse ? coordinates.startY : coordinates.targetY;

  return (
    <div aria-hidden="true" className="absolute inset-0 z-30 pointer-events-none">
      <motion.div
        className={`absolute h-8 w-8 rounded-full ${reverse ? 'bg-red-400' : 'bg-orange-400'} shadow-[0_0_22px_rgba(251,146,60,0.9)]`}
        initial={{ x: startX, y: startY, opacity: 0, scale: reducedMotion ? 0.8 : 0.45 }}
        animate={{ x: targetX, y: targetY, opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 0.8] }}
        transition={{ duration: reducedMotion ? 0.08 : 0.45, ease: 'easeOut' }}
      />
      <motion.div
        className={`absolute text-2xl font-black ${event.payload.isCrit ? 'text-yellow-300' : 'text-white'} drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
        style={{ left: targetX, top: targetY }}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 1, 0], y: reducedMotion ? -8 : -34 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.7 }}
      >
        {event.payload.isCrit ? '暴擊 ' : ''}{event.payload.damage}
      </motion.div>
      {event.payload.shieldAbsorbed > 0 && (
        <div
          className="absolute rounded bg-cyan-950/80 px-2 py-1 text-xs font-bold text-cyan-200"
          style={{ left: targetX, top: targetY + 30 }}
        >
          護盾吸收 {event.payload.shieldAbsorbed}
        </div>
      )}
    </div>
  );
};

const HealthBar: React.FC<{
  current: number;
  max: number;
  isHero?: boolean;
  label: string;
}> = ({ current, max, isHero = false, label }) => {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeCurrent = Math.min(Math.max(Number.isFinite(current) ? current : 0, 0), safeMax);
  const percentage = (safeCurrent / safeMax) * 100;
  const barColor = percentage > 50
    ? 'bg-gradient-to-r from-green-400 to-green-500'
    : percentage > 25
      ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
      : 'bg-gradient-to-r from-red-500 to-red-600';

  return (
    <div
      className={`w-full ${isHero ? 'max-w-[140px]' : 'max-w-[160px]'}`}
      role="group"
      aria-label={`${label} ${Math.round(safeCurrent)}/${Math.round(safeMax)}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
        <span className="text-xs font-mono text-slate-500">
          {Math.round(safeCurrent)}/{Math.round(safeMax)}
        </span>
      </div>
      <div
        className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(safeMax)}
        aria-valuenow={Math.round(safeCurrent)}
      >
        <motion.div
          className={`h-full ${barColor} rounded-full`}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

const StreakCounter: React.FC<{ streak: number; maxStreak: number }> = ({ streak, maxStreak }) => {
  const reducedMotion = useReducedMotion() ?? false;
  const isHot = streak >= 5;
  const isOnFire = streak >= 10;
  const isLegendary = streak >= 20;
  const className = isLegendary
    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white shadow-lg shadow-purple-500/30'
    : isOnFire
      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
      : isHot
        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

  return (
    <motion.div
      className={`relative px-4 py-2 rounded-xl font-bold text-center ${className}`}
      animate={!reducedMotion && isHot ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: !reducedMotion && isHot ? Infinity : 0, repeatDelay: 1 }}
    >
      <div className="flex items-center gap-2">
        {isOnFire && <Flame aria-hidden="true" className="w-4 h-4" />}
        <span className="text-lg">🔥 {streak}</span>
        {isOnFire && <Flame aria-hidden="true" className="w-4 h-4" />}
      </div>
      <div className="text-[10px] opacity-75">最高: {maxStreak}</div>
    </motion.div>
  );
};

const CharacterSprite: React.FC<{
  assetId: string;
  name: string;
  badge?: string;
  action: NonNullable<BattleAssetEntry['action']>;
  isHero?: boolean;
  reducedMotion: boolean;
  forwardRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  assetId,
  name,
  badge,
  action,
  isHero = false,
  reducedMotion,
  forwardRef,
  className,
  style,
}) => {
  const asset = getBattleCharacterAsset(assetId, action);
  const [source, setSource] = useState(asset?.src ?? '');
  const [imageError, setImageError] = useState(asset === null);

  useEffect(() => {
    setSource(asset?.src ?? '');
    setImageError(asset === null);
  }, [asset]);

  const handleImageError = (): void => {
    if (import.meta.env.DEV && !reportedImageErrors.has(source)) {
      reportedImageErrors.add(source);
      console.info(`[BattleAssets] Failed to decode ${source}; applying local fallback.`);
    }
    const fallback = asset?.fallbackId ? getBattleAsset(asset.fallbackId) : null;
    if (fallback && fallback.src !== source) {
      setSource(fallback.src);
      return;
    }
    setImageError(true);
  };

  const animate = reducedMotion
    ? {}
    : action === 'defeat'
      ? CHARACTER_DEFEAT_ANIMATION
      : action === 'hurt'
      ? CHARACTER_HURT_ANIMATION
      : action === 'anticipate'
        ? CHARACTER_ANTICIPATION_ANIMATION
        : action === 'attack' || action === 'cast'
        ? (isHero ? HERO_ATTACK_ANIMATION : MONSTER_ATTACK_ANIMATION)
        : {};
  const isHurt = action === 'hurt';
  const isAttacking = action === 'attack' || action === 'cast';

  return (
    <motion.div
      ref={forwardRef}
      className={`relative ${className ?? ''}`}
      style={style}
      animate={animate}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="w-24 h-32 md:w-32 md:h-40 relative">
        {imageError ? (
          <div
            className="w-full h-full rounded-lg bg-slate-700/80 text-slate-200 flex items-center justify-center text-4xl font-black"
            role="img"
            aria-label={name}
          >
            ?
          </div>
        ) : (
          <img
            src={source}
            alt={name}
            className={`w-full h-full object-contain drop-shadow-lg transition-all duration-300 ${isAttacking && !isHero ? 'brightness-125 saturate-150' : ''}`}
            onError={handleImageError}
          />
        )}

        {isHurt && !reducedMotion && (
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-red-500/30 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.3 }}
          />
        )}

        {isAttacking && !isHero && !reducedMotion && (
          <motion.div
            aria-hidden="true"
            className="absolute -left-4 top-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0], x: [0, -40, -60] }}
            transition={{ duration: 0.4 }}
          >
            <Zap className="w-8 h-8 text-yellow-400" />
          </motion.div>
        )}
      </div>

      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap min-w-[60px] text-center shadow-md z-10 ${isHero ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
        {name}{badge ? ` · ${badge}` : ''}
      </div>
    </motion.div>
  );
};

const DefeatCounter: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
    <Skull aria-hidden="true" className="w-4 h-4" />
    <span>已擊敗: {count}</span>
  </div>
);

export const BattleArena: React.FC<BattleArenaProps> = ({
  battleState,
  activeEvent,
  onPresentationComplete,
}) => {
  const reducedMotion = useReducedMotion() ?? false;
  const {
    streak,
    maxStreak,
    heroHp,
    heroMaxHp,
    monsterHp: durableMonsterHp,
    monsterMaxHp: durableMonsterMaxHp,
    currentMonster: durableMonster,
    monstersDefeated,
  } = battleState;
  const currentEvent = activeEvent;
  const eventMonster = currentEvent?.payload.monsterId
    ? ALL_MONSTERS.find(monster => monster.id === currentEvent.payload.monsterId) ?? null
    : null;
  const currentMonster = eventMonster ?? durableMonster;
  const isPreviousMonsterEvent = Boolean(
    eventMonster && durableMonster && eventMonster.id !== durableMonster.id,
  );
  const monsterHp = isPreviousMonsterEvent ? 0 : durableMonsterHp;
  const monsterMaxHp = isPreviousMonsterEvent ? eventMonster?.maxHp ?? 1 : durableMonsterMaxHp;
  const currentEventId = currentEvent?.eventId ?? null;
  const currentEventKind = currentEvent?.kind ?? null;
  const currentPhase = currentEvent?.phase ?? 'idle';
  const currentEventElement = currentEvent?.payload.element;
  const nextMonster = getNextMonsterForPreload(battleState.progress, ALL_MONSTERS);
  const nextMonsterAsset = nextMonster ? getBattleAsset(nextMonster.id) : null;
  const { playBgm, playBattleCue, stopBgm } = useSoundEffects();
  const arenaRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const monsterRef = useRef<HTMLDivElement>(null);
  const latestAttackCoordinatesRef = useRef<AttackCoordinates | null>(null);
  const [attackCoordinates, setAttackCoordinates] = useState<AttackCoordinates | null>(null);
  const backgroundAsset = getBattleAsset('dungeon-background');

  const isAnticipationOrTravel = currentPhase === 'anticipation' || currentPhase === 'travel';
  const isImpactOrHurt = currentPhase === 'impact' || currentPhase === 'hurt';
  const isHeroAttacking = (currentEventKind === 'hero_attack' || currentEventKind === 'skill_cast')
    && isAnticipationOrTravel;
  const isHeroHurt = currentEventKind === 'monster_attack' && isImpactOrHurt;
  const isMonsterAttacking = currentEventKind === 'monster_attack' && isAnticipationOrTravel;
  const isMonsterHurt = (currentEventKind === 'hero_attack' || currentEventKind === 'skill_cast')
    && isImpactOrHurt;
  const isSkillCasting = currentEventKind === 'skill_cast';
  const isStageTransition = currentEventKind === 'monster_spawn' || currentEventKind === 'boss_entrance';
  const isBossEntrance = currentEventKind === 'boss_entrance';
  const isAttackEvent = (
    currentEventKind === 'hero_attack' || currentEventKind === 'monster_attack'
  ) && currentPhase === 'travel';
  const heroAction: NonNullable<BattleAssetEntry['action']> =
    currentEventKind === 'hero_defeat' && currentPhase === 'defeat'
      ? 'defeat'
      : isHeroHurt
        ? 'hurt'
        : (currentEventKind === 'hero_attack' || currentEventKind === 'skill_cast')
          && currentPhase === 'anticipation'
          ? 'anticipate'
          : currentEventKind === 'skill_cast' && currentPhase === 'travel'
            ? 'cast'
            : isHeroAttacking
              ? 'attack'
              : 'idle';
  const monsterAction: NonNullable<BattleAssetEntry['action']> =
    currentEventKind === 'monster_defeat' && currentPhase === 'defeat'
      ? 'defeat'
      : isMonsterHurt
        ? 'hurt'
        : currentEventKind === 'monster_attack' && currentPhase === 'anticipation'
          ? 'anticipate'
          : isMonsterAttacking
            ? 'attack'
            : 'idle';

  const readAttackAnchors = useCallback((): AttackCoordinates | null => {
    const arena = arenaRef.current;
    const hero = heroRef.current;
    const monster = monsterRef.current;
    if (!arena || !hero || !monster) return null;
    const arenaRect = arena.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const monsterRect = monster.getBoundingClientRect();
    return {
      startX: heroRect.left - arenaRect.left + heroRect.width / 2,
      startY: heroRect.top - arenaRect.top + heroRect.height / 3,
      targetX: monsterRect.left - arenaRect.left + monsterRect.width / 2,
      targetY: monsterRect.top - arenaRect.top + monsterRect.height / 2,
    };
  }, []);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !arenaRef.current) return undefined;
    const updateLatestCoordinates = (): void => {
      latestAttackCoordinatesRef.current = readAttackAnchors();
    };
    updateLatestCoordinates();
    const observer = new ResizeObserver(updateLatestCoordinates);
    observer.observe(arenaRef.current);
    return () => observer.disconnect();
  }, [readAttackAnchors]);

  useEffect(() => {
    if (!isAttackEvent) {
      setAttackCoordinates(null);
      return;
    }
    const snapshot = readAttackAnchors() ?? latestAttackCoordinatesRef.current;
    setAttackCoordinates(snapshot);
  }, [currentEventId, isAttackEvent, readAttackAnchors]);

  useEffect(() => {
    playBgm();
    return () => stopBgm();
  }, [playBgm, stopBgm]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibility = (): void => {
      if (document.visibilityState === 'hidden') stopBgm();
      else playBgm();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [playBgm, stopBgm]);

  useEffect(() => {
    if (!currentEventId || !currentEventKind) return;
    playBattleCue(currentEventKind, currentEventId, currentEventElement);
  }, [currentEventElement, currentEventId, currentEventKind, playBattleCue]);

  useEffect(() => {
    if (currentEvent || !nextMonsterAsset) return undefined;
    const image = new Image();
    image.src = nextMonsterAsset.src;
    void image.decode?.().catch(() => undefined);
    return () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [currentEvent, nextMonsterAsset]);

  if (!currentMonster) {
    return battleState.isActive || battleState.failure ? (
      <div
        className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-950/80 p-4 text-amber-100"
        role="status"
      >
        戰鬥暫時無法使用；測驗流程仍可繼續。
      </div>
    ) : null;
  }

  const currentDialogue = getDialogue(currentEvent, currentMonster);
  const currentMonsterAsset = getBattleAsset(currentMonster.id);
  const difficultyLabel = currentMonster.difficulty === 'boss'
    ? 'BOSS'
    : currentMonster.difficulty === 'elite'
      ? '菁英'
      : '一般';

  const liveText = currentEvent
    ? currentEvent.kind === 'monster_attack'
      ? `怪物造成 ${currentEvent.payload.damage} 點傷害${currentEvent.payload.shieldAbsorbed > 0 ? `，護盾吸收 ${currentEvent.payload.shieldAbsorbed} 點` : ''}`
      : currentEvent.kind === 'hero_attack' || currentEvent.kind === 'skill_cast'
        ? `造成 ${currentEvent.payload.damage} 點${currentEvent.payload.isCrit ? '暴擊' : ''}傷害`
        : currentDialogue?.text ?? ''
    : currentDialogue?.text ?? '';
  const backgroundStyle = backgroundAsset ? { backgroundImage: `url(${backgroundAsset.src})` } : undefined;

  return (
    <div className="relative w-full mb-6" data-battle-phase={currentEvent?.phase ?? 'idle'}>
      <div
        ref={arenaRef}
        className="relative rounded-2xl p-4 md:p-6 overflow-hidden shadow-2xl border-4 border-slate-700 bg-gradient-to-b from-slate-950 via-purple-950 to-black bg-cover bg-center"
        style={backgroundStyle}
        onClick={playBgm}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-10 left-10 w-32 h-32 bg-orange-600/10 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute top-10 right-10 w-32 h-32 bg-orange-600/10 rounded-full blur-[60px] animate-pulse" />
          <div className="absolute bottom-0 w-full h-40 bg-purple-900/20 blur-3xl" />
        </div>

        <div className="relative flex justify-between items-start mb-4">
          <DefeatCounter count={monstersDefeated} />
          <StreakCounter streak={streak} maxStreak={maxStreak} />
        </div>

        <div className="relative flex justify-between items-end min-h-[160px] md:min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <AnimatePresence>
              {currentDialogue?.speaker === 'hero' && (
                <DialogueBubble text={currentDialogue.text} position="left" />
              )}
            </AnimatePresence>
            <CharacterSprite
              assetId="hero"
              name="勇者"
              action={heroAction}
              isHero
              reducedMotion={reducedMotion}
              forwardRef={heroRef}
            />
            <HealthBar current={heroHp} max={heroMaxHp} isHero label="英雄 HP" />
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <motion.div
              className="text-2xl font-black text-slate-300 dark:text-slate-600"
              animate={!reducedMotion && (isHeroAttacking || isMonsterAttacking) ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              ⚔️
            </motion.div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <AnimatePresence>
              {currentDialogue?.speaker === 'monster' && (
                <DialogueBubble text={currentDialogue.text} position="right" />
              )}
            </AnimatePresence>
            <CharacterSprite
              assetId={currentMonster.id}
              name={currentMonster.name}
              badge={difficultyLabel}
              action={monsterAction}
              reducedMotion={reducedMotion}
              forwardRef={monsterRef}
              className="origin-bottom"
              style={{ transform: `scale(${currentMonsterAsset?.visualScale ?? 1})` }}
            />
            <HealthBar current={monsterHp} max={monsterMaxHp} label="怪物 HP" />
          </div>
        </div>

        {isAttackEvent && currentEvent && attackCoordinates && (
          <BattleAttackEffect
            event={currentEvent}
            coordinates={attackCoordinates}
            reducedMotion={reducedMotion}
          />
        )}

        <AnimatePresence>
          {isSkillCasting && currentEvent && (
            <BattleSkillOverlay
              event={currentEvent}
              reducedMotion={reducedMotion}
              onComplete={onPresentationComplete}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {monsterHp <= 0 && (
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0 }}
                animate={reducedMotion ? { scale: 1 } : VICTORY_ANIMATION}
                transition={{ type: 'spring', bounce: 0.5 }}
              >
                <Trophy className="w-12 h-12 text-yellow-400" />
                <span className="text-xl font-bold text-white">勝利！</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {heroHp <= 0 && (
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center bg-red-900/50 backdrop-blur-sm rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center gap-2">
                <Skull className="w-12 h-12 text-slate-300" />
                <span className="text-xl font-bold text-white">再接再厲！</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isStageTransition && (
            <motion.div
              aria-hidden="true"
              className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none ${isBossEntrance ? 'bg-red-950' : 'bg-black'}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeInOut' }}
            >
              <div className="flex flex-col items-center gap-4">
                {isBossEntrance
                  ? <Skull className="w-16 h-16 text-red-400" />
                  : <Layers className="w-16 h-16 text-purple-500" />}
                <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                  {isBossEntrance ? `BOSS 來襲：${currentMonster.name}` : '前往下一層...'}
                </h3>
                <div className="text-sm text-slate-400 font-mono">DEPTH: {monstersDefeated + 1}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sr-only" aria-live="polite" aria-atomic="true">{liveText}</div>
      </div>
    </div>
  );
};
