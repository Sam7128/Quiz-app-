# Plan Stress Test Report

## Section A: Stress Test Issues

### [ISSUE-001] Category: Edge Case
- **Affected Step**: 1.1 在 `components/Social.tsx` 的 `handleAcceptBank` 函數中替換 UUID
- **Problem**: `crypto.randomUUID()` API requires a secure context (HTTPS or localhost). If the app is run on an unsecured HTTP network (e.g. testing on a local IP address over Wi-Fi without SSL), `crypto.randomUUID` will be undefined, causing a fatal crash when accepting a shared bank.
- **Risk Level**: HIGH
- **Suggested Addition**: Add a fallback UUID generator or a check: `id: window.crypto?.randomUUID ? crypto.randomUUID() : fallbackGenerateUUID()`

### [ISSUE-002] Category: Architecture
- **Affected Step**: 1.1 替換為全新 UUID
- **Problem**: While `crypto.randomUUID()` avoids RLS 403, generating new UUIDs severs the linkage to the original Bank. If User A updates the shared bank later and re-shares it, there is no way for User B to merge updates—it will just create another full copy with a new set of UUIDs, bloating the database.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Document this limitation explicitly in the proposal/design, or store the `original_question_id` as metadata during the copy operation to enable future deduplication/merging.

### [ISSUE-003] Category: Logic Gap
- **Affected Step**: 2.1 - 2.4 QuizCard 樣式修改
- **Problem**: The tasks add `hover:` states for Dark Mode but completely miss `:focus-visible` or `:focus` states. Keyboard navigation users (Tab key) in Dark Mode will experience the same contrast/readability issues because the focus state is not styled for Dark Mode.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Append `dark:focus-visible:bg-brand-900/20` and corresponding focus styles everywhere `hover:` is introduced.

### [ISSUE-004] Category: Edge Case
- **Affected Step**: 2.3 已作答後的未選中選項 `dark:` 變體
- **Problem**: `opacity-60` combined with `dark:text-slate-500` on a dark background might drop the contrast ratio below WCAG AA requirements (4.5:1), making it completely illegible for visually impaired users in dark mode.
- **Risk Level**: LOW
- **Suggested Addition**: Verify the actual contrast ratio of the resulting color and consider using `opacity-80` or `dark:text-slate-400` instead.

### [ISSUE-005] Category: Missing Detail
- **Affected Step**: 3.1 & 3.2 MobileNav 新增設定觸發入口
- **Problem**: The `AppContent` passes `onOpenSettings` down to `MobileNav`, which triggers setting modal open. However, clicking this does not explicitly close the MobileNav drawer if it's in a collapsed state, nor does it establish correct ARIA Focus trapping for the newly opened Settings Modal overlay coming from a mobile context.
- **Risk Level**: LOW
- **Suggested Addition**: Ensure `onOpenSettings` execution also handles blurring the active element to prevent virtual keyboard popup issues.

### [ISSUE-006] Category: Assumption Risk
- **Affected Step**: 4.1 修改 Dashboard 題庫卡片操作按鈕的可見性策略
- **Problem**: The `md` breakpoint in Tailwind is precisely `768px`. Many common tablets (e.g., standard iPad) operate in portrait mode at exactly `768px` wide. Because they hit the `md:` breakpoint, they will adopt the `md:opacity-0` behavior, hiding the buttons. Since they are touch devices, they still cannot trigger `hover`, rendering the buttons inaccessible.
- **Risk Level**: HIGH
- **Suggested Addition**: Use the `lg:` breakpoint (1024px) instead of `md:` for hover-only visibility, or combine it with a `pointer: fine` media query strategy as originally discussed in Design D2 (but missed in the task implementation).

### [ISSUE-007] Category: Logic Gap
- **Affected Step**: 4.1 按鈕的可見性策略
- **Problem**: Keyboard accessibility is compromised. By setting `md:opacity-0` and only relying on `md:group-hover`, keyboard users tabbing through elements on desktop will focus on the hidden buttons, but the buttons will remain invisible (`opacity-0`).
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add `focus-within:opacity-100` alongside `group-hover/card:opacity-100` to ensure keyboard focus reveals the action area.

### [ISSUE-008] Category: Logic Gap
- **Affected Step**: 5.1 建立 `utils/isAbortError.ts`
- **Problem**: The implementation `error instanceof DOMException` is too strict. Some network polyfills or wrappers (including some Supabase node-fetch fallbacks) throw generic Error objects where `.name === 'AbortError'`, failing the `instanceof DOMException` check.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Relax the check to `return error instanceof Error && error.name === 'AbortError'`.

### [ISSUE-009] Category: Architecture
- **Affected Step**: 5.2 - 5.5 `try/catch` 靜默處理
- **Problem**: Placing `if (isAbortError(error)) return;` at the absolute top of the `catch` block bypasses any error tracking or APM telemetry that might be monitoring the application. While it rightfully suppresses console noise, it completely blinds systemic monitoring to request cancellation volumes, which is an important metric for rendering performance (too many cancellations = thrashing).
- **Risk Level**: LOW
- **Suggested Addition**: Ensure that `AbortError` is skipped for user-facing toasts and logs, but optionally tracked in debug/telemetry if APM is later installed.

