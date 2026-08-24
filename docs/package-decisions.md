# Open-source package decisions

Packages are preferred over custom infrastructure when maintained, compatible with supported Node versions, reasonably small, and consistent with the Docker boundary. Versions are pinned and new releases must satisfy the minimum-release-age policy.

## Adopted

- **XState** models task, attempt, employment, and meeting lifecycles. See the [official repository](https://github.com/statelyai/xstate).
- **Pino** provides low-overhead JSON logging and redaction. See [Pino](https://github.com/pinojs/pino) and its [untrusted logging guidance](https://github.com/pinojs/pino/blob/main/docs/help.md).
- **Execa** wraps trusted Docker CLI calls without a shell and supports bounded execution and cleanup. See [Execa](https://github.com/sindresorhus/execa).
- **ink-text-input** provides the maintained Ink text-entry primitive. Additional controls are added only when their corresponding workflow is implemented. See [ink-text-input](https://github.com/vadimdemedes/ink-text-input).
- **ink-testing-library** provides deterministic Ink rendering and keyboard tests.
- **Knip** rejects unused files, exports, and dependencies in the normal test gate. See [Knip](https://knip.dev/).
- **typescript-eslint** uses its official [strict typed-linting configuration](https://typescript-eslint.io/getting-started/typed-linting/).

## Evaluated but not adopted

- **Kysely** is a strong query builder, but its standard SQLite dialect targets `better-sqlite3`, adding a native binary and install scripts. Node SQLite already supplies the required transactions and prepared statements without that packaging cost. Reconsider if query complexity justifies a reviewed adapter.
- **Ink Web registry components** are not adopted as a bundle. Components may be selected individually after accessibility and compatibility review.

Do not add a package merely to replace a small stable standard-library function. Do not recreate state machines, subprocess safety, structured logging, or terminal inputs locally. Every dependency needs a documented purpose, version policy, license, and removal criterion.
