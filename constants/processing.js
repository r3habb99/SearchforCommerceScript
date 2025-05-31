/**
 * Processing and Performance Configuration Constants
 * Scalability settings for handling millions of files
 */

const PROCESSING = {
    // Batch processing settings
    BATCH_SIZE: 1000,                  // Items per batch to control memory usage
    CONCURRENCY_LIMIT: 5,              // Parallel file processing limit
    
    // Streaming and file handling
    ENABLE_STREAMING: false,           // Use streaming for large JSON files
    SHARD_OUTPUT: true,                // Split large output files
    MAX_LINES_PER_SHARD: 1000000,     // 1M lines per output file
    
    // Progress and logging
    LOG_PROGRESS_EVERY: 1000,          // Log progress every N items
    
    // Memory management
    MEMORY_THRESHOLD_MB: 512,          // Memory usage threshold for GC
    ENABLE_GC: true,                   // Enable garbage collection
    GC_INTERVAL: 10000,                // GC trigger interval (items)
    
    // Error handling and retry logic
    RETRY_ATTEMPTS: 3,                 // Retry failed operations
    RETRY_DELAY_MS: 1000,              // Delay between retries
    
    // Compression settings
    ENABLE_COMPRESSION: false,         // Compress output files (optional)
    COMPRESSION_LEVEL: 6,              // Gzip compression level (1-9)
    
    // Directory settings
    TEMP_DIR: './temp',                // Temporary directory for processing

    // Checkpointing for large operations
    CHECKPOINT_ENABLED: true,          // Enable checkpointing for resume
    CHECKPOINT_INTERVAL: 10000,        // Save checkpoint every N items
    
    // Performance monitoring
    PERFORMANCE_MONITORING: true,      // Enable performance tracking
    MEMORY_CHECK_INTERVAL: 5000,       // Memory check interval (ms)
    
    // Queue settings
    QUEUE_SETTINGS: {
        MAX_CONCURRENT: 5,
        TIMEOUT: 30000,                // 30 seconds timeout
        RETRY_DELAY: 1000
    }
};

module.exports = {
    PROCESSING
};
