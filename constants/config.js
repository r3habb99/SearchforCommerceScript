/**
 * Main Configuration File
 * Combines all configuration constants for the SearchforCommerceScript project
 */

const { PATHS } = require('./paths');
const { EMBEDDINGS } = require('./embeddings');
const { PROCESSING } = require('./processing');
const { OPTIMIZATION } = require('./optimization');
const { LOGGING } = require('./logging');

// Main configuration object (backward compatible with existing CONFIG)
const CONFIG = {
    // Path configuration
    INPUT_DIRECTORY: PATHS.INPUT_DIRECTORY,
    OUTPUT_DIRECTORY: PATHS.OUTPUT_DIRECTORY,
    FILE_PATTERNS: PATHS.FILE_PATTERNS,
    
    // Embedding configuration
    EMBEDDINGS: EMBEDDINGS,
    
    // Processing limits
    LIMITS: {
        MAX_DESCRIPTION_LENGTH: 2000,
        MAX_CATEGORIES: 10,
        MAX_TITLE_LENGTH: 500
    },
    
    // Processing configuration
    PROCESSING: PROCESSING,
    
    // Logging configuration
    LOGGING: {
        LEVEL: LOGGING.DEFAULT_LEVEL,
        ENABLE_FILE_LOGGING: LOGGING.ENABLE_FILE_LOGGING,
        LOG_DIR: PATHS.LOG_DIR,
        MAX_LOG_SIZE: LOGGING.MAX_LOG_SIZE,
        MAX_LOG_FILES: LOGGING.MAX_LOG_FILES,
        ENABLE_PROGRESS_BAR: LOGGING.ENABLE_PROGRESS_BAR,
        LOG_ERRORS_SEPARATELY: LOGGING.LOG_ERRORS_SEPARATELY
    },
    
    // Optimization configuration (added for backward compatibility)
    OPTIMIZATION: OPTIMIZATION.DEFAULT
};



module.exports = {
    CONFIG
};
