# Rulebix Publish Action

GitHub Action for auto-publishing to Rulebix Registry.

## Usage

### Basic Usage

```yaml
- uses: rulebix/publish-action@v1
```

### Custom Configuration

```yaml
- uses: rulebix/publish-action@v1
  with:
    registry_url: 'https://your-registry.com/api/v1/publish'
    retries: 5
    audience: 'custom-audience'
```

### Required Permissions

For OIDC authentication to work, you need to add the following permissions to your workflow:

```yaml
permissions:
  id-token: write
  contents: read
```

### Complete Example

```yaml
name: Publish to Rulebix

on:
  push:
    branches:
      - main
    tags:
      - 'v*'

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Publish to Rulebix Registry
        uses: rulebix/publish-action@v1
        with:
          registry_url: 'https://nuxt.ineceper.my.id/api/v1/publish'
```

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `registry_url` | Registry API endpoint URL | No | `https://nuxt.ineceper.my.id/api/v1/publish` |
| `retries` | Number of retry attempts on failure | No | `3` |
| `audience` | OIDC token audience (aud claim) | No | `rulebix-registry` |

### Outputs

| Output | Description |
|--------|-------------|
| `version` | Published version (tag or dev-<sha>) |
| `package_name` | Package name from spec.json |

### Published Data

The action sends the following data to the registry:

- `package_name`: Package name from spec.json
- `repo`: Repository full name (owner/repo)
- `version`: Version (tag name or short SHA)
- `commit_sha`: Full commit SHA
- `repo_url`: Repository URL
- `actor`: GitHub actor who triggered the action
- `readme`: Content of README.md (if exists)
- `spec`: Content of spec.json (if exists)
- `unpacked_size`: Total size of repository files in bytes (excluding node_modules, .git, dist)
- `total_files`: Total number of files in repository (excluding node_modules, .git, dist)

## Development

### Project Structure

```
rulebix-publish-action/
├── index.js                    # Main entry point
├── validator.js                # Repository validation logic
├── services/
│   ├── payload-builder.js      # Build API payload
│   └── registry-client.js      # HTTP client for registry API
├── utils/
│   ├── file-reader.js          # Read spec.json and README.md
│   ├── repo-stats.js           # Calculate repo size and file count
│   └── version-detector.js     # Detect version from git ref
└── tests/
    └── test-validator.js       # Validator tests
```

### Building the Action

Before committing changes, you need to build the action:

```bash
npm install
npm run build
```

This will bundle all dependencies into `dist/index.js` which is required for GitHub Actions to run.

**Important:** The `dist/` folder must be committed to the repository for the action to work.

## Repository Validation

This action includes automatic repository validation to ensure your package structure is correct before publishing.

### Validation Rules

The validator checks:
1. `spec.json` exists in the repository root
2. `spec.json` contains a valid `modules` array
3. Each module has an `id` property in kebab-case format (lowercase letters, numbers, and hyphens only)
4. Each module has a `path` property
5. Each module has a valid `type` property (one of: `rule`, `workflow`, `skill`, `template`, `prompt`, `agent`, `placeholder`)
6. Each module path contains an `index.md` file

### Using the Validator Standalone

You can also use the validator in your own scripts:

```javascript
const { validateRepository } = require('./validator');

const result = validateRepository('./path/to/repo');

if (result.success) {
    console.log(`✓ Valid repository with ${result.modulesCount} modules`);
} else {
    console.error('Validation errors:');
    result.errors.forEach(error => console.error(`  - ${error}`));
}
```

### Example Repository Structure

```
my-repo/
├── spec.json
├── rules/
│   └── code-style/
│       └── index.md
└── skills/
    └── api-development/
        └── index.md
```

## License

MIT
