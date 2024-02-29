#!/usr/bin/env node
const { createHash } = require('crypto');

function hash(string) {
  return createHash('sha256').update(string).digest('hex');
}

hash('vkameswaran/test')