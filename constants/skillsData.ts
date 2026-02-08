/**
 * 技能資料庫
 * Skills Database
 */

import { Skill, SkillTier, SkillElement } from '../types/battleTypes';

// ==================== 初級技能 (5連) ====================

export const BASIC_SKILLS: Skill[] = [
    {
        id: 'fireball',
        name: '火球術',
        tier: 'basic',
        element: 'fire',
        animationType: 'css',
        assetPath: '/battle/skills/fireball.png',
        duration: 1200,
        description: '基礎的火焰魔法，射出一顆燃燒的火球'
    },
    {
        id: 'ice_arrow',
        name: '冰霜箭',
        tier: 'basic',
        element: 'ice',
        animationType: 'css',
        assetPath: '/battle/skills/ice_arrow.png',
        duration: 1000,
        description: '冰冷的箭矢穿透敵人'
    },
    {
        id: 'thunder_bolt',
        name: '落雷',
        tier: 'basic',
        element: 'lightning',
        animationType: 'css',
        assetPath: '/battle/skills/thunder_bolt.png',
        duration: 800,
        description: '從天而降的雷電'
    },
];

// ==================== 中級技能 (10連) ====================

export const INTERMEDIATE_SKILLS: Skill[] = [
    {
        id: 'flame_storm',
        name: '烈焰風暴',
        tier: 'intermediate',
        element: 'fire',
        animationType: 'css',
        assetPath: '/battle/skills/flame_storm.png',
        duration: 1800,
        description: '召喚熊熊烈焰席捲戰場'
    },
    {
        id: 'ice_barrier',
        name: '冰封結界',
        tier: 'intermediate',
        element: 'ice',
        animationType: 'css',
        assetPath: '/battle/skills/ice_barrier.png',
        duration: 1500,
        description: '極寒的冰霜凍結一切'
    },
    {
        id: 'thunder_hammer',
        name: '雷神之錘',
        tier: 'intermediate',
        element: 'lightning',
        animationType: 'css',
        assetPath: '/battle/skills/thunder_hammer.png',
        duration: 1600,
        description: '巨大的雷錘從天砸下'
    },
];

// ==================== 高級技能 (20連) ====================

export const ADVANCED_SKILLS: Skill[] = [
    {
        id: 'meteor_strike',
        name: '隕石衝擊',
        tier: 'advanced',
        element: 'fire',
        animationType: 'css',
        assetPath: '/battle/skills/meteor_strike.png',
        duration: 2500,
        description: '召喚燃燒的隕石撞擊大地'
    },
    {
        id: 'absolute_zero',
        name: '絕對零度',
        tier: 'advanced',
        element: 'ice',
        animationType: 'css',
        assetPath: '/battle/skills/absolute_zero.png',
        duration: 2200,
        description: '將周圍溫度降至絕對零度'
    },
    {
        id: 'judgment_thunder',
        name: '審判之雷',
        tier: 'advanced',
        element: 'lightning',
        animationType: 'css',
        assetPath: '/battle/skills/judgment_thunder.png',
        duration: 2400,
        description: '神聖的雷電審判一切'
    },
];

// ==================== 終極技能 (30連) ====================

export const ULTIMATE_SKILLS: Skill[] = [
    {
        id: 'void_rift',
        name: '時空裂隙',
        tier: 'ultimate',
        element: 'void',
        animationType: 'video',
        assetPath: '/battle/videos/skill_void.webm',
        duration: 5000,
        description: '撕裂時空，將敵人吸入虛無'
    },
];

// ==================== 史詩技能 (40連) ====================

export const EPIC_SKILLS: Skill[] = [
    {
        id: 'final_judgment',
        name: '終焉審判',
        tier: 'epic',
        element: 'holy',
        animationType: 'video',
        assetPath: '/battle/videos/skill_judgment.webm',
        duration: 6000,
        description: '召喚神聖的審判之力'
    },
];

// ==================== 傳說技能 (50連) ====================

export const LEGENDARY_SKILLS: Skill[] = [
    {
        id: 'apocalypse',
        name: '創世破滅',
        tier: 'legendary',
        element: 'cosmic',
        animationType: 'video',
        assetPath: '/battle/videos/skill_apocalypse.webm',
        duration: 8000,
        description: '宇宙級別的毀滅之力'
    },
];

// ==================== 技能查詢工具 ====================

/** 所有技能合集 */
export const ALL_SKILLS: Skill[] = [
    ...BASIC_SKILLS,
    ...INTERMEDIATE_SKILLS,
    ...ADVANCED_SKILLS,
    ...ULTIMATE_SKILLS,
    ...EPIC_SKILLS,
    ...LEGENDARY_SKILLS,
];

/** 根據等級獲取技能池 */
export function getSkillsByTier(tier: SkillTier): Skill[] {
    switch (tier) {
        case 'basic':
            return BASIC_SKILLS;
        case 'intermediate':
            return INTERMEDIATE_SKILLS;
        case 'advanced':
            return ADVANCED_SKILLS;
        case 'ultimate':
            return ULTIMATE_SKILLS;
        case 'epic':
            return EPIC_SKILLS;
        case 'legendary':
            return LEGENDARY_SKILLS;
        default:
            return [];
    }
}

/** 從技能池中隨機選擇一個技能 */
export function getRandomSkill(tier: SkillTier): Skill | null {
    const skills = getSkillsByTier(tier);
    if (skills.length === 0) return null;

    const index = Math.floor(Math.random() * skills.length);
    return skills[index];
}

/** 根據連擊數獲取應觸發的技能等級 */
export function getSkillTierByStreak(streak: number): SkillTier | null {
    // 大招影片觸發點: 30, 40, 50, 60, 70, 80... (每10題從30開始)
    // 規則: streak >= 30 且 streak 是 10 的倍數
    if (streak >= 30 && streak % 10 === 0) {
        // 循環使用三種大招影片: ultimate(30,60,90...), epic(40,70,100...), legendary(50,80,110...)
        // 計算是第幾個大招觸發點 (1=30, 2=40, 3=50, 4=60, 5=70, 6=80...)
        const videoIndex = (streak - 30) / 10; // 0, 1, 2, 3, 4, 5...
        const cycle = videoIndex % 3; // 循環 0, 1, 2, 0, 1, 2...

        switch (cycle) {
            case 0: return 'ultimate';   // 30, 60, 90...
            case 1: return 'epic';       // 40, 70, 100...
            case 2: return 'legendary';  // 50, 80, 110...
        }
    }

    // 小技能觸發點: 其他5的倍數 (5, 10, 15, 20, 25, 35, 45, 55, 65...)
    // 根據連勝數分級
    if (streak >= 20) return 'advanced';    // 20, 25, 35, 45, 55, 65...
    if (streak >= 10) return 'intermediate'; // 10, 15
    if (streak >= 5) return 'basic';         // 5

    return null;
}

/** 檢查是否剛好達到技能觸發點 */
export function shouldTriggerSkill(streak: number): boolean {
    // 每 5 題連勝觸發一次技能: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50...
    return streak > 0 && streak % 5 === 0;
}
