/**
 * Constants Index File
 * Central export point for all configuration constants
 */

// Import all constant modules
const { PATHS } = require('./paths');
const { EMBEDDINGS, TEXT_PATTERNS, SYNONYMS, PATTERN_BOOSTS } = require('./embeddings');
const { PROCESSING } = require('./processing');
const { OPTIMIZATION, SIZE_ESTIMATES } = require('./optimization');
const { LOGGING } = require('./logging');
const { CONFIG } = require('./config');

// Export individual constant groups
module.exports = {
    // Main configuration (backward compatible)
    CONFIG,

    // Individual constant groups
    PATHS,
    EMBEDDINGS,
    TEXT_PATTERNS,
    SYNONYMS,
    PATTERN_BOOSTS,
    PROCESSING,
    OPTIMIZATION,
    SIZE_ESTIMATES,
    LOGGING,
    
    // Convenience exports for common use cases
    COMMON: {
        // Most frequently used paths
        INPUT_DIR: PATHS.INPUT_DIRECTORY,
        OUTPUT_DIR: PATHS.OUTPUT_DIRECTORY,
        OPTIMIZED_DIR: PATHS.OPTIMIZED_DIRECTORY,
        LOG_DIR: PATHS.LOG_DIR,
        
        // Most frequently used processing settings
        BATCH_SIZE: PROCESSING.BATCH_SIZE,
        CONCURRENCY_LIMIT: PROCESSING.CONCURRENCY_LIMIT,
        MEMORY_THRESHOLD: PROCESSING.MEMORY_THRESHOLD_MB,
        
        // Most frequently used embedding settings
        DENSE_DIM: EMBEDDINGS.DENSE_DIM,
        MAX_SPARSE_FEATURES: EMBEDDINGS.MAX_SPARSE_FEATURES,
        
        // Most frequently used optimization levels
        OPTIMIZATION_LEVELS: Object.keys(OPTIMIZATION.LEVELS),
        
        // File extensions and patterns
        JSON_PATTERN: PATHS.FILE_PATTERNS.INCLUDE,
        EXCLUDE_PATTERN: PATHS.FILE_PATTERNS.EXCLUDE
    }
};

// Backward compatibility - export CONFIG as default
module.exports.default = CONFIG;
