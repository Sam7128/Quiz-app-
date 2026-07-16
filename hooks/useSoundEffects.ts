import { useCallback, useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import type { BattlePresentationEvent, BattlePresentationEventKind } from '../types/battleTypes';
import { STORAGE_KEYS } from '../services/storage';

const SOUND_PATHS = {
  bgm: '/sounds/bgm_dungeon.mp3',
  attack: '/sounds/attack_fireball.mp3',
} as const;

const SOUND_CUE_PATHS: Partial<Record<BattlePresentationEventKind, string>> = {
  hero_attack: SOUND_PATHS.attack,
};

interface UseSoundEffectsReturn {
  playBgm: () => void;
  stopBgm: () => void;
  playBattleCue: (
    cue: BattlePresentationEventKind,
    eventId?: string,
    element?: BattlePresentationEvent['payload']['element'],
  ) => void;
  isBgmEnabled: boolean;
  isSfxEnabled: boolean;
  toggleBgm: () => void;
  toggleSfx: () => void;
}

let bgmInstance: Howl | null = null;
const sfxInstances = new Map<string, Howl>();

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
    try {
      bgmInstance = new Howl({
        src: [SOUND_PATHS.bgm],
        loop: true,
        volume: 0.3,
        html5: true,
        preload: true,
      });
    } catch (error) {
      console.warn('[SoundEffects] BGM initialization failed; continuing silently.', error);
    }
  }

  const attackPath = SOUND_CUE_PATHS.hero_attack;
  if (attackPath && !sfxInstances.has(attackPath)) {
    try {
      sfxInstances.set(attackPath, new Howl({
        src: [attackPath],
        volume: 0.6,
        preload: true,
      }));
    } catch (error) {
      console.warn('[SoundEffects] SFX initialization failed; continuing silently.', error);
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

  const playBattleCue = useCallback((
    cue: BattlePresentationEventKind,
    eventId?: string,
    element?: BattlePresentationEvent['payload']['element'],
  ): void => {
    if (!isSfxEnabled) return;
    const source = cue === 'skill_cast' && element === 'fire'
      ? SOUND_PATHS.attack
      : SOUND_CUE_PATHS[cue];
    if (!source) return;

    const dedupeKey = eventId ? `${eventId}:${cue}` : null;
    if (dedupeKey && playedEventCuesRef.current.has(dedupeKey)) return;
    if (dedupeKey) {
      playedEventCuesRef.current.add(dedupeKey);
      if (playedEventCuesRef.current.size > 512) {
        const oldest = playedEventCuesRef.current.values().next().value;
        if (typeof oldest === 'string') playedEventCuesRef.current.delete(oldest);
      }
    }

    initSounds();
    const instance = sfxInstances.get(source);
    if (!instance) return;
    try {
      instance.play();
    } catch (error) {
      console.warn(`[SoundEffects] Cue ${cue} failed; continuing silently.`, error);
    }
  }, [isSfxEnabled]);

  const toggleBgm = useCallback(() => setIsBgmEnabled(previous => !previous), []);
  const toggleSfx = useCallback(() => setIsSfxEnabled(previous => !previous), []);

  return {
    playBgm,
    stopBgm,
    playBattleCue,
    isBgmEnabled,
    isSfxEnabled,
    toggleBgm,
    toggleSfx,
  };
}
