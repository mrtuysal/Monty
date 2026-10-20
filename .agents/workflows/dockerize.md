# Dockerize Workflow

When the user calls `/dockerize`:

1. **Investigate Context:** Check the project files to understand what needs to be containerized (Node server, Vite/React app, Python, Monorepo). Identify entry points and required environment variables.
2. **Docker Ignore:** Create a strict `.dockerignore` to exclude `node_modules`, `.git`, `.env`, build artifacts, and logs.
3. **Multi-Stage Dockerfile:** Write an optimal, multi-stage `Dockerfile` to keep the production image extremely small and secure. Use lightweight base images (e.g., `alpine` or `-slim`).
4. **Docker Compose:** If applicable, create a `docker-compose.yml` to orchestrate the app along with any necessary services (like a database, redis, etc.).
5. **Instructions:** Provide a summarized rundown of the created files and the exact terminal commands (e.g., `docker-compose up -d --build`) the user needs to spin it up.
