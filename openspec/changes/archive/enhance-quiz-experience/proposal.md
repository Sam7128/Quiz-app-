# Proposal: Enhance Quiz Configuration and AI Prompting

## Problem
1. **Rigid Quiz Size:** Users can currently only practice a maximum of 20 questions at a time. This prevents full-bank reviews for larger banks (e.g., 40+ questions).
2. **Static AI Prompts:** The AI prompt guide is hardcoded. Users cannot easily request:
   - Specific question types (Single vs. Multiple Choice vs. Mixed).
   - Explanations in a specific language (English vs. Chinese).
   - Output language preference.

## Solution
1. **Configurable Quiz Size:** Add a UI control to `Dashboard.tsx` allowing users to select the number of questions (10, 20, 50, All) before starting.
2. **Dynamic Prompt Builder:** Refactor `AIPromptGuide.tsx` to include a form. The "Copy Prompt" button will generate the prompt text dynamically based on selected options.

## Impact
- **UX:** significantly better flexibility for power users with large banks.
- **Learning:** Allows users to practice in English or focus on specific question types.
