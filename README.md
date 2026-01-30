# Rulebix Publish Action

GitHub Action to publish repository metadata to Rulebix Registry.

## Usage

```yaml
name: Publish to Rulebix

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      - uses: rulebix/publish-action@v1
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `registry_url` | Registry API endpoint | `https://api.rulebix.com/v1/publish` |
| `retries` | Number of retry attempts | `3` |

## Outputs

| Output | Description |
|--------|-------------|
| `version` | Published version (tag or `dev-<sha>`) |
| `package_name` | Package name (`owner/repo`) |

## Development

```bash
npm install
npm run build
```

## License

MIT
