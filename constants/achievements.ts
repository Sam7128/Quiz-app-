export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}

export const IMPLEMENTED_ACHIEVEMENT_IDS = new Set<string>([
  'perfect_score',
  'first_question',
  'night_owl',
  'early_bird'
]);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_question',
    title: '初次嘗試',
    description: '完成第一題',
    icon: '🎯',
    condition: 'complete_1'
  },
  {
    id: 'ten_questions',
    title: '小試身手',
    description: '累計完成 10 題',
    icon: '📝',
    condition: 'complete_10'
  },
  {
    id: 'hundred_questions',
    title: '學習達人',
    description: '累計完成 100 題',
    icon: '📚',
    condition: 'complete_100'
  },
  {
    id: 'perfect_score',
    title: '完美答題',
    description: '單次測驗 100% 正確率',
    icon: '💯',
    condition: 'perfect_session'
  },
  {
    id: 'streak_3',
    title: '持之以恆',
    description: '連續學習 3 天',
    icon: '🔥',
    condition: 'streak_3'
  },
  {
    id: 'streak_7',
    title: '一週挑戰',
    description: '連續學習 7 天',
    icon: '🌟',
    condition: 'streak_7'
  },
  {
    id: 'streak_30',
    title: '學習習慣',
    description: '連續學習 30 天',
    icon: '👑',
    condition: 'streak_30'
  },
  {
    id: 'mistake_master',
    title: '錯題終結者',
    description: '複習並答對 10 道錯題',
    icon: '🐛',
    condition: 'mistake_review_10'
  },
  {
    id: 'focus_master',
    title: '專注大師',
    description: '使用專注計時器完成 5 個時段',
    icon: '🍅',
    condition: 'focus_5'
  },
  {
    id: 'night_owl',
    title: '夜貓子',
    description: '在晚上 10 點後學習',
    icon: '🦉',
    condition: 'night_study'
  },
  {
    id: 'early_bird',
    title: '早起的鳥兒',
    description: '在早上 6 點前學習',
    icon: '🐦',
    condition: 'morning_study'
  },
  {
    id: 'bank_creator',
    title: '題庫建立者',
    description: '建立 3 個題庫',
    icon: '📁',
    condition: 'create_3_banks'
  },
  // 新增戰鬥成就
  {
    id: 'first_boss_kill',
    title: '屠龍者',
    description: '首次擊敗 Boss 級怪物',
    icon: '🐉',
    condition: 'boss_kill_1'
  },
  {
    id: 'defeat_5_monsters',
    title: '怪物獵人',
    description: '連續擊敗 5 隻怪物',
    icon: '⚔️',
    condition: 'monster_kill_5'
  },
  {
    id: 'perfect_session_10',
    title: '十全十美',
    description: '單次測驗連續答對 10 題',
    icon: '🔟',
    condition: 'perfect_10'
  },
  {
    id: 'perfect_session_20',
    title: '登峰造極',
    description: '單次測驗連續答對 20 題',
    icon: '🏆',
    condition: 'perfect_20'
  },
  {
    id: 'trigger_5_skills',
    title: '元素掌控者',
    description: '單場戰鬥觸發 5 次技能',
    icon: '⚡',
    condition: 'skill_5'
  },
  {
    id: 'trigger_legendary',
    title: '傳說降臨',
    description: '觸發傳說級技能 (50連擊)',
    icon: '🌈',
    condition: 'skill_legendary'
  },
  {
    id: 'complete_500',
    title: '博學多聞',
    description: '累計完成 500 題',
    icon: '📖',
    condition: 'total_500'
  },
  {
    id: 'complete_1000',
    title: '知識淵博',
    description: '累計完成 1000 題',
    icon: '🎓',
    condition: 'total_1000'
  },
  {
    id: 'weekend_warrior',
    title: '週末戰士',
    description: '在週末進行學習',
    icon: '🏖️',
    condition: 'study_weekend'
  },
  {
    id: 'streak_14',
    title: '雙週挑戰',
    description: '連續學習 14 天',
    icon: '📅',
    condition: 'streak_14'
  },
  {
    id: 'first_crit',
    title: '會心一擊',
    description: '首次觸發暴擊傷害',
    icon: '💥',
    condition: 'crit_1'
  },
  {
    id: 'crit_master',
    title: '暴擊大師',
    description: '累計觸發 50 次暴擊',
    icon: '🎯',
    condition: 'crit_50'
  },
  {
    id: 'zero_mistakes',
    title: '零誤答',
    description: '完成一場 20 題以上的測驗且無失誤',
    icon: '🛡️',
    condition: 'perfect_run_20'
  }
];
