/**
 * This test file has been removed as part of the session system migration.
 * 
 * The old AsyncLocalStorage-based session system has been replaced with a
 * simpler global session manager that doesn't suffer from the override issues
 * that this test was documenting.
 * 
 * Session tracking is now handled globally by setGlobalSessionManager() and
 * getCurrentHeliconeHeaders() in the Claude wrapper.
 */