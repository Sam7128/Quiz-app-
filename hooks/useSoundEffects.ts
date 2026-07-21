import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import type { BattlePresentationEvent, BattleSoundCue } from '../types/battleTypes';
import { getBattleAsset } from '../constants/battleAssetRegistry';
import { STORAGE_KEYS } from '../services/storage';

const ALL_BATTLE_CUES: readonly BattleSoundCue[] = [
  'hit_basic',
  'hit_critical',
  'shield_absorb',
  'monster_defeat',
  'monster_spawn',
  'boss_entrance',
  'skill_fire_cast',
  'skill_fire_impact',
  'skill_ice_cast',
  'skill_ice_impact',
  'skill_lightning_cast',
  'skill_lightning_impact',
];

interface UseSoundEffectsReturn {
  playBgm: () => void;
  stopBgm: () => void;
  playBattleCue: (event: BattlePresentationEvent) => void;
  stopBattleCue: () => void;
  isBgmEnabled: boolean;
  isSfxEnabled: boolean;
  toggleBgm: () => void;
  toggleSfx: () => void;
}

let bgmInstance: Howl | null = null;
const sfxInstances = new Map<BattleSoundCue, Howl>();

export function mapEventToCue(event: BattlePresentationEvent): BattleSoundCue | null {
  const { kind, phase, payload } = event;
  if (kind === 'hero_attack' && phase === 'impact') {
    return payload.isCrit ? 'hit_critical' : 'hit_basic';
  }
  if (kind === 'monster_attack' && phase === 'impact') {
    return (payload.shieldAbsorbed ?? 0) > 0 ? 'shield_absorb' : 'hit_basic';
  }
  if (kind === 'skill_cast') {
    const element = payload.element;
    if (element === 'fire' || element === 'ice' || element === 'lightning') {
      if (phase === 'anticipation') {
        return `skill_${element}_cast` as BattleSoundCue;
      }
      if (phase === 'impact') {
        return `skill_${element}_impact` as BattleSoundCue;
      }
    }
  }
  if (kind === 'monster_defeat' && phase === 'defeat') {
    return 'monster_defeat';
  }
  if (kind === 'monster_spawn' && phase === 'spawn') {
    return 'monster_spawn';
  }
  if (kind === 'boss_entrance' && phase === 'entrance') {
    return 'boss_entrance';
  }
  return null;
}

const readBooleanSetting = (key: string, fallback: boolean): boolean => {
  try {
    const saved = globalThis.localStorage?.getItem(key);
    return saved === null ? fallback : saved === 'true';
  } catch {
    return fallback;
  }
};

const saveBooleanSetting = (key: string, value: boolean): void => {
  try {
    globalThis.localStorage?.setItem(key, String(value));
  } catch {
    // 設定保存失敗不阻塞測驗或戰鬥。
  }
};

const initSounds = (): void => {
  if (!bgmInstance) {
    const bgmAsset = getBattleAsset('bgm-dungeon');
    if (bgmAsset?.src) {
      try {
        bgmInstance = new Howl({
          src: [bgmAsset.src],
          loop: true,
          volume: 0.3,
          html5: true,
          preload: true,
        });
      } catch (error) {
        console.warn('[SoundEffects] BGM initialization failed; continuing silently.', error);
      }
    }
  }

  for (const cue of ALL_BATTLE_CUES) {
    if (!sfxInstances.has(cue)) {
      const asset = getBattleAsset(`cue-${cue}`);
      if (asset?.src) {
        try {
          const howl = new Howl({
            src: [asset.src],
            volume: 0.6,
            preload: true,
            onloaderror: (_id, error) => {
              console.warn(`[SoundEffects] Cue ${cue} load error; continuing silently.`, error);
            },
            onplayerror: (_id, error) => {
              console.warn(`[SoundEffects] Cue ${cue} play error; continuing silently.`, error);
            },
          });
          sfxInstances.set(cue, howl);
        } catch (error) {
          console.warn(`[SoundEffects] SFX initialization failed for ${cue}; continuing silently.`, error);
        }
      }
    }
  }
};

export function useSoundEffects(): UseSoundEffectsReturn {
  const [isBgmEnabled, setIsBgmEnabled] = useState(() => (
    readBooleanSetting(STORAGE_KEYS.BGM_ENABLED, true)
  ));
  const [isSfxEnabled, setIsSfxEnabled] = useState(() => (
    readBooleanSetting(STORAGE_KEYS.SFX_ENABLED, true)
  ));
  const playedEventCuesRef = useRef<Set<string>>(new Set());
  const activeShortCueRef = useRef<{ howl: Howl; soundId: number } | null>(null);

  useEffect(() => {
    initSounds();
  }, []);

  useEffect(() => {
    saveBooleanSetting(STORAGE_KEYS.BGM_ENABLED, isBgmEnabled);
  }, [isBgmEnabled]);

  useEffect(() => {
    saveBooleanSetting(STORAGE_KEYS.SFX_ENABLED, isSfxEnabled);
  }, [isSfxEnabled]);

  const playBgm = useCallback(() => {
    if (!isBgmEnabled) return;
    initSounds();
    if (!bgmInstance || bgmInstance.playing()) return;
    try {
      bgmInstance.play();
    } catch (error) {
      console.warn('[SoundEffects] BGM play failed; continuing silently.', error);
    }
  }, [isBgmEnabled]);

  const stopBgm = useCallback(() => {
    try {
      bgmInstance?.stop();
    } catch (error) {
      console.warn('[SoundEffects] BGM stop failed; continuing silently.', error);
    }
  }, []);

  useEffect(() => {
    if (!isBgmEnabled) stopBgm();
  }, [isBgmEnabled, stopBgm]);

  const stopBattleCue = useCallback(() => {
    if (activeShortCueRef.current) {
      try {
        activeShortCueRef.current.howl.stop(activeShortCueRef.current.soundId);
      } catch (error) {
        console.warn('[SoundEffects] Cue stop failed; continuing silently.', error);
      }
      activeShortCueRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopBattleCue();
    };
  }, [stopBattleCue]);

  const playBattleCue = useCallback((event: BattlePresentationEvent): void => {
    if (!isSfxEnabled) return;
    const cue = mapEventToCue(event);
    if (!cue) return;

    const dedupeKey = `${event.eventId}:${event.phase}:${cue}`;
    if (playedEventCuesRef.current.has(dedupeKey)) return;

    playedEventCuesRef.current.add(dedupeKey);
    if (playedEventCuesRef.current.size > 512) {
      const oldest = playedEventCuesRef.current.values().next().value;
      if (typeof oldest === 'string') playedEventCuesRef.current.delete(oldest);
    }

    initSounds();
    const instance = sfxInstances.get(cue);
    if (!instance) return;

    stopBattleCue();

    try {
      const soundId = instance.play();
      if (typeof soundId === 'number') {
        activeShortCueRef.current = { howl: instance, soundId };
      }
    } catch (error) {
      console.warn(`[SoundEffects] Cue ${cue} play failed; continuing silently.`, error);
    }
  }, [isSfxEnabled, stopBattleCue]);

  const toggleBgm = useCallback(() => setIsBgmEnabled(previous => !previous), []);
  const toggleSfx = useCallback(() => setIsSfxEnabled(previous => !previous), []);

  return {
    playBgm,
    stopBgm,
    playBattleCue,
    stopBattleCue,
    isBgmEnabled,
    isSfxEnabled,
    toggleBgm,
    toggleSfx,
  };
}
