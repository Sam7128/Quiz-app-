# Spec: Toast & Notification System

## ADDED Requirements

### Requirement: Toast Notification Context
The application SHALL provide a `ToastContext` that exposes a `useToast()` hook available to all components.

#### Scenario: Component displays success toast
- **WHEN** a component calls `toast.success("題庫已建立")`
- **THEN** a success toast notification appears at screen top-right with green styling
- **THEN** the toast auto-dismisses after 3 seconds

#### Scenario: Component displays error toast
- **WHEN** a component calls `toast.error("儲存失敗")`
- **THEN** an error toast notification appears with red styling
- **THEN** the toast auto-dismisses after 5 seconds

#### Scenario: Multiple toasts stack
- **WHEN** multiple toasts are triggered in quick succession
- **THEN** they stack vertically without overlapping
- **THEN** each toast has its own dismiss timer

### Requirement: Confirm Dialog
The application SHALL provide an async `useConfirm()` hook that replaces native `window.confirm()`.

#### Scenario: User confirms destructive action
- **WHEN** a component calls `const ok = await confirm({ title: "確認刪除", message: "此動作無法復原" })`
- **THEN** a modal dialog appears with the title and message
- **THEN** the dialog has "確認" and "取消" buttons
- **THEN** clicking "確認" resolves the Promise with `true`
- **THEN** clicking "取消" resolves the Promise with `false`

#### Scenario: Confirm dialog blocks interaction
- **WHEN** the confirm dialog is visible
- **THEN** the background content SHALL have a dim overlay
- **THEN** keyboard focus SHALL be trapped within the dialog

### Requirement: Alert replacement
All existing `alert()` calls SHALL be replaced with `toast.info()` or `toast.success()`.

#### Scenario: No native alert calls remain
- **WHEN** the codebase is searched for `alert(` calls
- **THEN** zero results are found outside of test files

### Requirement: Confirm replacement
All existing `window.confirm()` calls SHALL be replaced with the async `useConfirm()` hook.

#### Scenario: No native confirm calls remain
- **WHEN** the codebase is searched for `confirm(` calls
- **THEN** zero results are found outside of test files