---

## Section B: Test Matrix

### Module: Social Sharing (RLS 403 Fix)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | UUID Generation on Accept | valid shared bank questions | `saveQuestions` called with newly generated UUIDs | P0 |
| 2 | UUID Secure Context Fallback | `crypto.randomUUID` is undefined | falls back to manual hex string generation | P1 |
| 3 | Question Count Persistence | valid shared bank payload | New bank metadata `questionCount` matches payload length | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | End-to-End Bank Sharing | `ShareModal`, `Social`, `CloudStorage` | User A shares, User B clicks accept, User B sees bank in Dashboard, no 403 in console |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Accepting an empty bank (0 questions) | Prevents array mapping errors | `map` iterates 0 times, creating empty bank successfully |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Network disconnect during Accept | Wireless connection drops post UUID generation | Show failure Toast, do not create corrupted local bank |

#### Expected Outcomes
- Bank successfully duplicates into receiver's repository without triggering Supabase RLS policies.
- No `403 Forbidden` messages in console.

### Module: Dark Mode QuizCard

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Hover Unanswered Option Dark Mode | `isAnswered: false`, hover event | Background changes to `brand-900/20`, text `slate-200` | P0 |
| 2 | Selected Multiple Choice Dark Mode | `isSelected: true`, `isMultiple: true` | Background changes to `brand-900/30`, text `brand-100` | P0 |
| 3 | Unselected Answered Option Dark Mode | `isAnswered: true`, `isSelected: false` | Opacity dims, text is `slate-500`, border `slate-700` | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Theme Toggle during Active Quiz | `ThemeContext`, `QuizCard` | Classes seamlessly transition to dark modifiers without layout shift |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Keyboard Focus Navigation | Accessibility | `focus-visible` classes provide same visual feedback as `hover` in dark mode |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Theme unresolvable (OS default vs App preference) | OS toggles theme | Component immediately applies CSS variables for active theme |

#### Expected Outcomes
- Dark mode quiz options maintain minimum WCAG contrast ratios of 4.5:1.
- No "white-on-white" text disappearance.

### Module: Mobile Settings Nav

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Five Items Rendering | `MobileNavProps` | Component renders exactly 5 items using flex distribution | P0 |
| 2 | Click triggers onOpenSettings | click on settings icon | `onOpenSettings` callback fires | P0 |
| 3 | Styling on active state | nav item matching active view | Highlights specific standard icon, Settings does not falsely highlight | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Settings Modal Opening from Nav | `MobileNav`, `AppContent`, `GlobalModals` | Tapping gear icon dispatches GlobalModal open action for Settings |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Very narrow screen devices (e.g. iPhone SE) | 5 icons might crowd and overlap | Flex containers scale icons/font down or use hidden text labels |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Rapid consecutive clicks | User taps gear 5 times fast | Modal opens only once, state does not rapidly toggle open/closed |

#### Expected Outcomes
- Mobile users have clear, immediate access to App Settings.
- 5 items fit symmetrically on screens 320px and wider.

### Module: Tablet Action Buttons

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Mobile View Button Visibility | Window width < 768px | Element classes include `opacity-100`, lacks `opacity-0` base | P0 |
| 2 | Desktop View Default Visibility | Window width >= 1024px | Element classes show `md:opacity-0` | P0 |
| 3 | Desktop View Hover Visibility | Window width >= 1024px + MouseEnter | `md:group-hover/card:opacity-100` triggers | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Dynamic Resize | `Dashboard`, Window Resizer | Buttons transition from hidden to visible immediately crossing breakpoint threshold |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | iPad Portrait (768px Width) | Exact match of `md` tailwind breakpoint | Using `lg` or `@media(pointer: fine)` ensures buttons remain visible on tablets |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | CSS parsing failures in older browsers | PostCSS pipeline issue | Buttons default to `opacity-100` as a safe fallback |

#### Expected Outcomes
- Touch devices without fine pointer capability display action buttons constantly.
- Desktop users experience clean UI with hover revelation.

### Module: AbortError Silence

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | isAbortError validation (DOMException) | `new DOMException('mock', 'AbortError')` | returns `true` | P0 |
| 2 | isAbortError validation (Standard Error) | `new Error('AbortError')` | returns `false` (or `true` if issue-008 is addressed) | P0 |
| 3 | Non-Abort Error passed through | `new Error('Network Failed')` | `isAbortError` returns `false` | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Dashboard Strict Mode Unmount | `Dashboard`, `React.StrictMode` | First network call aborted, caught silently, second call succeeds |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Loading state cleanup | Finally block execution | `setLoading(false)` always executes even if catch returns early |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Real network timeout throwing Abort | Fetch times out (Not a manual cancel) | Caught by `isAbortError`, but potentially masks a real timeout issue |

#### Expected Outcomes
- Console runs perfectly clean during rapid navigation through dashboard, settings, and social views.
- No `throw` leaks causing Unhandled Promise Rejections.
