# Repository instructions

- `generating-role-card/` is the distributable Skill and the source of truth.
- The supported production target is the MMD new chat page (`chatVersion: 1`). Treat legacy-page material as migration input, not an equal runtime target.
- Preserve user decisions, platform boundaries, progressive disclosure, visual diversity, and the `sdk.stage` mounting rules.
- Keep official-source attribution in `THIRD_PARTY_NOTICES.md`.
- Run `npm test` after changing the Skill, authoring contract, fixtures, validators, or public documentation.
- Do not commit credentials, local absolute paths, private cards, real chat logs, or user saves.

