import React from 'react';
import { Trophy, Clock, CheckCircle, XCircle, User, BookOpen } from 'lucide-react';
import { ChallengeWithDetails } from '../services/challenges';

interface ChallengeListProps {
  challenges: ChallengeWithDetails[];
  currentUserId: string;
  onAccept: (challengeId: string) => void;
  onDecline: (challengeId: string) => void;
  onStartChallenge: (challengeId: string, bankId: string) => void;
}

export const ChallengeList: React.FC<ChallengeListProps> = ({
  challenges,
  currentUserId,
  onAccept,
  onDecline,
  onStartChallenge
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-amber-500" />;
      case 'active':
        return <Trophy size={16} className="text-brand-500" />;
      case 'completed':
        return <CheckCircle size={16} className="text-emerald-500" />;
      case 'cancelled':
        return <XCircle size={16} className="text-slate-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '等待接受';
      case 'active':
        return '進行中';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  if (challenges.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Trophy size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">暫無挑戰賽</p>
        <p className="text-xs mt-1">向好友發起挑戰吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => {
        const isChallenger = challenge.challengerId === currentUserId;
        const isMyTurn = challenge.currentTurn === currentUserId;
        const opponentName = isChallenger ? challenge.opponentName : challenge.challengerName;
        const myScore = isChallenger ? challenge.challengerScore : challenge.opponentScore;
        const opponentScore = isChallenger ? challenge.opponentScore : challenge.challengerScore;

        return (
          <div
            key={challenge.id}
            className={`p-4 rounded-xl border transition-all ${
              challenge.status === 'active' && isMyTurn
                ? 'bg-brand-50 border-brand-200'
                : challenge.status === 'completed'
                ? challenge.winnerId === currentUserId
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : challenge.winnerId === null
                  ? 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(challenge.status)}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  challenge.status === 'active' && isMyTurn
                    ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {getStatusText(challenge.status)}
                  {challenge.status === 'active' && isMyTurn && ' - 你的回合！'}
                </span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(challenge.createdAt).toLocaleDateString('zh-TW')}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {isChallenger ? '你' : challenge.challengerName} 挑戰 {isChallenger ? opponentName : '你'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">題庫：{challenge.bankName || '未知'}</span>
            </div>

            {challenge.status === 'completed' && (
              <div className="flex items-center justify-center gap-4 py-2 mb-3 bg-white dark:bg-slate-700 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{isChallenger ? challenge.challengerScore : challenge.opponentScore}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{isChallenger ? '你' : '對手'}</div>
                </div>
                <div className="text-slate-300 dark:text-slate-600">vs</div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{isChallenger ? challenge.opponentScore : challenge.challengerScore}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{isChallenger ? '對手' : '你'}</div>
                </div>
              </div>
            )}

            {challenge.status === 'pending' && !isChallenger && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onAccept(challenge.id)}
                  className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors"
                >
                  接受挑戰
                </button>
                <button
                  onClick={() => onDecline(challenge.id)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors"
                >
                  拒絕
                </button>
              </div>
            )}

            {challenge.status === 'active' && isMyTurn && (
              <button
                onClick={() => onStartChallenge(challenge.id, challenge.bankId)}
                className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors mt-2"
              >
                開始答題
              </button>
            )}

            {challenge.status === 'active' && !isMyTurn && (
              <div className="text-center py-2 text-sm text-slate-500 mt-2">
                等待對手完成...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
