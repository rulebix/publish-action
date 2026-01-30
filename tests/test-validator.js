const { validateRepository } = require('../validator');
const path = require('path');

// Test simple example
console.log('Testing simple example...');
const simpleResult = validateRepository(path.resolve(__dirname, '..', 'examples', 'simple'));
console.log(simpleResult);
console.log('');

// Test advanced example
console.log('Testing advanced example...');
const advancedResult = validateRepository(path.resolve(__dirname, '..', 'examples', 'advanced'));
console.log(advancedResult);
console.log('');

// Test invalid path (should fail)
console.log('Testing invalid path...');
const invalidResult = validateRepository(path.resolve(__dirname, '..', 'nonexistent'));
console.log(invalidResult);
