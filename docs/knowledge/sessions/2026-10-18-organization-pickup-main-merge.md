# Organization pickup main merge and reviewer access — 18 October 2026

## Owner request

The owner requested merging the organization pickup feature to `main` and publishing the shared personal/consumer and NGO demo credentials in the root README so reviewers can sign in without creating demo data locally. The owner explicitly confirmed these are demo accounts and approved their credentials being in the repository.

## Change

- Updated the root README to describe the current personal and organization flows, local startup, and the two configured Firebase demo accounts. The credential values are sourced from the ignored local `backend/.env`; the README documents the accounts as public demo-only credentials for the existing development Firebase project.
- Corrected the previous live-acceptance note that said credentials were absent from documentation.
- Updated the product snapshot, architecture summary, and status snapshot to reflect local acceptance and the planned merge.
- The feature branch was pushed before merging. Because `origin/main` was an ancestor of the feature branch, integrate using a fast-forward and push `main` without rewriting history.

## Boundaries

- Demo Firebase accounts and synthetic data are already present in the configured project. Starting the app does not seed or recreate them.
- No application deployment, project creation, additional seed job, or live task-sheet change is part of this merge.
- The public demo passwords are not valid outside these review accounts and must not be reused for personal or production services.
