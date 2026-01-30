const fs = require('fs');
const path = require('path');

// Valid module types
const VALID_MODULE_TYPES = ['rule', 'workflow', 'skill', 'template', 'prompt', 'agent', 'placeholder'];

// Regex for kebab-case validation
const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Validates if a module path contains an index.md file
 * @param {string} basePath - Base path of the repository
 * @param {string} modulePath - Relative path to the module
 * @returns {boolean} - True if index.md exists, false otherwise
 */
function validateModulePath(basePath, modulePath) {
    const fullPath = path.join(basePath, modulePath, 'index.md');
    return fs.existsSync(fullPath);
}

/**
 * Validates if a module type is valid
 * @param {string} type - Module type to validate
 * @returns {boolean} - True if type is valid, false otherwise
 */
function validateModuleType(type) {
    return VALID_MODULE_TYPES.includes(type);
}

/**
 * Validates if a module id is in kebab-case format
 * @param {string} id - Module id to validate
 * @returns {boolean} - True if id is in kebab-case, false otherwise
 */
function validateModuleId(id) {
    return KEBAB_CASE_REGEX.test(id);
}

/**
 * Validates the repository structure based on spec.json
 * @param {string} repoPath - Path to the repository root
 * @returns {Object} - Validation result with success status and errors
 */
function validateRepository(repoPath) {
    const specPath = path.join(repoPath, 'spec.json');

    // Check if spec.json exists
    if (!fs.existsSync(specPath)) {
        return {
            success: false,
            errors: ['spec.json not found in repository root']
        };
    }

    // Read and parse spec.json
    let spec;
    try {
        const specContent = fs.readFileSync(specPath, 'utf8');
        spec = JSON.parse(specContent);
    } catch (error) {
        return {
            success: false,
            errors: [`Failed to parse spec.json: ${error.message}`]
        };
    }

    // Check if modules array exists
    if (!spec.modules || !Array.isArray(spec.modules)) {
        return {
            success: false,
            errors: ['spec.json must contain a "modules" array']
        };
    }

    // Validate each module
    const errors = [];
    for (const module of spec.modules) {
        // Validate module id exists
        if (!module.id) {
            errors.push(`Module is missing an id`);
            continue;
        }

        // Validate module id is kebab-case
        if (!validateModuleId(module.id)) {
            errors.push(`Module "${module.id}" has invalid id format. Id must be in kebab-case (lowercase letters, numbers, and hyphens only)`);
        }

        // Validate module path exists
        if (!module.path) {
            errors.push(`Module "${module.id}" is missing a path`);
            continue;
        }

        // Validate module type
        if (!module.type) {
            errors.push(`Module "${module.id}" is missing a type`);
        } else if (!validateModuleType(module.type)) {
            errors.push(`Module "${module.id}" has invalid type "${module.type}". Valid types are: ${VALID_MODULE_TYPES.join(', ')}`);
        }

        // Validate module path contains index.md
        if (!validateModulePath(repoPath, module.path)) {
            errors.push(`Module "${module.id}" path "${module.path}" does not contain index.md`);
        }
    }

    if (errors.length > 0) {
        return {
            success: false,
            errors
        };
    }

    return {
        success: true,
        message: 'Repository is valid',
        modulesCount: spec.modules.length
    };
}

module.exports = {
    validateRepository,
    validateModulePath,
    validateModuleType,
    validateModuleId,
    VALID_MODULE_TYPES
};
