# Rulebix Publish Action

GitHub Action for auto-publishing to Rulebix Registry.

## Usage

```yaml
- uses: rulebix/publish-action@v1
```

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
