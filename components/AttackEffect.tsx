import React, { useMemo } from 'react';
import { FireballAttack } from './FireballAttack';
import { IceArrowAttack } from './IceArrowAttack';

interface AttackEffectProps {
    type: 'fireball' | 'ice_arrow' | 'random';
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    damage: number;
    isCrit?: boolean;
    onComplete?: () => void;
}

export const AttackEffect: React.FC<AttackEffectProps> = ({
    type,
    startX,
    startY,
    targetX,
    targetY,
    damage,
    isCrit,
    onComplete
}) => {
    // 隨機選擇特效 (使用 useMemo 保持單次渲染一致性，雖非嚴格必要因 Component 通常只 render 一次特效生命週期)
    const activeType = useMemo(() => {
        if (type === 'random') {
            return Math.random() > 0.5 ? 'fireball' : 'ice_arrow';
        }
        return type;
    }, [type]);

    if (activeType === 'ice_arrow') {
        return (
            <IceArrowAttack
                startX={startX}
                startY={startY}
                targetX={targetX}
                targetY={targetY}
                damage={damage}
                isCrit={isCrit}
                onComplete={onComplete}
            />
        );
    }

    // Default to Fireball
    return (
        <FireballAttack
            startX={startX}
            startY={startY}
            targetX={targetX}
            targetY={targetY}
            damage={damage}
            isCrit={isCrit}
            onComplete={onComplete}
        />
    );
};
