const core = require('@actions/core');
const github = require('@actions/github');
const { validateRepository } = require('./validator');
const { detectVersion } = require('./utils/version-detector');
const { readSpecFile, readReadmeFile } = require('./utils/file-reader');
const { calculateRepoStats } = require('./utils/repo-stats');
const { buildPayload } = require('./services/payload-builder');
const { getOIDCToken, publishToRegistry } = require('./services/registry-client');

/**
 * Main function to publish repository metadata to Rulebix Registry
 */
async function run() {
    try {
        // Get inputs from action.yml
        const registryUrl = core.getInput('registry_url');
        const retries = parseInt(core.getInput('retries'), 10);
        const audience = core.getInput('audience');

        core.info(`Registry URL: ${registryUrl}`);
        core.info(`Max retries: ${retries}`);
        core.info(`OIDC Audience: ${audience}`);

        // Detect version from git ref
        const version = detectVersion(github.context.ref, github.context.sha);

        // Get repository information from GitHub context
        const { owner, repo } = github.context.repo;
        const repoFullName = `${owner}/${repo}`;
        const commitSha = github.context.sha;
        const repoUrl = `https://github.com/${owner}/${repo}`;
        const actor = github.context.actor;

        // Validate repository structure
        const repoPath = process.env.GITHUB_WORKSPACE || process.cwd();
        const validationResult = validateRepository(repoPath);

        if (!validationResult.success) {
            const errorMessage = `Repository validation failed:\n${validationResult.errors.join('\n')}`;
            core.error(errorMessage);
            throw new Error(errorMessage);
        }

        core.info(`✓ Repository validation passed (${validationResult.modulesCount} modules validated)`);

        // Read spec.json and README.md
        const { packageName, specContent } = readSpecFile(repoPath);
        const readmeContent = readReadmeFile(repoPath);

        // Calculate repository statistics
        core.info('Calculating repository statistics...');
        const repoStats = calculateRepoStats(repoPath);
        core.info(`Total files: ${repoStats.totalFiles}`);
        core.info(`Unpacked size: ${repoStats.totalSize} bytes (${(repoStats.totalSize / 1024).toFixed(2)} KB)`);

        // Build payload
        const payload = buildPayload({
            packageName,
            repoFullName,
            version,
            commitSha,
            repoUrl,
            actor,
            readmeContent,
            specContent,
            unpackedSize: repoStats.totalSize,
            totalFiles: repoStats.totalFiles
        });

        // Get OIDC token
        const token = await getOIDCToken(audience);

        // Publish to registry
        await publishToRegistry(registryUrl, payload, token, retries);

        // Set outputs for use in other workflow steps
        core.setOutput('version', version);
        core.setOutput('package_name', packageName || repoFullName);

    } catch (error) {
        core.setFailed(error.message);
    }
}

// Run the action
run();
