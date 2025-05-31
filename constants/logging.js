/**
 * Logging Configuration Constants
 * Enhanced logging settings for scalable processing
 */

const LOGGING = {
    // Log levels
    LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug',
        VERBOSE: 'verbose'
    },
    
    // Default logging configuration
    DEFAULT_LEVEL: 'info',
    
    // File logging settings
    ENABLE_FILE_LOGGING: true,
    MAX_LOG_SIZE: '10MB',              // Max log file size
    MAX_LOG_FILES: 5,                  // Max number of log files
    
    // Console logging
    ENABLE_CONSOLE_LOGGING: true,
    ENABLE_COLORS: true,
    
    // Progress bar settings
    ENABLE_PROGRESS_BAR: true,
    PROGRESS_BAR_FORMAT: 'Processing |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}/s',
    PROGRESS_BAR_CHARS: {
        COMPLETE: '\u2588',
        INCOMPLETE: '\u2591'
    },
    
    // Separate error logging
    LOG_ERRORS_SEPARATELY: true,
    
    // Performance logging
    ENABLE_PERFORMANCE_LOGGING: true,
    PERFORMANCE_LOG_INTERVAL: 10000,   // Log performance every N items
    
    // Memory usage logging
    ENABLE_MEMORY_LOGGING: true,
    MEMORY_LOG_INTERVAL: 30000,        // Log memory usage every 30 seconds
    
    // Timestamp formats
    TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    FILENAME_TIMESTAMP_FORMAT: 'YYYY-MM-DD_HH-mm-ss'
};

module.exports = {
    LOGGING
};
