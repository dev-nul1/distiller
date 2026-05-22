# Contributing to FigJam Exporter

Thanks for your interest in improving FigJam Exporter.

## Before you open an issue

- Check existing issues first to avoid duplicates.
- Use the issue templates so bug reports include the details needed to reproduce the problem.
- Remove or redact any board content, exports, screenshots, or logs that contain sensitive information.

## Types of contributions

- **Bug reports:** Use the bug report template and include reproduction steps, the selection mode, the export format, and expected vs actual output.
- **Feature requests:** Explain the problem, the desired outcome, and why it would help your workflow.
- **Questions:** Use the question template for usage help or product feedback that is not a bug.
- **Pull requests:** Keep changes focused, explain the user-visible impact, and include validation notes.

## Local development

### Prerequisites

- Node.js 20+ recommended
- npm

### Setup

```bash
npm install
```

### Validation

Run the existing project checks before opening a pull request:

```bash
npm test
npm run build
```

## Pull request expectations

- Keep PRs small and scoped to a single change when possible.
- Update related documentation when behavior changes.
- Describe how you tested the change.
- Be responsive to review feedback.

## Code of conduct

By participating in this project, you agree to follow the repository Code of Conduct in `CODE_OF_CONDUCT.md`.
