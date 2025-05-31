/**
 * Optimization Configuration Constants
 * File size optimization settings for different use cases
 */

const OPTIMIZATION = {
    // Default optimization settings
    DEFAULT: {
        ENABLE_COMPRESSION: false,
        REDUCE_PRECISION: false,
        DECIMAL_PLACES: 6,
        MINIMIZE_JSON: false,
        SEPARATE_EMBEDDINGS: false,
        EMBEDDING_COMPRESSION: false,
        OPTIMIZE_SPARSE_FORMAT: false
    },
    
    // Optimization levels
    LEVELS: {
        FULL: {
            ENABLE_COMPRESSION: false,
            REDUCE_PRECISION: false,
            DECIMAL_PLACES: 6,
            MINIMIZE_JSON: false,
            SEPARATE_EMBEDDINGS: false,
            EMBEDDING_COMPRESSION: false,
            OPTIMIZE_SPARSE_FORMAT: false,
            MAX_DESCRIPTION_LENGTH: null,
            MAX_CATEGORIES: null,
            EXPECTED_REDUCTION: 0
        },
        
        OPTIMIZED: {
            ENABLE_COMPRESSION: false,
            REDUCE_PRECISION: true,
            DECIMAL_PLACES: 4,
            MINIMIZE_JSON: true,
            SEPARATE_EMBEDDINGS: false,
            EMBEDDING_COMPRESSION: true,
            OPTIMIZE_SPARSE_FORMAT: true,
            MAX_DESCRIPTION_LENGTH: 1000,
            MAX_CATEGORIES: 8,
            EXPECTED_REDUCTION: 35
        },
        
        BALANCED: {
            ENABLE_COMPRESSION: false,
            REDUCE_PRECISION: true,
            DECIMAL_PLACES: 4,
            MINIMIZE_JSON: true,
            SEPARATE_EMBEDDINGS: false,
            EMBEDDING_COMPRESSION: true,
            OPTIMIZE_SPARSE_FORMAT: true,
            MAX_DESCRIPTION_LENGTH: 500,
            MAX_CATEGORIES: 5,
            EXPECTED_REDUCTION: 60
        },
        
        COMPACT: {
            ENABLE_COMPRESSION: false,
            REDUCE_PRECISION: true,
            DECIMAL_PLACES: 3,
            MINIMIZE_JSON: true,
            SEPARATE_EMBEDDINGS: false,
            EMBEDDING_COMPRESSION: true,
            OPTIMIZE_SPARSE_FORMAT: true,
            MAX_DESCRIPTION_LENGTH: 300,
            MAX_CATEGORIES: 3,
            EXPECTED_REDUCTION: 83
        },
        
        MINIMAL: {
            ENABLE_COMPRESSION: false,
            REDUCE_PRECISION: true,
            DECIMAL_PLACES: 3,
            MINIMIZE_JSON: true,
            SEPARATE_EMBEDDINGS: true,
            EMBEDDING_COMPRESSION: true,
            OPTIMIZE_SPARSE_FORMAT: true,
            MAX_DESCRIPTION_LENGTH: 200,
            MAX_CATEGORIES: 3,
            EXPECTED_REDUCTION: 88
        },
        
        COMPRESSED: {
            ENABLE_COMPRESSION: true,
            REDUCE_PRECISION: true,
            DECIMAL_PLACES: 4,
            MINIMIZE_JSON: true,
            SEPARATE_EMBEDDINGS: false,
            EMBEDDING_COMPRESSION: true,
            OPTIMIZE_SPARSE_FORMAT: true,
            MAX_DESCRIPTION_LENGTH: 500,
            MAX_CATEGORIES: 5,
            EXPECTED_REDUCTION: 80
        }
    }
};



// Size estimation formulas (bytes per product)
const SIZE_ESTIMATES = {
    FULL: 28000,                       // ~28KB per product
    OPTIMIZED: 18000,                  // ~18KB per product (35% smaller)
    BALANCED: 11000,                   // ~11KB per product (60% smaller)
    COMPACT: 8000,                     // ~8KB per product (70% smaller)
    MINIMAL: 3000,                     // ~3KB per product (88% smaller)
    COMPRESSED: 5000                   // ~5KB per product (80% smaller with gzip)
};

module.exports = {
    OPTIMIZATION,
    SIZE_ESTIMATES
};
