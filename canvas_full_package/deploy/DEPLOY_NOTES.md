Deployment notes:
- Render: copy render.yaml into root and connect repo.
- Vercel: You may need to adjust server entry for serverless; prefer Render or Railway for persistent socket servers.
- Railway: create a project, point to repo, set start command: node server/server.js
