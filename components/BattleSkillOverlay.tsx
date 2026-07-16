import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getBattleAsset } from '../constants/battleAssetRegistry';
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
  const fallbackAsset = getBattleAsset(skillAsset?.fallbackId ?? 'skill-fallback');
  const useVideo = skillAsset?.kind === 'video' && !reducedMotion && !videoFailed;
  const imageSource = skillAsset?.kind === 'video'
    ? fallbackAsset?.src
    : skillAsset?.src ?? fallbackAsset?.src;
  const skillName = event.payload.skillName ?? '戰鬥技能';

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
        <motion.div
          className="relative flex flex-col items-center gap-4"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: reducedMotion ? 0.08 : 0.65, ease: 'easeOut' }}
        >
          {imageSource ? (
            <img
              src={imageSource}
              alt=""
              className="h-32 w-32 object-contain drop-shadow-[0_0_28px_rgba(255,255,255,0.65)] md:h-48 md:w-48"
            />
          ) : (
            <Sparkles className="h-24 w-24 text-amber-300" />
          )}
          <div className="rounded-xl border border-white/20 bg-black/60 px-6 py-3 text-2xl font-black text-white shadow-xl">
            {skillName}
          </div>
          {!reducedMotion && PARTICLE_OFFSETS.map((offset, index) => (
            <motion.span
              key={`${event.eventId}-${index}`}
              className="absolute h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(253,224,71,0.9)]"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: offset.x, y: offset.y, opacity: [0, 1, 0], scale: [0, 1, 0] }}
              transition={{ duration: 0.8, delay: index * 0.04 }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
