const core = require('@actions/core');
const axios = require('axios');

/**
 * Get OIDC token for authentication
 * @param {string} audience - OIDC audience
 * @returns {Promise<string|null>} - OIDC token or null if unavailable
 */
async function getOIDCToken(audience) {
    try {
        const token = await core.getIDToken(audience);
        if (token) {
            core.info('OIDC token successfully obtained and added to headers');
            return token;
        }
    } catch (error) {
        core.warning('Unable to get OIDC token. Make sure permissions id-token: write is enabled.');
        core.warning(`Error: ${error.message}`);
    }
    return null;
}

/**
 * Publish payload to registry with retry logic
 * @param {string} registryUrl - Registry API URL
 * @param {Object} payload - Data to send
 * @param {string|null} token - OIDC token for authentication
 * @param {number} retries - Maximum number of retry attempts
 * @returns {Promise<Object>} - Response data from registry
 */
async function publishToRegistry(registryUrl, payload, token, retries) {
    // Prepare request headers
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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

            return response.data;
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
}

module.exports = {
    getOIDCToken,
    publishToRegistry
};
