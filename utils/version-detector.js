const core = require('@actions/core');

/**
 * Detect version from git ref
 * @param {string} ref - Git reference (e.g., refs/tags/v1.0.0 or refs/heads/main)
 * @param {string} sha - Commit SHA
 * @returns {string} - Version string (tag name or short SHA)
 */
function detectVersion(ref, sha) {
    let version;

    if (ref.startsWith('refs/tags/')) {
        // If push is a tag, use tag name as version
        version = ref.replace('refs/tags/', '');
        core.info(`Detected tag push: ${version}`);
    } else {
        // If not a tag, use short SHA as version
        const shortSha = sha.substring(0, 7);
        version = shortSha;
        core.info(`Detected branch push: ${version}`);
    }

    return version;
}

module.exports = {
    detectVersion
};
