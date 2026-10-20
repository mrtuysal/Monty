# Project Log - Monty

## [2026-02-16] Project Initialization
- **Plan Approved:** User approved the implementation plan for the secure finance app "Monty".
- **Architecture:** Monorepo with React Native (Mobile) and Electron (Desktop).
- **Core Features:**
    - **Local-first data with cloud sync (Drive/iCloud).**
    - **Encrypted JSON/DB storage (Partitioned by year).**
    - **Notification system (Alarm/Snooze/Stop).**
- **Status:** Setting up the codebase.

## [2026-02-17] Payments Module v1.0 (Stable)
- **Features Implemented:**
    - **Recurring Payments:** Automatic generation of next month's payment (0 TL for Credit Cards, same amount for Bills).
    - **Currency Formatting:** Turkish format (1.234,56 TL) across all amount fields.
    - **Table Improvements:** Swapped Institution/Description columns for better readability.
    - **Validation:** Specific error messages for missing Institution or Due Date.
    - **UX Polish:** Default "Payable Amount" syncs with "Amount" for Bills/Other.
- **Checkpoint:** Backup created at `backups/2026-02-17_payments_checkpoint` for safe rollback if needed.

## [2026-02-18] Accounts v0.0.2 (Stable)
- **Features Implemented:**
    - **Draggable Cards:** Main Accounts dashboard with smooth drag-and-drop support.
    - **Grouping Logic:** Accounts grouped by Institution (e.g. Garanti BBVA, Enpara).
    - **Totals per Group:** Automatic calculation of total balance and available funds per currency for each group.
    - **Add/Edit Institutions:** Ability to rename institutions and manage groups.
    - **Transaction Management:**
        - **Quick Add:** Calculator-style popup to add transactions (+/-), with live balance preview.
        - **History:** Scrollable list of recent transactions with Edit/Delete capabilities.
        - **Live Balance Preview:** Real-time feedback showing new balance as you type.
- **Checkpoint:** Backup created at `backups/2026-02-18_v0.0.2_accounts_transactions`.
