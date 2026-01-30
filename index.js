const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { validateRepository } = require('./validator');

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
        const ref = github.context.ref;
        let version;

        if (ref.startsWith('refs/tags/')) {
            // If push is a tag, use tag name as version
            version = ref.replace('refs/tags/', '');
            core.info(`Detected tag push: ${version}`);
        } else {
            // If not a tag, use short SHA as version
            const shortSha = github.context.sha.substring(0, 7);
            version = shortSha;
            core.info(`Detected branch push: ${version}`);
        }

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

        // Read package_name and spec content from spec.json
        let packageName = null;
        let specContent = null;
        const specPath = path.join(repoPath, 'spec.json');

        try {
            if (fs.existsSync(specPath)) {
                specContent = fs.readFileSync(specPath, 'utf8');
                const specData = JSON.parse(specContent);
                packageName = specData.name;
                core.info(`Package name from spec.json: ${packageName}`);
                core.info('spec.json found and will be included in payload');
            } else {
                core.warning('spec.json not found in repository root');
            }
        } catch (error) {
            core.warning(`Failed to read spec.json: ${error.message}`);
        }

        // Read README.md from repository if exists
        let readmeContent = null;
        const readmePath = path.join(repoPath, 'README.md');

        try {
            if (fs.existsSync(readmePath)) {
                readmeContent = fs.readFileSync(readmePath, 'utf8');
                core.info('README.md found and will be included in payload');
            } else {
                core.info('README.md not found in repository');
            }
        } catch (error) {
            core.warning(`Failed to read README.md: ${error.message}`);
        }

        // Build JSON payload for registry
        const payload = {
            package_name: packageName,
            repo: repoFullName,
            version: version,
            commit_sha: commitSha,
            repo_url: repoUrl,
            actor: actor,
            readme: readmeContent,
            spec: specContent
        };

        core.info('Payload to be sent:');
        core.info(JSON.stringify(payload, null, 2));

        // Prepare request headers
        let headers = {
            'Content-Type': 'application/json'
        };

        // Get OIDC token for authentication if available
        try {
            const token = await core.getIDToken(audience);
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                core.info('OIDC token successfully obtained and added to headers');
            }
        } catch (error) {
            core.warning('Unable to get OIDC token. Make sure permissions id-token: write is enabled.');
            core.warning(`Error: ${error.message}`);
        }

        // Implement retry logic with exponential backoff
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                core.info(`Attempt ${attempt} of ${retries}: Sending data to ${registryUrl}`);

                // Send POST request to registry
                const response = await axios.post(registryUrl, payload, {
                    headers: headers,
                    timeout: 10000 // 10 second timeout
                });

                core.info(`✓ Successfully published to Rulebix Registry!`);
                core.info(`Status: ${response.status}`);
                core.info(`Response: ${JSON.stringify(response.data)}`);

                // Set outputs for use in other workflow steps
                core.setOutput('version', version);
                core.setOutput('package_name', packageName || repoFullName);

                return; // Success, exit function
            } catch (error) {
                lastError = error;

                // Log detailed error information
                if (error.response) {
                    core.error(`HTTP Error ${error.response.status}: ${error.response.statusText}`);
                    core.error(`Response data: ${JSON.stringify(error.response.data)}`);
                } else if (error.request) {
                    core.error('No response received from server');
                } else {
                    core.error(`Error: ${error.message}`);
                }

                // Wait before retry with exponential backoff
                if (attempt < retries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s...
                    core.info(`Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // If all retries failed, throw error
        throw new Error(`Failed to publish after ${retries} attempts: ${lastError.message}`);

    } catch (error) {
        core.setFailed(error.message);
    }
}

// Run the action
run();
