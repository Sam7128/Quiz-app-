import React from 'react';
import { Settings as SettingsModal } from './Settings';
import { ResumePrompt } from './ResumePrompt';
import { ShareModal } from './ShareModal';
import { BankMetadata } from '../types';
import { SavedQuizProgress } from '../types/battleTypes';

interface GlobalModalsProps {
    isSettingsOpen: boolean;
    onCloseSettings: () => void;
    gameMode: boolean;
    onToggleGameMode: () => void;
    onSystemNuke: () => void;
    showResumePrompt: boolean;
    pendingSession: SavedQuizProgress | null;
    onRestoreSession: (session: SavedQuizProgress) => void;
    onDismissResumePrompt: () => void;
    sharingBank: BankMetadata | null;
    onCloseShare: () => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
    isSettingsOpen,
    onCloseSettings,
    gameMode,
    onToggleGameMode,
    onSystemNuke,
    showResumePrompt,
    pendingSession,
    onRestoreSession,
    onDismissResumePrompt,
    sharingBank,
    onCloseShare
}) => {
    return (
        <>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={onCloseSettings}
                gameMode={gameMode}
                onToggleGameMode={() => {
                    onToggleGameMode();
                }}
                onSystemNuke={onSystemNuke}
            />

            <ResumePrompt
                isOpen={showResumePrompt}
                progress={pendingSession}
                onContinue={() => pendingSession && onRestoreSession(pendingSession)}
                onRestart={onDismissResumePrompt}
            />

            <ShareModal
                isOpen={sharingBank !== null}
                onClose={onCloseShare}
                bank={sharingBank}
            />
        </>
    );
};
