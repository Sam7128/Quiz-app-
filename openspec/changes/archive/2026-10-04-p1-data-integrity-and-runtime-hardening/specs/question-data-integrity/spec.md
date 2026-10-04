# Spec: Question Data Integrity

## ADDED Requirements

### Requirement: BOM-tolerant question import

題庫檔案或貼上文字在 JSON parse 前 MUST 移除開頭一個或多個 UTF-8 BOM（`\uFEFF`），不得移除題目內容中的其他 Unicode 字元。

#### Scenario: Import a Windows UTF-8 BOM file
- **WHEN** a valid question-bank JSON string starts with `\uFEFF`
- **THEN** the import flow SHALL parse and validate it successfully
- **AND** the existing import confirmation and save flow SHALL receive the same questions as a BOM-free file

#### Scenario: Reject invalid JSON after BOM cleanup
- **WHEN** the BOM-cleaned value is not valid JSON
- **THEN** the import flow SHALL show the existing error state
- **AND** SHALL NOT call `saveQuestions` or update the active question list

### Requirement: Runtime question guard

所有來自 JSON、localStorage、`saveQuestions` 寫入入口或 legacy migration 的題目 MUST 先通過共用 `unknown` runtime guard。合法題目至少包含有效 `id`（非空字串或有限數值，包含 `0`）、非空 `question`、非空 `options: string[]`，以及包含在 `options` 內的有效 `answer: string | string[]`（單選題答案必須存在於選項中，多選題每個答案皆必須存在於選項中）；可選欄位（如 `hint`、`explanation`、`tags`）容許為 `undefined` 或字串（包含空字串）；非法成員 MUST 被隔離。

#### Scenario: Preserve valid questions in a mixed array
- **WHEN** a parsed array contains valid and malformed question records
- **THEN** the parser SHALL return only valid `Question` records
- **AND** SHALL emit bounded `console.warn` identifying source and item index (capped at 5 detailed warnings per parse, aggregating subsequent failures)
- **AND** SHALL NOT throw to the React render path

#### Scenario: Reject impossible question with mismatched answer and options
- **WHEN** a question record contains an `answer` that does not exist within its `options`
- **THEN** `isQuestion` SHALL evaluate to `false`
- **AND** the question SHALL be quarantined to prevent unanswerable quiz deadlocks

#### Scenario: Support numeric id zero and empty optional fields
- **WHEN** a question contains `id: 0` or optional fields with empty strings (e.g. `hint: ""`)
- **THEN** `isQuestion` SHALL evaluate to `true`
- **AND** the question SHALL be preserved without data loss

#### Scenario: Guard persistence write path in saveQuestions
- **WHEN** `saveQuestions` receives an array of questions to persist
- **THEN** it SHALL filter the items through the runtime guard before serializing to localStorage
- **AND** the bank metadata `questionCount` SHALL match the exact count of valid questions
- **AND** IF all records are invalid while the input was non-empty, it SHALL refuse the write operation

#### Scenario: Reject a malformed bank root
- **WHEN** bank JSON is `null`, an object, a scalar, or invalid JSON
- **THEN** `getQuestions` SHALL return `[]`
- **AND** SHALL emit a `console.warn`
- **AND** downstream consumers SHALL receive an array and remain render-safe

#### Scenario: Empty valid result does not overwrite data
- **WHEN** import validation produces zero valid questions
- **THEN** the import flow SHALL refuse the save operation
- **AND** SHALL preserve the existing bank unchanged

#### Scenario: Partial valid import provides user feedback
- **WHEN** an imported file contains both valid and invalid questions
- **THEN** the import flow SHALL proceed with only the valid questions upon confirmation
- **AND** the UI Toast SHALL notify the user of the successful count and the quarantined/skipped count

### Requirement: Blob-based question export

題庫匯出 MUST use an `application/json` Blob URL and MUST revoke the URL after the download attempt with rapid-click debounce.

#### Scenario: Export a large question bank
- **WHEN** the user activates export
- **THEN** the flow SHALL create a Blob URL rather than a Data URI
- **AND** SHALL trigger the existing `.json` download filename
- **AND** SHALL call `URL.revokeObjectURL` after a brief delay (approximately 1000ms) to ensure asynchronous download initiation across browsers
- **AND** the export action SHALL be temporarily disabled or debounced for 1000ms to prevent duplicate Object URL generation from rapid clicks

#### Scenario: Export API failure
- **WHEN** Blob or URL creation throws
- **THEN** the UI SHALL remain stable and show an error state
- **AND** SHALL not mutate question data
