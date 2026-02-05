/**
 * 怪物資料庫
 * Monsters Database
 */

import { Monster, MonsterDifficulty } from '../types/battleTypes';
import {
    MONSTER_ATTACK_DIALOGUES,
    MONSTER_HURT_DIALOGUES,
    MONSTER_DEFEAT_DIALOGUES,
} from './battleDialogues';

// ==================== 普通怪物 ====================

export const NORMAL_MONSTERS: Monster[] = [
    {
        id: 'slime_blue',
        name: '藍色史萊姆',
        difficulty: 'normal',
        imagePath: '/battle/monsters/slime_blue.png',
        hurtImagePath: '/battle/monsters/slime_blue.png',
        attackImagePath: '/battle/monsters/slime_blue.png',
        maxHp: 50,
        attackPower: 10,
        attackDialogues: [
            "啵啵啵～答錯了！",
            "軟軟的也很痛喔！",
            "小看史萊姆的下場！",
            ...MONSTER_ATTACK_DIALOGUES.slice(0, 3),
        ],
        hurtDialogues: [
            "啵...好痛！",
            "我的果凍身體！",
            "不要戳我！",
            ...MONSTER_HURT_DIALOGUES.slice(0, 3),
        ],
        defeatDialogues: [
            "啵...我融化了...",
            "史萊姆也有尊嚴的...",
            ...MONSTER_DEFEAT_DIALOGUES.slice(0, 2),
        ],
    },
    {
        id: 'goblin_green',
        name: '綠皮哥布林',
        difficulty: 'normal',
        imagePath: '/battle/monsters/goblin_green.png',
        hurtImagePath: '/battle/monsters/goblin_green.png',
        attackImagePath: '/battle/monsters/goblin_green.png',
        maxHp: 60,
        attackPower: 12,
        attackDialogues: [
            "嘿嘿嘿！笨蛋人類！",
            "哥布林智商也比你高！",
            "把你的金幣交出來！",
            ...MONSTER_ATTACK_DIALOGUES.slice(3, 6),
        ],
        hurtDialogues: [
            "哎呀！痛痛！",
            "可惡的人類！",
            "我的寶貝！",
            ...MONSTER_HURT_DIALOGUES.slice(3, 6),
        ],
        defeatDialogues: [
            "大王...饒命...",
            "我還會回來的！",
            ...MONSTER_DEFEAT_DIALOGUES.slice(2, 4),
        ],
    },
    {
        id: 'bat_shadow',
        name: '暗影蝙蝠',
        difficulty: 'normal',
        imagePath: '/battle/monsters/bat_shadow.png',
        hurtImagePath: '/battle/monsters/bat_shadow.png',
        attackImagePath: '/battle/monsters/bat_shadow.png',
        maxHp: 40,
        attackPower: 15,
        attackDialogues: [
            "嘶嘶嘶！",
            "黑暗中的獵手！",
            "你看不見我！",
            ...MONSTER_ATTACK_DIALOGUES.slice(6, 9),
        ],
        hurtDialogues: [
            "我的翅膀！",
            "光...好刺眼！",
            "嘶！",
            ...MONSTER_HURT_DIALOGUES.slice(6, 9),
        ],
        defeatDialogues: [
            "光明...太強了...",
            "回歸黑暗...",
            ...MONSTER_DEFEAT_DIALOGUES.slice(4, 6),
        ],
    },
];

// ==================== 精英怪物 ====================

export const ELITE_MONSTERS: Monster[] = [
    {
        id: 'skeleton_warrior',
        name: '骷髏戰士',
        difficulty: 'elite',
        imagePath: '/battle/monsters/skeleton_warrior.png',
        hurtImagePath: '/battle/monsters/skeleton_warrior.png',
        attackImagePath: '/battle/monsters/skeleton_warrior.png',
        maxHp: 100,
        attackPower: 18,
        attackDialogues: [
            "咯咯咯...無知者！",
            "劍與骨的審判！",
            "加入我的亡靈軍團！",
            "生命是多餘的！",
            ...MONSTER_ATTACK_DIALOGUES.slice(0, 4),
        ],
        hurtDialogues: [
            "只是骨頭而已！",
            "這不算什麼！",
            "咯咯！我會重組的！",
            ...MONSTER_HURT_DIALOGUES.slice(0, 4),
        ],
        defeatDialogues: [
            "這副骨架...終於可以休息了...",
            "咯咯...下次再會...",
            ...MONSTER_DEFEAT_DIALOGUES.slice(0, 2),
        ],
    },
    {
        id: 'orc_berserker',
        name: '獸人狂戰士',
        difficulty: 'elite',
        imagePath: '/battle/monsters/orc_berserker.png',
        hurtImagePath: '/battle/monsters/orc_berserker.png',
        attackImagePath: '/battle/monsters/orc_berserker.png',
        maxHp: 120,
        attackPower: 20,
        attackDialogues: [
            "嗚啊啊啊！",
            "力量就是一切！",
            "碾碎你！",
            "獸人永不為奴！",
            ...MONSTER_ATTACK_DIALOGUES.slice(4, 8),
        ],
        hurtDialogues: [
            "這點痛算什麼！",
            "激怒我了！",
            "嗚...！",
            ...MONSTER_HURT_DIALOGUES.slice(4, 8),
        ],
        defeatDialogues: [
            "戰士...永不...投降...",
            "光榮的...死亡...",
            ...MONSTER_DEFEAT_DIALOGUES.slice(2, 4),
        ],
    },
];

