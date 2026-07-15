---
name: webapp-testing
description: Playwright-based toolkit for end-to-end testing. Supports browser automation, mobile emulation, and UI debugging.
---

# WebApp Testing

Comprehensive E2E and UI testing with Playwright.

## Capabilities
- **Browser Automation**: Click, type, hover, and navigate.
- **Debugging**: Screenshots, video recording, and trace viewing.
- **Advanced Flows**: Authentication state persistence, mobile emulation, and network intercepting.

## Workflow
1. **Setup**: Identify the local dev URL and server start command.
2. **Plan**: Define test scenarios (Happy path, Edge cases, Error states).
3. **Execute**: Run Playwright tests and analyze failures.
4. **Fix**: Update code or tests based on findings.

## Guardrails
- Ensure local server is running before starting tests.
- Use descriptive selectors (e.g., `role`, `test-id`) over fragile CSS selectors.
- Clean up test artifacts after completion.
