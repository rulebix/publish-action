const fs = require('fs');
const path = require('path');

/**
 * Calculate total size and file count of repository
 * @param {string} dirPath - Directory path to calculate
 * @param {Array} excludeDirs - Directories to exclude (e.g., node_modules, .git)
 * @returns {Object} - Object with totalSize (in bytes) and totalFiles
 */
function calculateRepoStats(dirPath, excludeDirs = ['node_modules', '.git', 'dist']) {
    let totalSize = 0;
    let totalFiles = 0;

    function traverseDirectory(currentPath) {
        const items = fs.readdirSync(currentPath);

        for (const item of items) {
            const itemPath = path.join(currentPath, item);
            const stats = fs.statSync(itemPath);

            // Skip excluded directories
            if (stats.isDirectory()) {
                if (!excludeDirs.includes(item)) {
                    traverseDirectory(itemPath);
                }
            } else {
                totalSize += stats.size;
                totalFiles += 1;
            }
        }
    }

    traverseDirectory(dirPath);

    return {
        totalSize,
        totalFiles
    };
}

module.exports = {
    calculateRepoStats
};
