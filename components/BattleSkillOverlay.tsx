import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getBattleAsset } from '../constants/battleAssetRegistry';
import { ALL_SKILLS } from '../constants/skillsData';
import {
  BattlePresentationEvent,
  PresentationCompletionCause,
} from '../types/battleTypes';

interface BattleSkillOverlayProps {
  event: BattlePresentationEvent;
  reducedMotion: boolean;
  onComplete: (eventId: string, cause: PresentationCompletionCause) => void;
}

const PARTICLE_OFFSETS = [
  { x: -110, y: -70 },
  { x: -70, y: 90 },
  { x: -20, y: -120 },
  { x: 40, y: 105 },
  { x: 90, y: -85 },
  { x: 125, y: 45 },
] as const;

const getVfxPhaseKey = (phase: string): 'charge' | 'travel' | 'impact' | 'residue' => {
  switch (phase) {
    case 'anticipation':
      return 'charge';
    case 'travel':
      return 'travel';
    case 'impact':
      return 'impact';
    case 'settle':
      return 'residue';
    default:
      return 'impact';
  }
};

const getSkillTierScale = (skillId?: string): number => {
  if (!skillId) return 1;
  const skill = ALL_SKILLS.find((s) => s.id === skillId);
  if (!skill) return 1;
  switch (skill.tier) {
    case 'basic':
      return 1;
    case 'intermediate':
      return 1.2;
    case 'advanced':
      return 1.4;
    default:
      return 1;
  }
};

interface SkillVfxRendererProps {
  event: BattlePresentationEvent;
  reducedMotion: boolean;
  videoFailed?: boolean;
}

const SkillVfxRenderer: React.FC<SkillVfxRendererProps> = ({
  event,
  reducedMotion,
  videoFailed,
}) => {
  const [vfxFailed, setVfxFailed] = useState(false);
  const [skillImageFailed, setSkillImageFailed] = useState(false);

  const element = event.payload.element ?? 'fire';
  const vfxPhaseKey = getVfxPhaseKey(event.phase);
  const vfxAssetId = `vfx-${element}-${vfxPhaseKey}`;
  const vfxAsset = getBattleAsset(vfxAssetId);

  const skillId = event.payload.skillId;
  const skillAsset = skillId ? getBattleAsset(skillId) : null;
  const fallbackAsset = getBattleAsset(skillAsset?.fallbackId ?? 'skill-fallback');
  const skillImageSrc = skillAsset?.kind === 'video'
    ? fallbackAsset?.src
    : skillAsset?.src ?? fallbackAsset?.src;

  const tierScale = getSkillTierScale(skillId);
  const isImpact = event.phase === 'impact';
  const skillName = event.payload.skillName ?? '戰鬥技能';

  const showSkillImage = isImpact || reducedMotion || Boolean(videoFailed) || !vfxAsset || vfxFailed;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-4"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65, rotate: -12 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.65, ease: 'easeOut' }}
      data-vfx-phase={vfxPhaseKey}
      data-vfx-element={element}
    >
      {/* Element VFX phase layer */}
      {vfxAsset && !vfxFailed && !reducedMotion && (
        <img
          src={vfxAsset.src}
          alt=""
          className="absolute inset-0 m-auto h-40 w-40 object-contain pointer-events-none opacity-80 md:h-60 md:w-60"
          onError={() => setVfxFailed(true)}
        />
      )}

      {/* Unique Skill Image */}
      {showSkillImage && (
        <motion.div
          className="relative flex flex-col items-center gap-4"
          style={{ transform: `scale(${tierScale})` }}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: tierScale }}
          transition={{ duration: reducedMotion ? 0.08 : 0.3 }}
          data-testid="skill-image-container"
          data-tier-scale={tierScale}
        >
          {skillImageSrc && !skillImageFailed ? (
            <img
              src={skillImageSrc}
              alt=""
              className="h-32 w-32 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.65)] md:h-48 md:w-48"
              onError={() => setSkillImageFailed(true)}
            />
          ) : (
            <Sparkles className="h-24 w-24 text-amber-300" />
          )}
        </motion.div>
      )}

      <div className="rounded-xl border border-white/20 bg-black/60 px-6 py-3 text-2xl font-black text-white shadow-xl">
        {skillName}
      </div>

      {!reducedMotion &&
        PARTICLE_OFFSETS.map((offset, index) => (
          <motion.span
            key={`${event.eventId}-${index}`}
            className="absolute h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.9)]"
            initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
            animate={{ x: offset.x, y: offset.y, opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: 0.8, delay: index * 0.04 }}
          />
        ))}
    </motion.div>
  );
};

export const BattleSkillOverlay: React.FC<BattleSkillOverlayProps> = ({
  event,
  reducedMotion,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const skillAsset = event.payload.skillId
    ? getBattleAsset(event.payload.skillId)
    : null;
  const useVideo = skillAsset?.kind === 'video' && !reducedMotion && !videoFailed;

  const cleanVideo = useCallback((): void => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (error) {
      console.warn('[BattleSkillOverlay] media cleanup failed.', error);
    }
  }, []);

  useEffect(() => {
    setVideoFailed(false);
    return cleanVideo;
  }, [cleanVideo, event.eventId]);

  const signal = (cause: PresentationCompletionCause): void => {
    onComplete(event.eventId, cause);
  };

  const handleVideoError = (): void => {
    cleanVideo();
    setVideoFailed(true);
  };

  return (
    <motion.div
      key={event.eventId}
      aria-hidden="true"
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 backdrop-blur-md pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-skill-id={event.payload.skillId ?? 'unknown'}
    >
      {useVideo && skillAsset ? (
        <video
          ref={videoRef}
          className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          src={skillAsset.src}
          autoPlay
          muted
          playsInline
          preload="none"
          onEnded={() => {
            cleanVideo();
            signal('ended');
          }}
          onError={handleVideoError}
        />
      ) : (
        <SkillVfxRenderer
          event={event}
          reducedMotion={reducedMotion}
          videoFailed={videoFailed}
        />
      )}
    </motion.div>
  );
};
