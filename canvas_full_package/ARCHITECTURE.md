# ARCHITECTURE (Upgraded)

See deploy/DEPLOY_NOTES.md and server/server.js for persistence and room handling.
- Per-user undo implemented on server (search last op by user id)
- Multi-room support via roomId field emitted with events
- Offscreen checkpointing implemented client-side for performance