// ==================== Boss 怪物 ====================

export const BOSS_MONSTERS: Monster[] = [
    {
        id: 'dragon_fire',
        name: '炎龍・伊格尼斯',
        difficulty: 'boss',
        imagePath: '/battle/monsters/dragon_fire.png',
        hurtImagePath: '/battle/monsters/dragon_fire.png',
        attackImagePath: '/battle/monsters/dragon_fire.png',
        maxHp: 200,
        attackPower: 25,
        attackDialogues: [
            "區區人類，敢挑戰龍族？",
            "吾乃炎之化身！",
            "化為灰燼吧！",
            "千年的智慧，你怎能匹敵？",
            "跪下！",
            "哈哈哈哈！",
        ],
        hurtDialogues: [
            "竟然...傷到我了？",
            "不可能！",
            "區區螻蟻！",
            "有點意思...",
            "認真了！",
        ],
        defeatDialogues: [
            "你是...第一個...打敗我的...人類...",
            "傳說...竟然成真了...",
            "吾認可你...勇者...",
        ],
    },
    {
        id: 'skeleton_wizard',
        name: '骷髏巫師・涅克羅斯',
        difficulty: 'boss',
        imagePath: '/battle/monsters/skeleton_wizard.png',
        hurtImagePath: '/battle/monsters/skeleton_wizard.png',
        attackImagePath: '/battle/monsters/skeleton_wizard.png',
        maxHp: 250,
        attackPower: 22,
        attackDialogues: [
            "感受禁忌魔法的威力！",
            "死亡只是巫術的開端！",
            "靈魂將化為我的魔力！",
            "在我的咒語下戰慄吧！",
            "黑暗奧術降臨！",
        ],
        hurtDialogues: [
            "我的護盾...竟然破了？",
            "這點傷害無法阻止我的法陣！",
            "無用的掙扎，凡人！",
            "看來需要更強大的咒語...",
        ],
        defeatDialogues: [
            "我的魔法...竟然失效了...！",
            "知識終將傳承...在黑暗中...",
            "魔力正在枯竭...",
        ],
    },
];

// ==================== 怪物查詢工具 ====================

/** 所有怪物合集 */
export const ALL_MONSTERS: Monster[] = [
    ...NORMAL_MONSTERS,
    ...ELITE_MONSTERS,
    ...BOSS_MONSTERS,
];

/** 根據難度獲取怪物池 */
export function getMonstersByDifficulty(difficulty: MonsterDifficulty): Monster[] {
    switch (difficulty) {
        case 'normal':
            return NORMAL_MONSTERS;
        case 'elite':
            return ELITE_MONSTERS;
        case 'boss':
            return BOSS_MONSTERS;
        default:
            return NORMAL_MONSTERS;
    }
}

/** 隨機選擇一個怪物 */
export function getRandomMonster(difficulty?: MonsterDifficulty): Monster {
    const pool = difficulty ? getMonstersByDifficulty(difficulty) : ALL_MONSTERS;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
}

/** 根據已擊敗數量選擇適當難度的怪物 */
export function getMonsterByProgress(defeatedCount: number): Monster {
    // 每5隻出現一個精英，每10隻出現一個Boss
    if (defeatedCount > 0 && defeatedCount % 10 === 0) {
        return getRandomMonster('boss');
    }
    if (defeatedCount > 0 && defeatedCount % 5 === 0) {
        return getRandomMonster('elite');
    }
    return getRandomMonster('normal');
}
