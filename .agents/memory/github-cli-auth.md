---
name: GitHub CLI authentication
description: Distinguishes Replit's GitHub connector status from the credentials used by shell Git.
---

Do not assume a healthy or authorized GitHub source-control connection proves that shell `git push` will work. Verify the actual push; if Git rejects authentication, use Replit's Git pane or Connected Services flow to restore GitHub access rather than requesting a personal access token.

**Why:** In this workspace, GitHub reported a healthy OAuth connection while pushes from both an isolated export repository and the workspace root were rejected as invalid credentials.

**How to apply:** Before claiming a repository is published, confirm the remote branch exists. If the CLI push fails, preserve the prepared commit and direct the user to reconnect GitHub through Replit's supported UI, then retry with the narrowest intended branch.
