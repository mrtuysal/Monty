# Refactor Workflow

When the user calls `/refactor [file or component]`:

1. **Understand Context:** Read the targeted file(s) entirely. If they mention a component without a file, use search tools to find it.
2. **Analyze Structural Flaws:** Identify spaghetti code, huge functions, repeated identical components, or anti-patterns in the codebase.
3. **Plan the Architecture:** Draft a clear plan on how to restructure the code. Emphasize separation of concerns (e.g., pulling business logic into hooks/services, dividing huge UI components into smaller ones).
4. **Implement:** Use `multi_replace_file_content` or `replace_file_content` tools to carry out the refactoring step-by-step. Let the user know exactly what you changed.
5. **Preserve Logic:** Ensure 100% of the original business logic, variable states, and user interactions remain intact. Nothing should break.
