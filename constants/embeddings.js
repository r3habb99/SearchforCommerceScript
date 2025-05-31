/**
 * Embedding Configuration Constants
 * Advanced embedding settings for comprehensive search optimization
 */

const EMBEDDINGS = {
    // Core embedding dimensions and features
    DENSE_DIM: 384,                    // Standard dimension for semantic search
    MAX_SPARSE_FEATURES: 100,          // Increased for better keyword coverage
    MIN_KEYWORD_FREQUENCY: 1,
    
    // Feature toggles
    STOPWORDS_ENABLED: true,
    ENABLE_DENSE: true,
    ENABLE_SPARSE: true,
    ENABLE_HYBRID: true,
    
    // Advanced search optimization weights
    DENSE_WEIGHT: 0.6,                 // Weight for semantic similarity
    SPARSE_WEIGHT: 0.4,                // Weight for keyword matching
    
    // Keyword importance boosting
    KEYWORD_BOOST: {
        'title': 3.0,
        'brand': 2.5,
        'category': 2.0,
        'description': 1.5,
        'features': 1.2
    },
    
    // Multi-language and text processing
    LANGUAGE_DETECTION: true,
    STEMMING_ENABLED: true,
    SYNONYM_EXPANSION: true,
    
    // Precision settings for different optimization levels
    PRECISION_LEVELS: {
        FULL: 6,        // Full precision (6 decimal places)
        HIGH: 5,        // High precision (5 decimal places)
        STANDARD: 4,    // Standard precision (4 decimal places)
        REDUCED: 3,     // Reduced precision (3 decimal places)
        MINIMAL: 2      // Minimal precision (2 decimal places)
    },
    
    // Sparse embedding optimization
    SPARSE_OPTIMIZATION: {
        MAX_FEATURES_FULL: 100,
        MAX_FEATURES_BALANCED: 50,
        MAX_FEATURES_COMPACT: 30,
        MAX_FEATURES_MINIMAL: 20
    }
};

// Text processing patterns for enhanced search
const TEXT_PATTERNS = {
    // Product-specific patterns
    SIZES: /\b(small|medium|large|xl|xxl|\d+\s*(oz|ml|g|kg|lb|lbs|mg|mcg))\b/gi,
    COLORS: /\b(red|blue|green|yellow|black|white|brown|pink|purple|orange|gray|grey)\b/gi,
    BRANDS: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
    NUMBERS: /\b\d+(?:\.\d+)?\b/g,
    
    // Commerce-specific terms
    COMMERCE_TERMS: /\b(organic|natural|premium|professional|clinical|pharmaceutical|supplement|vitamin|protein|creatine|amino|bcaa)\b/gi,
    
    // Action words for search intent
    ACTION_WORDS: /\b(buy|purchase|order|get|find|search|looking|need|want|best|top|review)\b/gi
};

// Synonym expansion for better search coverage
const SYNONYMS = {
    'supplement': ['vitamin', 'nutrient', 'pill', 'capsule', 'tablet'],
    'protein': ['whey', 'casein', 'isolate', 'concentrate'],
    'muscle': ['strength', 'power', 'building', 'growth'],
    'weight': ['mass', 'bulk', 'size', 'gain', 'loss'],
    'energy': ['boost', 'power', 'stamina', 'endurance'],
    'health': ['wellness', 'fitness', 'nutrition', 'healthy']
};

// Pattern-based boost multipliers
const PATTERN_BOOSTS = {
    COMMERCE_TERMS: 1.5,
    SIZES: 1.3,
    COLORS: 1.2,
    NUMBERS: 1.1,
    BRANDS: 1.4
};

module.exports = {
    EMBEDDINGS,
    TEXT_PATTERNS,
    SYNONYMS,
    PATTERN_BOOSTS
};
