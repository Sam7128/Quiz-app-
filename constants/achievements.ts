export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
}

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
  }
];
