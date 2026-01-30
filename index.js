const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

/**
 * Main function to publish repository metadata to Rulebix Registry
 */
async function run() {
    try {
        // Get inputs from action.yml
        const registryUrl = core.getInput('registry_url');
        const retries = parseInt(core.getInput('retries'), 10);

        core.info(`Registry URL: ${registryUrl}`);
        core.info(`Max retries: ${retries}`);

        // Detect version from git ref
        const ref = github.context.ref;
        let version;

        if (ref.startsWith('refs/tags/')) {
            // If push is a tag, use tag name as version
            version = ref.replace('refs/tags/', '');
            core.info(`Detected tag push: ${version}`);
        } else {
            // If not a tag, use dev-<short-sha> format
            const shortSha = github.context.sha.substring(0, 7);
            version = `dev-${shortSha}`;
            core.info(`Detected branch push: ${version}`);
        }

        // Get repository information from GitHub context
        const { owner, repo } = github.context.repo;
        const packageName = `${owner}/${repo}`;
        const commitSha = github.context.sha;
        const repoUrl = `https://github.com/${owner}/${repo}`;
        const actor = github.context.actor;

        // Build JSON payload for registry
        const payload = {
            package_name: packageName,
            version: version,
            commit_sha: commitSha,
            repo_url: repoUrl,
            actor: actor
        };

        core.info('Payload to be sent:');
        core.info(JSON.stringify(payload, null, 2));

        // Prepare request headers
        let headers = {
            'Content-Type': 'application/json'
        };

        // Get OIDC token for authentication if available
        try {
            const token = await core.getIDToken();
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
                core.setOutput('package_name', packageName);

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
