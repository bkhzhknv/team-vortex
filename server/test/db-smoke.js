const assert = require('node:assert/strict');

const db = require('../db');
const volunteers = db.prepare('SELECT * FROM volunteers').all();

assert.equal(Array.isArray(volunteers), true);
assert.equal(volunteers.length, 12);
assert.equal(volunteers[0].id, 'v1');

console.log('db smoke test passed');
