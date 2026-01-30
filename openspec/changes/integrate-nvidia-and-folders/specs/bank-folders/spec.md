# Spec: Question Bank Folders

## ADDED Requirements

### Requirement: Folder Management
The system MUST allow creating, naming, and deleting folders to organize question banks.

#### Scenario: Create a Folder
- **Given** the user is on the Dashboard root
- **When** they click "New Folder" and enter a name "Science"
- **Then** a new folder named "Science" should appear in the list
- **And** it should be persisted in `localStorage`

#### Scenario: Delete Folder
- **Given** a folder contains banks
- **When** the user deletes the folder
- **Then** the system should either:
    1. Warn the user that banks will be deleted (Simple MVP)
    2. OR move the banks back to Root (Safer)
    *Decision: For MVP, Warn and Move banks to Root to prevent accidental data loss.*

### Requirement: Bank Organization
The system MUST allow moving existing question banks into and out of folders.

#### Scenario: Move Bank to Folder
- **Given** a bank "Physics 101" exists in the root
- **And** a folder "Science" exists
- **When** the user selects "Move to" on the "Physics 101" card and chooses "Science"
- **Then** the bank should disappear from the root view
- **And** appear when opening the "Science" folder

### Requirement: Folder Navigation
The system MUST provide navigation to enter folders and return to the root view.

#### Scenario: Navigate Folders
- **Given** the user is inside the "Science" folder
- **When** they look at the top of the list
- **Then** they should see a breadcrumb or "Back" button to return to "Home"
