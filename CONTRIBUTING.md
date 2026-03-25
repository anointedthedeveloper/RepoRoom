# Contributing to ChatFlow

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repo and clone your fork
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. Run `npm install` then `npm run dev`

## Development Workflow

- `npm run dev` — start local dev server
- `npm run build` — production build
- `npm run lint` — run ESLint

## Making Changes

- Create a branch: `git checkout -b feat/your-feature`
- Keep commits focused and descriptive
- Test your changes locally before opening a PR
- Open a pull request against `main`

## Code Style

- TypeScript everywhere — no `any` unless unavoidable
- Tailwind for styling — avoid inline styles except for dynamic values
- Keep components small and single-purpose
- Prefer `useCallback` / `useMemo` for functions passed as props

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser and OS

## Feature Requests

Open an issue describing the feature and why it would be useful.
Anointed