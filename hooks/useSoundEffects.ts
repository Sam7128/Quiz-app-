import { useState, useEffect, useCallback, useRef } from 'react';
import { Howl } from 'howler';

// 預設音效路徑 - 請確保這些檔案存在於 public/sounds/
const SOUND_PATHS = {
    BGM_DUNGEON: '/sounds/bgm_dungeon.mp3',
    SFX_ATTACK_FIREBALL: '/sounds/attack_fireball.mp3',
    SFX_CORRECT: '/sounds/correct.mp3',
    SFX_WRONG: '/sounds/wrong.mp3',
};

interface UseSoundEffectsReturn {
    playBgm: () => void;
    stopBgm: () => void;
    playAttackSfx: () => void;
    playCorrectSfx: () => void;
    playWrongSfx: () => void;
    isBgmEnabled: boolean;
    isSfxEnabled: boolean;
    toggleBgm: () => void;
    toggleSfx: () => void;
}

// 使用 Howler.js 直接管理音效，避免 use-sound 的相容性問題
// Howler 對瀏覽器自動播放策略有更完善的處理

// 建立全域單例，避免多次實例化導致記憶體洩漏或重複播放
let bgmInstance: Howl | null = null;
let sfxAttackInstance: Howl | null = null;
let sfxCorrectInstance: Howl | null = null;
let sfxWrongInstance: Howl | null = null;

const initSounds = () => {
    if (!bgmInstance) {
        bgmInstance = new Howl({
            src: [SOUND_PATHS.BGM_DUNGEON],
            loop: true,
            volume: 0.3,
            html5: true, // 使用 HTML5 Audio 以支援長音軌串流
            preload: true,
        });
    }
    if (!sfxAttackInstance) {
        sfxAttackInstance = new Howl({
            src: [SOUND_PATHS.SFX_ATTACK_FIREBALL],
            volume: 0.6,
        });
    }
    if (!sfxCorrectInstance) {
        sfxCorrectInstance = new Howl({
            src: [SOUND_PATHS.SFX_CORRECT],
            volume: 0.5,
        });
    }
    if (!sfxWrongInstance) {
        sfxWrongInstance = new Howl({
            src: [SOUND_PATHS.SFX_WRONG],
            volume: 0.5,
        });
    }
};

export function useSoundEffects(): UseSoundEffectsReturn {
    // 從 localStorage 讀取設定，預設開啟
    const [isBgmEnabled, setIsBgmEnabled] = useState(() => {
        const saved = localStorage.getItem('mindspark_bgm_enabled');
        return saved !== null ? saved === 'true' : true;
    });

    const [isSfxEnabled, setIsSfxEnabled] = useState(() => {
        const saved = localStorage.getItem('mindspark_sfx_enabled');
        return saved !== null ? saved === 'true' : true;
    });

    // 初始化音效
    useEffect(() => {
        initSounds();
    }, []);

    // 保存設定
    useEffect(() => {
        localStorage.setItem('mindspark_bgm_enabled', String(isBgmEnabled));
    }, [isBgmEnabled]);

    useEffect(() => {
        localStorage.setItem('mindspark_sfx_enabled', String(isSfxEnabled));
    }, [isSfxEnabled]);

    const bgmIdRef = useRef<number | null>(null);

    const playBgm = useCallback(() => {
        if (!isBgmEnabled || !bgmInstance) return;

        // 確保不會重複播放
        if (bgmInstance.playing()) return;

        try {
            bgmIdRef.current = bgmInstance.play();
            console.log('[SoundEffects] BGM started playing');
        } catch (e) {
            console.warn('[SoundEffects] BGM play failed:', e);
        }
    }, [isBgmEnabled]);

    const stopBgm = useCallback(() => {
        if (bgmInstance) {
            bgmInstance.stop();
            bgmIdRef.current = null;
            console.log('[SoundEffects] BGM stopped');
        }
    }, []);

    // 當 BGM 開關切換時的即時反應
    useEffect(() => {
        if (!isBgmEnabled) {
            stopBgm();
        }
    }, [isBgmEnabled, stopBgm]);

    const playAttackSfx = useCallback(() => {
        if (isSfxEnabled && sfxAttackInstance) {
            sfxAttackInstance.play();
        }
    }, [isSfxEnabled]);

    const playCorrectSfx = useCallback(() => {
        if (isSfxEnabled && sfxCorrectInstance) {
            sfxCorrectInstance.play();
        }
    }, [isSfxEnabled]);

    const playWrongSfx = useCallback(() => {
        if (isSfxEnabled && sfxWrongInstance) {
            sfxWrongInstance.play();
        }
    }, [isSfxEnabled]);

    const toggleBgm = () => setIsBgmEnabled(prev => !prev);
    const toggleSfx = () => setIsSfxEnabled(prev => !prev);

    return {
        playBgm,
        stopBgm,
        playAttackSfx,
        playCorrectSfx,
        playWrongSfx,
        isBgmEnabled,
        isSfxEnabled,
        toggleBgm,
        toggleSfx,
    };
}
