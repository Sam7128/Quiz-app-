import { AppAction, AppState } from '../types';
import { getGameMode, saveGameMode } from '../services/storage';

export const initialAppState: AppState = {
    view: 'dashboard',
    guestMode: false,
    isSettingsOpen: false,
    sharingBank: null,
    banks: [],
    folders: [],
    editingBankId: null,
    selectedQuizBankIds: [],
    gameMode: getGameMode()
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'set_view':
            return { ...state, view: action.view };
        case 'set_guest_mode':
            return { ...state, guestMode: action.guestMode };
        case 'set_settings_open':
            return { ...state, isSettingsOpen: action.isSettingsOpen };
        case 'set_sharing_bank':
            return { ...state, sharingBank: action.sharingBank };
        case 'sync_banks_data': {
            const validIds = action.banks.map(bank => bank.id);
            const preservedSelection = state.selectedQuizBankIds.filter(id => validIds.includes(id));
            const selectedQuizBankIds = preservedSelection.length > 0
                ? preservedSelection
                : (action.banks.map(b => b.id));

            return {
                ...state,
                banks: action.banks,
                folders: action.folders,
                selectedQuizBankIds
            };
        }
        case 'set_editing_bank_id':
            return { ...state, editingBankId: action.editingBankId };
        case 'toggle_quiz_bank_id': {
            const isSelected = state.selectedQuizBankIds.includes(action.bankId);
            const selectedQuizBankIds = isSelected
                ? state.selectedQuizBankIds.filter(id => id !== action.bankId)
                : [...state.selectedQuizBankIds, action.bankId];

            return { ...state, selectedQuizBankIds };
        }
        case 'set_selected_bank_ids':
            return { ...state, selectedQuizBankIds: action.bankIds };
        case 'set_game_mode':
            saveGameMode(action.gameMode);
            return { ...state, gameMode: action.gameMode };
        default:
            return state;
    }
};
