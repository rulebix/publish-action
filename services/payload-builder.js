const core = require('@actions/core');

/**
 * Build payload for registry API
 * @param {Object} params - Parameters for building payload
 * @returns {Object} - Payload object ready to send to registry
 */
function buildPayload({
    packageName,
    repoFullName,
    version,
    commitSha,
    repoUrl,
    actor,
    readmeContent,
    specContent,
    unpackedSize,
    totalFiles
}) {
    const payload = {
        package_name: packageName,
        repo: repoFullName,
        version: version,
        commit_sha: commitSha,
        repo_url: repoUrl,
        actor: actor,
        readme: readmeContent,
        spec: specContent,
        unpacked_size: unpackedSize,
        total_files: totalFiles
    };

    core.info('Payload to be sent:');
    core.info(JSON.stringify(payload, null, 2));

    return payload;
}

module.exports = {
    buildPayload
};
