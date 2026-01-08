# Contributing to Workflow Performance Monitor

## Development Setup

1. Clone the repository
```bash
git clone https://github.com/ke-kawai/workflow-performance-monitor.git
cd workflow-performance-monitor
```

2. Install dependencies
```bash
npm install
```

3. Build the project
```bash
npm run bundle
```

## Git Strategy

### Branch Strategy

- `main` - Production-ready code, protected branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Workflow

1. Create a feature branch from `main`
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

2. Make your changes and commit using Conventional Commits (see below)

3. Push your branch and create a Pull Request to `main`
```bash
git push origin feature/your-feature-name
```

4. After PR review and approval, merge to `main`

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and CHANGELOG generation.

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `refactor:` - Code refactoring (triggers patch version bump)
- `perf:` - Performance improvement (triggers patch version bump)
- `docs:` - Documentation changes (triggers patch version bump)
- `test:` - Test additions or updates (triggers patch version bump)
- `chore:` - Other changes (triggers patch version bump)

### Breaking Changes

Add `BREAKING CHANGE:` in the footer or `!` after type to trigger major version bump:

```
feat!: change API structure

BREAKING CHANGE: the API response format has changed
```

### Examples

```bash
# Feature (1.0.0 -> 1.1.0)
git commit -m "feat: add process trace filtering option"

# Bug fix (1.0.0 -> 1.0.1)
git commit -m "fix: resolve memory leak in metric collection"

# Breaking change (1.0.0 -> 2.0.0)
git commit -m "feat!: redesign configuration API

BREAKING CHANGE: configuration now uses YAML instead of JSON"
```

## Release Process

This project uses [release-please](https://github.com/googleapis/release-please) for automated releases.

### How It Works

1. **Develop and Merge**
   - Create feature branches and merge PRs to `main` using conventional commits
   - Each merge to `main` is analyzed by release-please

2. **Release PR Auto-Creation**
   - release-please automatically creates/updates a "Release PR"
   - The Release PR includes:
     - Updated version in `package.json`
     - Generated `CHANGELOG.md` from commit messages
     - Updated `.release-please-manifest.json`

3. **Review Release PR**
   - Review the proposed version bump (major/minor/patch)
   - Review the generated CHANGELOG
   - Make manual edits if needed
   - Multiple feature PRs can accumulate before releasing

4. **Publish Release**
   - Merge the Release PR to `main`
   - release-please automatically:
     - Creates a GitHub Release
     - Creates git tags (e.g., `v1.2.3`, `v1.2`, `v1`)
     - Updates the tags to point to the latest version

5. **GitHub Marketplace** (first time only)
   - For the first release, manually check "Publish to GitHub Marketplace" when creating the release
   - All subsequent releases will automatically appear in the Marketplace

### Version Tags

The release process creates multiple tags for user convenience:

- `v1.2.3` - Exact version
- `v1.2` - Latest patch of 1.2.x
- `v1` - Latest minor/patch of 1.x.x

This allows users to choose their update strategy:
```yaml
# Auto-update to latest v1.x.x (recommended)
uses: ke-kawai/workflow-performance-monitor@v1

# Auto-update to latest v1.2.x
uses: ke-kawai/workflow-performance-monitor@v1.2

# Pin to exact version
uses: ke-kawai/workflow-performance-monitor@v1.2.3
```

### Manual Release (if needed)

If you need to trigger a release manually:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit with conventional commit message
4. Create and push a tag:
```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

## Testing

Currently, testing is done via the demo workflow:

```bash
# Trigger the demo workflow manually
gh workflow run telemetry-demo.yml
```

The demo workflow tests the action on:
- Ubuntu
- macOS
- Windows

## Code Style

- TypeScript for type safety
- Follow existing code patterns
- Run `npm run bundle` before committing to ensure the code compiles

## Questions?

Feel free to open an issue for any questions or discussions!
