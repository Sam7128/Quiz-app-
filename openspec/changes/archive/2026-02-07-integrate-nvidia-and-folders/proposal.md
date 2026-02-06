# Proposal: Integrate NVIDIA API & Bank Folders

## Problem
1.  **Limited AI Choice:** The application currently only supports Google's Generative AI. Users specifically requested support for NVIDIA's API (e.g., DeepSeek models) to leverage different model capabilities.
2.  **Organization Clutter:** As users accumulate many question banks, the flat list in the Dashboard becomes difficult to manage. Users need a way to group related banks (e.g., "Science", "History") into folders.

## Solution
1.  **NVIDIA/OpenAI-Compatible Support:** Integrate the `openai` client library to support NVIDIA's API endpoint (and other compatible services). Allow users to configure the Base URL and API Key.
2.  **Folder System:** Introduce a lightweight folder structure for question banks. Allow users to create folders and move banks into them, reducing visual clutter on the Dashboard.

## Impact
- **Settings:** New fields for AI Provider, Base URL.
- **Dashboard:** New "Folder" view mode, breadcrumb navigation, and "Move" actions.
- **Storage:** New `mindspark_folders` key and updated `BankMetadata` schema.
