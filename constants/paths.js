/**
 * File and Directory Path Constants
 * Centralized path configuration for the SearchforCommerceScript project
 */



// Base directories
const PATHS = {
    // Input/Output directories
    INPUT_DIRECTORY: './Data',
    OUTPUT_DIRECTORY: './output',
    OPTIMIZED_DIRECTORY: './optimized',
    
    // Processing directories
    TEMP_DIR: './temp',
    LOG_DIR: './logs',
    
    // Script directories
    SCRIPTS_DIR: './scripts',
    CONVERSION_SCRIPTS_DIR: './scripts/conversion',
    OPTIMIZATION_SCRIPTS_DIR: './scripts/optimization',
    CONSTANTS_DIR: './constants',
    
    // Data directories
    DATA_DIR: './Data',
    BACKUP_DIR: './backup',
    
    // Output file patterns
    OUTPUT_FILES: {
        COMBINED_OUTPUT: 'all_data_files_commerce_ready.jsonl',
        CONVERSION_REPORT: 'dynamic_conversion_report.json',
        SHARD_PREFIX: 'commerce_ready_shard_',
        OPTIMIZED_SUFFIX: {
            MINIMAL: '_minimal.jsonl',
            BALANCED: '_balanced.jsonl',
            COMPACT: '_compact.jsonl',
            COMPRESSED: '_compressed.jsonl.gz'
        }
    },
    
    // File patterns for processing
    FILE_PATTERNS: {
        INCLUDE: /\.json$/i,  // Include all .json files
        EXCLUDE: /\.(log|tmp|backup)$/i  // Exclude log, tmp, backup files
    },
    
    // Log file names
    LOG_FILES: {
        CONVERSION: 'conversion.log',
        ERRORS: 'errors.log',
        PERFORMANCE: 'performance.log',
        DEBUG: 'debug.log'
    }
};

module.exports = {
    PATHS
};
