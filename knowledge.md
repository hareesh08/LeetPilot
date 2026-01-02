# Project knowledge

This file gives Codebuff context about your project: goals, commands, conventions, and gotchas.

## Quickstart
- **Setup**: `npm install`
- **Dev**: `npm run build:dev` then load `dist-dev/` as unpacked extension in Chrome; use `npm run dev` (tsc --watch) for TypeScript changes
- **Test**: `npm test` (Jest)
- **Build**: `npm run build:prod` for production zip (`leetpilot-extension.zip`)

## Architecture
LeetPilot: Chrome Manifest V3 extension for AI code completion/hints in LeetCode Monaco Editor (BYOK privacy).
- **Key directories**:
  - `src/background/`: Service worker (message routing, API orchestration to OpenAI/Anthropic/Gemini)
  - `src/content/`: LeetCode page scripts (Monaco detection, keyboard shortcuts, UI injection)
  - `src/ui/`: Settings popup (API key config)
  - `src/core/`: Shared utils (API client, storage, prompts, validation)
  - `src/utils/`: DOM, logging, etc.
  - `test/`: Jest tests
- **Data flow**: Content script → background messages → direct AI API calls (user keys stored locally)

## Conventions
- **Formatting/linting**: None configured (add ESLint/Prettier?)
- **Patterns to follow**:
  - Manifest V3 service workers (no persistent background)
  - Modular JS (index.js exports), TypeScript strict
  - Jest tests in `test/`, jsdom env
  - Educational prompts (no full solutions)
- **Things to avoid**:
  - Global installs (`npm i -g`)
  - Destructive cmds (git push/commit without ask)
  - Assuming libs (empty deps; verify imports)
  - Breaking editor func (preserve Monaco)

## Gotchas
- Windows cmd.exe: use `dir` not `ls`, etc.
- Build uses custom `scripts/build.js` (copies src/, generates manifest/build-info)
- Tests match `test/**/*.test.js`
- Host perms: leetcode.com + AI APIs + https://*/* (custom providers)
