# Setup CI Workflow

When the user calls `/setup-ci`:

1. **Analyze Project Stack:** List the root directory and find `package.json`, `requirements.txt`, or similar files to identify the tech stack and monorepo structure (e.g., npm workspaces, yarn, expo, etc.).
2. **Determine CI Platform:** Unless the user specifies otherwise, default to **GitHub Actions**.
3. **Create Workflow File:**
   - Create `.github/workflows/ci.yml`.
   - Setup triggers (push to main, pull requests).
   - Configure multi-job architecture if needed (e.g., job for linting, job for mobile build, job for desktop build).
4. **Best Practices:** Ensure proper caching (e.g., `actions/setup-node` caching), dependency installation commands, and test run commands.
5. **Final Output:** Summarize the pipeline configuration to the user. Ask if they want to add specialized secrets or deployment targets.
