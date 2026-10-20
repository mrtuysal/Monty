# Code Review Workflow

When the user calls `/review` or asks for a code review:

1. **Identify the scope:** Ask the user which file(s) or changes they want reviewed, or use `run_command` with `git diff` if appropriate to identify recent uncommitted changes.
2. **Deep Analysis:** Analyze the code thoroughly for:
   - Logic errors and edge cases.
   - Security vulnerabilities.
   - Performance bottlenecks.
   - Violations of clean code principles (SOLID, DRY).
3. **Report Format:** Present your findings clearly using Markdown alerts (e.g., `> [!WARNING]`, `> [!NOTE]`). Categorize the severity of the issues.
4. **Actionable Fixes:** Provide accurate code snippets (diff format) showing exactly how to fix or improve the code. DO NOT just point out errors without offering solutions.
