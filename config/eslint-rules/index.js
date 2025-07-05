module.exports = {
  rules: {
    'auth-consistency': require('./auth-consistency.js'),
    'api-security': require('./api-security.js'),
    'type-safety': require('./type-safety.js'),
    'database-performance': require('./database-performance.js'),
    'error-handling': require('./error-handling.js'),
  },
};