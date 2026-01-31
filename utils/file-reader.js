const fs = require('fs');
const path = require('path');
const core = require('@actions/core');

/**
 * Read spec.json from repository
 * @param {string} repoPath - Path to repository root
 * @returns {Object} - Object with packageName and specContent
 */
function readSpecFile(repoPath) {
    const specPath = path.join(repoPath, 'spec.json');
    let packageName = null;
    let specContent = null;

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

    return { packageName, specContent };
}

/**
 * Read README.md from repository
 * @param {string} repoPath - Path to repository root
 * @returns {string|null} - README content or null if not found
 */
function readReadmeFile(repoPath) {
    const readmePath = path.join(repoPath, 'README.md');
    let readmeContent = null;

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

    return readmeContent;
}

module.exports = {
    readSpecFile,
    readReadmeFile
};
