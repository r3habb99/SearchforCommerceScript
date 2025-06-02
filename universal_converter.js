/**
 * Universal JSON to Commerce Format Converter with Advanced Embeddings
 *
 * This is the BEST conversion script that handles both JSON files with:
 * - Dense embeddings: 384-dimensional vectors for semantic search
 * - Sparse embeddings: TF-IDF style keyword vectors for exact matching
 * - Hybrid embeddings: Combination of both for optimal search results
 * - Comprehensive error handling and validation
 * - Support for both BPNProductsDataNew.json and vertex_catalog.json
 */

const fs = require('fs');
const path = require('path');
const natural = require('natural');

// Note: Enhanced dependencies for scalability (Transform, pipeline, Worker threads)
// were removed as they are not currently used in the implementation.
// These can be re-added when implementing streaming transforms or worker thread processing.

// Import constants from the constants folder
const {
    CONFIG,
    TEXT_PATTERNS,
    SYNONYMS,
    PATTERN_BOOSTS
} = require('./constants');

// Note: Install these packages for production use:
// npm install stream-json p-queue winston cli-progress
// For now, we'll use fallbacks if packages are not available

let StreamArray, PQueue, winston, cliProgress;

try {
    StreamArray = require('stream-json/streamers/StreamArray');
} catch (e) {
    console.warn('⚠️  stream-json not installed. Using fallback JSON parsing.');
    StreamArray = null;
}

try {
    PQueue = require('p-queue').default;
} catch (e) {
    console.warn('⚠️  p-queue not installed. Using sequential processing.');
    PQueue = null;
}

try {
    winston = require('winston');
} catch (e) {
    console.warn('⚠️  winston not installed. Using console logging.');
    winston = null;
}

try {
    cliProgress = require('cli-progress');
} catch (e) {
    console.warn('⚠️  cli-progress not installed. Using basic progress logging.');
    cliProgress = null;
}

// Note: All configuration constants are now imported from ./constants/
// This includes CONFIG, EMBEDDINGS, PROCESSING, LOGGING, etc.

/**
 * Enhanced Logger for scalable processing
 */
class ScalableLogger {
    constructor() {
        this.setupLogger();
        this.progressBar = null;
        this.startTime = Date.now();
    }

    setupLogger() {
        if (winston) {
            // Setup Winston logger if available
            const logDir = path.resolve(__dirname, CONFIG.LOGGING.LOG_DIR);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            this.logger = winston.createLogger({
                level: CONFIG.LOGGING.LEVEL,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.errors({ stack: true }),
                    winston.format.json()
                ),
                transports: [
                    new winston.transports.File({
                        filename: path.join(logDir, 'conversion.log'),
                        maxsize: 10485760, // 10MB
                        maxFiles: CONFIG.LOGGING.MAX_LOG_FILES
                    }),
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.simple()
                        )
                    })
                ]
            });

            if (CONFIG.LOGGING.LOG_ERRORS_SEPARATELY) {
                this.logger.add(new winston.transports.File({
                    filename: path.join(logDir, 'errors.log'),
                    level: 'error',
                    maxsize: 10485760,
                    maxFiles: 3
                }));
            }
        } else {
            // Fallback to console logging
            this.logger = {
                info: (msg, meta) => console.log(`ℹ️  ${msg}`, meta || ''),
                warn: (msg, meta) => console.warn(`⚠️  ${msg}`, meta || ''),
                error: (msg, meta) => console.error(`❌ ${msg}`, meta || ''),
                debug: (msg, meta) => console.log(`🐛 ${msg}`, meta || '')
            };
        }
    }

    initProgressBar(total, label = 'Processing') {
        if (cliProgress && CONFIG.LOGGING.ENABLE_PROGRESS_BAR) {
            this.progressBar = new cliProgress.SingleBar({
                format: `${label} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}/s`,
                barCompleteChar: '\u2588',
                barIncompleteChar: '\u2591',
                hideCursor: true
            });
            this.progressBar.start(total, 0);
        }
    }

    updateProgress(current, speed = null) {
        if (this.progressBar) {
            this.progressBar.update(current, { speed: speed || 'N/A' });
        } else if (current % CONFIG.PROCESSING.LOG_PROGRESS_EVERY === 0) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const rate = (current / elapsed).toFixed(2);
            this.info(`Progress: ${current} items processed (${rate}/s)`);
        }
    }

    stopProgress() {
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = null;
        }
    }

    info(message, meta) { this.logger.info(message, meta); }
    warn(message, meta) { this.logger.warn(message, meta); }
    error(message, meta) { this.logger.error(message, meta); }
    debug(message, meta) { this.logger.debug(message, meta); }
}

/**
 * Memory Monitor for tracking usage
 */
class MemoryMonitor {
    constructor() {
        this.checkInterval = null;
        this.logger = new ScalableLogger();
    }

    startMonitoring() {
        this.checkInterval = setInterval(() => {
            const usage = process.memoryUsage();
            const usedMB = Math.round(usage.heapUsed / 1024 / 1024);

            if (usedMB > CONFIG.PROCESSING.MEMORY_THRESHOLD_MB) {
                this.logger.warn(`High memory usage: ${usedMB}MB`);
                if (global.gc) {
                    global.gc();
                    this.logger.info('Garbage collection triggered');
                }
            }
        }, 5000); // Check every 5 seconds
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    getUsage() {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
            rss: Math.round(usage.rss / 1024 / 1024)
        };
    }
}

/**
 * Streaming JSON Parser for large files
 */
class StreamingJSONParser {
    constructor(logger) {
        this.logger = logger;
    }

    async parseJSONFile(filePath) {
        if (StreamArray && CONFIG.PROCESSING.ENABLE_STREAMING) {
            return this.parseWithStreaming(filePath);
        } else {
            return this.parseWithFallback(filePath);
        }
    }

    async parseWithStreaming(filePath) {
        this.logger.info(`Using streaming parser for: ${path.basename(filePath)}`);

        return new Promise((resolve, reject) => {
            const products = [];
            let isVertexFormat = false;

            // First, check if this is a vertex catalog format
            try {
                const sampleData = fs.readFileSync(filePath, 'utf8').substring(0, 1000);
                if (sampleData.includes('"products":[')) {
                    isVertexFormat = true;
                }
            } catch (error) {
                // Continue with normal parsing
            }

            if (isVertexFormat) {
                // Handle vertex catalog format with nested products
                const stream = fs.createReadStream(filePath)
                    .pipe(StreamArray.withParser('products.*'));

                stream.on('data', ({ value }) => {
                    products.push(value);
                });

                stream.on('end', () => {
                    this.logger.info(`Streaming parse complete: ${products.length} items`);
                    resolve(products);
                });

                stream.on('error', (error) => {
                    this.logger.error(`Streaming parse error: ${error.message}`);
                    reject(error);
                });
            } else {
                // Handle direct array format
                const stream = fs.createReadStream(filePath)
                    .pipe(StreamArray.withParser());

                stream.on('data', ({ value }) => {
                    products.push(value);
                });

                stream.on('end', () => {
                    this.logger.info(`Streaming parse complete: ${products.length} items`);
                    resolve(products);
                });

                stream.on('error', (error) => {
                    this.logger.error(`Streaming parse error: ${error.message}`);
                    reject(error);
                });
            }
        });
    }

    async parseWithFallback(filePath) {
        this.logger.info(`Using fallback parser for: ${path.basename(filePath)}`);

        try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(rawData);

            // Handle different JSON structures
            if (Array.isArray(jsonData)) {
                return jsonData;
            } else if (jsonData.products && Array.isArray(jsonData.products)) {
                return jsonData.products;
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
                return jsonData.data;
            } else if (jsonData.items && Array.isArray(jsonData.items)) {
                return jsonData.items;
            } else {
                return [jsonData]; // Single object
            }
        } catch (error) {
            this.logger.error(`Fallback parse error: ${error.message}`);
            throw error;
        }
    }
}

/**
 * Enhanced text processing utilities - Optimized for comprehensive search
 */
class TextProcessor {
    constructor() {
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.stopwords = new Set(natural.stopwords);

        // Use patterns and synonyms from constants
        this.searchPatterns = {
            sizes: TEXT_PATTERNS.SIZES,
            colors: TEXT_PATTERNS.COLORS,
            brands: TEXT_PATTERNS.BRANDS,
            numbers: TEXT_PATTERNS.NUMBERS,
            commerceTerms: TEXT_PATTERNS.COMMERCE_TERMS,
            actionWords: TEXT_PATTERNS.ACTION_WORDS
        };

        // Use synonyms from constants
        this.synonyms = SYNONYMS;
    }

    /**
     * Advanced text cleaning with commerce-specific optimizations
     */
    cleanText(text) {
        if (!text || typeof text !== 'string') return '';

        // Remove HTML tags and entities
        text = text.replace(/<[^>]*>/g, ' ');
        text = text.replace(/&[a-zA-Z0-9#]+;/g, ' ');

        // Preserve important punctuation for product codes
        text = text.replace(/[^\w\s\-\.\(\)\[\]\/]/g, ' ');

        // Normalize whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }

    /**
     * Enhanced keyword extraction with weighted importance and search optimization
     */
    extractKeywords(text, maxFeatures = CONFIG.EMBEDDINGS.MAX_SPARSE_FEATURES, context = 'general') {
        const cleanedText = this.cleanText(text.toLowerCase());
        const tokens = this.tokenizer.tokenize(cleanedText);

        if (!tokens || tokens.length === 0) return [];

        // Enhanced filtering with context awareness
        const filteredTokens = tokens.filter(token => {
            // Basic filters
            if (token.length < 2 || this.stopwords.has(token)) return false;

            // Keep alphanumeric tokens and important patterns
            if (!/^[a-zA-Z0-9]/.test(token)) return false;

            // Keep numbers if they might be important (sizes, quantities, etc.)
            if (/^\d+$/.test(token) && parseInt(token) > 0 && parseInt(token) < 10000) return true;

            // Keep alphabetic tokens
            return /^[a-zA-Z]/.test(token);
        });

        // Calculate enhanced term frequency with context weighting
        const termFreq = {};
        const contextBoosts = this.getContextBoosts(context);

        filteredTokens.forEach(token => {
            const stemmed = CONFIG.EMBEDDINGS.STEMMING_ENABLED ? this.stemmer.stem(token) : token;
            const baseWeight = 1;

            // Apply context-specific boosts
            let boost = contextBoosts[token] || contextBoosts[stemmed] || 1;

            // Apply pattern-based boosts
            boost *= this.getPatternBoost(token);

            termFreq[stemmed] = (termFreq[stemmed] || 0) + (baseWeight * boost);
        });

        // Add synonym expansion if enabled
        if (CONFIG.EMBEDDINGS.SYNONYM_EXPANSION) {
            this.expandSynonyms(termFreq, filteredTokens);
        }

        // Sort by weighted frequency and return top keywords
        const totalTokens = filteredTokens.length;
        return Object.entries(termFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxFeatures)
            .map(([term, freq]) => ({
                term,
                weight: parseFloat((freq / totalTokens).toFixed(4)),
                rawFreq: freq
            }));
    }

    /**
     * Get context-specific keyword boosts
     */
    getContextBoosts(context) {
        const boosts = CONFIG.EMBEDDINGS.KEYWORD_BOOST || {};

        // Add context-specific boosts
        if (context === 'title') return { ...boosts, ...{ title: 3.0 } };
        if (context === 'description') return { ...boosts, ...{ description: 1.5 } };
        if (context === 'category') return { ...boosts, ...{ category: 2.0 } };
        if (context === 'brand') return { ...boosts, ...{ brand: 2.5 } };

        return boosts;
    }

    /**
     * Get pattern-based boosts for special terms
     */
    getPatternBoost(token) {
        let boost = 1.0;

        // Use boost values from constants
        if (this.searchPatterns.commerceTerms.test(token)) boost *= PATTERN_BOOSTS.COMMERCE_TERMS;
        if (this.searchPatterns.sizes.test(token)) boost *= PATTERN_BOOSTS.SIZES;
        if (this.searchPatterns.colors.test(token)) boost *= PATTERN_BOOSTS.COLORS;
        if (this.searchPatterns.numbers.test(token)) boost *= PATTERN_BOOSTS.NUMBERS;
        if (this.searchPatterns.brands.test(token)) boost *= PATTERN_BOOSTS.BRANDS;

        return boost;
    }

    /**
     * Expand keywords with synonyms for better search coverage
     */
    expandSynonyms(termFreq, originalTokens) {
        const expansions = {};

        Object.keys(termFreq).forEach(term => {
            if (this.synonyms[term]) {
                this.synonyms[term].forEach(synonym => {
                    const stemmedSynonym = CONFIG.EMBEDDINGS.STEMMING_ENABLED ?
                        this.stemmer.stem(synonym) : synonym;

                    // Add synonym with reduced weight
                    if (!termFreq[stemmedSynonym]) {
                        expansions[stemmedSynonym] = termFreq[term] * 0.5;
                    }
                });
            }
        });

        // Add expansions to term frequency
        Object.assign(termFreq, expansions);
    }

    /**
     * Extract searchable patterns for enhanced matching
     */
    extractSearchPatterns(text) {
        const patterns = {};

        // Extract sizes
        const sizes = text.match(this.searchPatterns.sizes) || [];
        if (sizes.length > 0) patterns.sizes = sizes;

        // Extract colors
        const colors = text.match(this.searchPatterns.colors) || [];
        if (colors.length > 0) patterns.colors = colors;

        // Extract potential brand names
        const brands = text.match(this.searchPatterns.brands) || [];
        if (brands.length > 0) patterns.brands = brands.slice(0, 3); // Limit to top 3

        // Extract numbers
        const numbers = text.match(this.searchPatterns.numbers) || [];
        if (numbers.length > 0) patterns.numbers = numbers.slice(0, 5); // Limit to top 5

        return patterns;
    }
}

/**
 * Advanced embedding generator
 */
class EmbeddingGenerator {
    constructor() {
        this.textProcessor = new TextProcessor();
    }

    /**
     * Generate deterministic hash from string
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Generate dense embedding (384-dimensional vector)
     * In production, replace with real embedding service
     */
    generateDenseEmbedding(text) {
        if (!CONFIG.EMBEDDINGS.ENABLE_DENSE) return null;

        const hash = this.hashString(text);
        const embedding = [];

        for (let i = 0; i < CONFIG.EMBEDDINGS.DENSE_DIM; i++) {
            const seed = hash + i;
            const value = (Math.sin(seed) * 10000) % 1;
            embedding.push(parseFloat(value.toFixed(6)));
        }

        // L2 normalization
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }

    /**
     * Generate multiple sparse embeddings for comprehensive search coverage
     */
    generateSparseEmbedding(text, searchableComponents = null) {
        if (!CONFIG.EMBEDDINGS.ENABLE_SPARSE) return null;

        // Generate multiple sparse embeddings for different search scenarios
        const sparseEmbeddings = {
            // Primary sparse embedding - general keywords
            general: this.textProcessor.extractKeywords(text, CONFIG.EMBEDDINGS.MAX_SPARSE_FEATURES, 'general'),

            // Title-focused sparse embedding
            title: searchableComponents?.title ?
                this.textProcessor.extractKeywords(searchableComponents.title, 20, 'title') : [],

            // Category-focused sparse embedding
            category: searchableComponents?.categories ?
                this.textProcessor.extractKeywords(searchableComponents.categories, 15, 'category') : [],

            // Brand-focused sparse embedding
            brand: searchableComponents?.brands ?
                this.textProcessor.extractKeywords(searchableComponents.brands, 10, 'brand') : [],

            // Attribute-focused sparse embedding
            attributes: searchableComponents?.attributes ?
                this.textProcessor.extractKeywords(searchableComponents.attributes, 25, 'attributes') : []
        };

        // Combine all sparse embeddings with proper weighting
        const combinedKeywords = new Map();

        // Add general keywords with base weight
        sparseEmbeddings.general.forEach(kw => {
            combinedKeywords.set(kw.term, (combinedKeywords.get(kw.term) || 0) + kw.weight);
        });

        // Add title keywords with high weight
        sparseEmbeddings.title.forEach(kw => {
            combinedKeywords.set(kw.term, (combinedKeywords.get(kw.term) || 0) + (kw.weight * 2.5));
        });

        // Add category keywords with medium-high weight
        sparseEmbeddings.category.forEach(kw => {
            combinedKeywords.set(kw.term, (combinedKeywords.get(kw.term) || 0) + (kw.weight * 2.0));
        });

        // Add brand keywords with medium-high weight
        sparseEmbeddings.brand.forEach(kw => {
            combinedKeywords.set(kw.term, (combinedKeywords.get(kw.term) || 0) + (kw.weight * 2.0));
        });

        // Add attribute keywords with medium weight
        sparseEmbeddings.attributes.forEach(kw => {
            combinedKeywords.set(kw.term, (combinedKeywords.get(kw.term) || 0) + (kw.weight * 1.5));
        });

        // Sort by combined weight and format for Vertex AI
        const finalKeywords = Array.from(combinedKeywords.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, CONFIG.EMBEDDINGS.MAX_SPARSE_FEATURES)
            .map(([term, weight]) => `${term}:${weight.toFixed(4)}`);

        return finalKeywords;
    }

    /**
     * Generate hybrid embedding metadata
     */
    generateHybridMetadata(text, denseEmbedding, sparseEmbedding) {
        if (!CONFIG.EMBEDDINGS.ENABLE_HYBRID) return null;

        return {
            text_length: text.length,
            dense_norm: denseEmbedding ? Math.sqrt(denseEmbedding.reduce((sum, val) => sum + val * val, 0)) : 0,
            sparse_features: sparseEmbedding ? sparseEmbedding.length : 0,
            hybrid_score: (denseEmbedding && sparseEmbedding) ?
                (denseEmbedding.length + sparseEmbedding.length) / 2 : 0
        };
    }

    /**
     * Extract comprehensive searchable text optimized for vertex_catalog format
     */
    extractSearchableText(product, format = 'auto') {
        let searchableComponents = {
            title: '',
            description: '',
            categories: '',
            brands: '',
            attributes: '',
            keywords: '',
            specifications: ''
        };

        // Auto-detect format if not specified
        if (format === 'auto') {
            if (product.title || product.categories) {
                format = 'vertex';
            } else {
                format = 'generic';
            }
        }

        if (format === 'vertex' || format === 'generic') {
            // Vertex catalog format (primary focus) and generic format
            searchableComponents.title = this.textProcessor.cleanText(product.title || product.name || '');
            searchableComponents.description = this.textProcessor.cleanText(product.description || '');
            searchableComponents.categories = (product.categories || []).map(cat => this.textProcessor.cleanText(cat)).join(' ');
            searchableComponents.brands = (product.brands || []).map(brand => this.textProcessor.cleanText(brand)).join(' ');

            // Extract attributes from vertex format
            if (product.attributes) {
                const attributeTexts = [];
                Object.values(product.attributes).forEach(attr => {
                    if (attr.text && Array.isArray(attr.text)) {
                        attributeTexts.push(...attr.text);
                    } else if (attr.numbers && Array.isArray(attr.numbers)) {
                        attributeTexts.push(...attr.numbers.map(String));
                    } else if (typeof attr === 'string') {
                        attributeTexts.push(attr);
                    }
                });
                searchableComponents.attributes = attributeTexts.join(' ');
            }

            // Extract additional searchable fields
            const additionalFields = [
                product.tags || [],
                product.features || [],
                product.specifications || [],
                product.keywords || []
            ].flat().join(' ');
            searchableComponents.specifications = additionalFields;

            // Extract price information as searchable text
            if (product.priceInfo || product.price) {
                const priceInfo = product.priceInfo || product.price;
                if (priceInfo.price) {
                    searchableComponents.specifications += ` ${priceInfo.price} ${priceInfo.currencyCode || 'USD'}`;
                }
            }
        }

        // Build weighted searchable text with enhanced importance
        const weightedText = [
            // Title gets highest weight (5x)
            ...Array(5).fill(searchableComponents.title),

            // Categories get high weight (3x) - important for filtering
            ...Array(3).fill(searchableComponents.categories),

            // Brands get high weight (3x) - important for brand searches
            ...Array(3).fill(searchableComponents.brands),

            // Description gets medium weight (2x)
            ...Array(2).fill(searchableComponents.description),

            // Attributes get medium weight (2x) - important for specific searches
            ...Array(2).fill(searchableComponents.attributes),

            // Keywords and specifications get base weight (1x)
            searchableComponents.keywords,
            searchableComponents.specifications
        ].filter(Boolean).join(' ');

        // Extract and append search patterns for enhanced matching
        const patterns = this.textProcessor.extractSearchPatterns(weightedText);
        let patternText = '';
        if (patterns.sizes) patternText += ' ' + patterns.sizes.join(' ');
        if (patterns.colors) patternText += ' ' + patterns.colors.join(' ');
        if (patterns.numbers) patternText += ' ' + patterns.numbers.join(' ');

        const finalText = (weightedText + patternText).substring(0, CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH * 3);

        return finalText;
    }

    /**
     * Add comprehensive embeddings optimized for vertex_catalog format and search scenarios
     */
    addEmbeddingsToProduct(product, format = 'auto') {
        try {
            // Extract searchable text with component breakdown
            const searchableText = this.extractSearchableText(product, format);

            if (!searchableText.trim()) {
                console.warn(`⚠️  No searchable text found for product: ${product.id || 'unknown'}`);
                return product;
            }

            // Extract searchable components for enhanced embedding generation
            const searchableComponents = this.extractSearchableComponents(product, format);

            // Generate multiple types of dense embeddings for different search scenarios
            const denseEmbeddings = this.generateMultipleDenseEmbeddings(searchableText, searchableComponents);

            // Generate enhanced sparse embeddings with component-based weighting
            const sparseEmbedding = this.generateSparseEmbedding(searchableText, searchableComponents);

            // Generate comprehensive hybrid metadata
            const hybridMetadata = this.generateEnhancedHybridMetadata(
                searchableText, denseEmbeddings, sparseEmbedding, searchableComponents
            );

            // Clone product to avoid mutation
            const productWithEmbeddings = JSON.parse(JSON.stringify(product));

            // Ensure attributes object exists
            if (!productWithEmbeddings.attributes) {
                productWithEmbeddings.attributes = {};
            }

            // Add primary dense embedding (semantic search)
            if (denseEmbeddings.primary) {
                productWithEmbeddings.attributes.dense_embedding = {
                    numbers: denseEmbeddings.primary
                };
            }

            // Add title-focused dense embedding for title-based searches
            if (denseEmbeddings.title) {
                productWithEmbeddings.attributes.title_embedding = {
                    numbers: denseEmbeddings.title
                };
            }

            // Add category-focused dense embedding for category-based searches
            if (denseEmbeddings.category) {
                productWithEmbeddings.attributes.category_embedding = {
                    numbers: denseEmbeddings.category
                };
            }

            // Add enhanced sparse embedding
            if (sparseEmbedding && sparseEmbedding.length > 0) {
                productWithEmbeddings.attributes.sparse_embedding = {
                    text: sparseEmbedding
                };
            }

            // Add simple metadata for tracking (using only basic text/numbers format)
            if (hybridMetadata && hybridMetadata.search_readiness_score) {
                productWithEmbeddings.attributes.search_readiness_score = {
                    numbers: [hybridMetadata.search_readiness_score]
                };
            }

            // Add simple embedding count for reference
            productWithEmbeddings.attributes.embedding_count = {
                numbers: [Object.keys(denseEmbeddings).length + (sparseEmbedding ? 1 : 0)]
            };

            return productWithEmbeddings;

        } catch (error) {
            console.error(`❌ Error adding embeddings to product ${product.id || 'unknown'}:`, error.message);
            return product;
        }
    }

    /**
     * Extract searchable components for enhanced embedding generation
     */
    extractSearchableComponents(product, format) {
        const components = {
            title: '',
            description: '',
            categories: '',
            brands: '',
            attributes: '',
            keywords: '',
            specifications: ''
        };

        // Vertex catalog format (primary focus) and generic format
        components.title = this.textProcessor.cleanText(product.title || product.name || '');
        components.description = this.textProcessor.cleanText(product.description || '');
        components.categories = (product.categories || []).map(cat => this.textProcessor.cleanText(cat)).join(' ');
        components.brands = (product.brands || []).map(brand => this.textProcessor.cleanText(brand)).join(' ');

        if (product.attributes) {
            const attributeTexts = [];
            Object.values(product.attributes).forEach(attr => {
                if (attr.text && Array.isArray(attr.text)) {
                    attributeTexts.push(...attr.text);
                }
            });
            components.attributes = attributeTexts.join(' ');
        }

        return components;
    }

    /**
     * Generate multiple dense embeddings for different search scenarios
     */
    generateMultipleDenseEmbeddings(searchableText, searchableComponents) {
        const embeddings = {};

        // Primary dense embedding - full weighted text
        if (CONFIG.EMBEDDINGS.ENABLE_DENSE) {
            embeddings.primary = this.generateDenseEmbedding(searchableText);
        }

        // Title-focused dense embedding for title-based searches
        if (searchableComponents.title && searchableComponents.title.trim()) {
            embeddings.title = this.generateDenseEmbedding(searchableComponents.title);
        }

        // Category-focused dense embedding for category-based searches
        if (searchableComponents.categories && searchableComponents.categories.trim()) {
            embeddings.category = this.generateDenseEmbedding(searchableComponents.categories);
        }

        return embeddings;
    }

    /**
     * Generate simplified hybrid metadata compatible with Vertex AI Commerce Search
     */
    generateEnhancedHybridMetadata(searchableText, denseEmbeddings, sparseEmbedding, searchableComponents) {
        if (!CONFIG.EMBEDDINGS.ENABLE_HYBRID) return null;

        // Return only the search readiness score - other complex metadata causes import errors
        const metadata = {
            search_readiness_score: this.calculateSearchReadinessScore(searchableComponents, denseEmbeddings, sparseEmbedding)
        };

        return metadata;
    }

    /**
     * Calculate overall search readiness score
     */
    calculateSearchReadinessScore(components, denseEmbeddings, sparseEmbedding) {
        let score = 0;

        // Title contribution (30%)
        if (components.title && components.title.trim()) score += 0.3;

        // Categories contribution (25%)
        if (components.categories && components.categories.trim()) score += 0.25;

        // Description contribution (20%)
        if (components.description && components.description.trim()) score += 0.2;

        // Embeddings contribution (15%)
        if (Object.keys(denseEmbeddings).length > 0) score += 0.1;
        if (sparseEmbedding && sparseEmbedding.length > 0) score += 0.05;

        // Additional attributes contribution (10%)
        if (components.brands && components.brands.trim()) score += 0.05;
        if (components.attributes && components.attributes.trim()) score += 0.05;

        return parseFloat(score.toFixed(2));
    }
}



/**
 * Product format converters
 */
class ProductConverter {
    constructor() {
        this.embeddingGenerator = new EmbeddingGenerator();
        this.textProcessor = new TextProcessor();
    }



    /**
     * Convert Vertex catalog product to Commerce format
     */
    convertVertexProduct(vertexProduct) {
        try {
            const productId = vertexProduct.id || `vertex-product-${Date.now()}`;
            const title = this.textProcessor.cleanText(vertexProduct.title || 'Untitled Product').substring(0, CONFIG.LIMITS.MAX_TITLE_LENGTH);

            // Process categories
            const categories = this.processCategories(vertexProduct.categories || []);

            // Process description
            const description = this.processDescription(vertexProduct.description || '');

            // Build Commerce format product
            const commerceProduct = {
                id: productId,
                title: title,
                categories: categories.length > 0 ? categories : ['Products'],
                description: description,
                uri: vertexProduct.uri || this.generateProductUri(productId, title),
                availability: vertexProduct.availability || 'IN_STOCK',
                languageCode: vertexProduct.languageCode || 'en',
                ...(vertexProduct.price && { priceInfo: {
                    currencyCode: vertexProduct.price.currency || CONFIG.COMMERCE.CURRENCY_CODE,
                    price: parseFloat(vertexProduct.price.amount || 0)
                }}),
                ...(vertexProduct.brands && vertexProduct.brands.length > 0 && { brands: vertexProduct.brands }),
                attributes: this.processVertexAttributes(vertexProduct),
                ...(vertexProduct.images && { images: vertexProduct.images })
            };

            return commerceProduct;

        } catch (error) {
            console.error(`❌ Error converting Vertex product ${vertexProduct.id}:`, error.message);
            return null;
        }
    }

    /**
     * Process categories - clean HTML, remove promotional and limit count
     */
    processCategories(categories) {
        if (!Array.isArray(categories)) return [];

        const promotionalKeywords = ['sale', 'new', 'clearance', 'promo', 'deal', 'special', 'limited'];

        return categories
            .map(cat => this.textProcessor.cleanText(cat))
            .filter(cat => {
                const lowerCat = cat.toLowerCase();
                return !promotionalKeywords.some(keyword => lowerCat.includes(keyword));
            })
            .slice(0, CONFIG.LIMITS.MAX_CATEGORIES);
    }

    /**
     * Process description - clean HTML and limit length
     */
    processDescription(description) {
        if (!description) return '';

        // Use comprehensive text cleaning
        let cleaned = this.textProcessor.cleanText(description);

        // Limit length
        return cleaned.substring(0, CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH);
    }

    /**
     * Process price information
     */
    processPriceInfo(price) {
        if (!price || isNaN(price)) return null;

        return {
            currencyCode: CONFIG.COMMERCE.CURRENCY_CODE,
            price: parseFloat(price)
        };
    }

    /**
     * Generate product URI
     */
    generateProductUri(productId, title) {
        const slug = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        return `/products/${slug}-${productId}`;
    }

    /**
     * Determine availability from inventory level
     */
    determineAvailability(inventoryLevel) {
        if (typeof inventoryLevel !== 'number') return 'IN_STOCK';
        return inventoryLevel > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
    }



    /**
     * Process Vertex product attributes
     */
    processVertexAttributes(vertexProduct) {
        const attributes = { ...(vertexProduct.attributes || {}) };

        // Extract gender information from audience.genders and create gender_esai
        if (vertexProduct.audience && vertexProduct.audience.genders) {
            const genders = Array.isArray(vertexProduct.audience.genders)
                ? vertexProduct.audience.genders
                : [vertexProduct.audience.genders];

            // Create gender_esai attribute
            attributes.gender_esai = {
                text: genders
            };

            // Update filter_fields_esai to include gender values if it exists
            if (attributes.filter_fields && attributes.filter_fields.text) {
                // Add gender values to filter_fields if not already present
                const currentFilterFields = attributes.filter_fields.text;
                const newFilterFields = [...currentFilterFields];

                genders.forEach(gender => {
                    if (!newFilterFields.includes(gender)) {
                        newFilterFields.push(gender);
                    }
                });

                attributes.filter_fields = {
                    text: newFilterFields
                };
            }
        }

        return attributes;
    }



    /**
     * Convert generic/unknown product format to Commerce format
     * This method attempts to map common field names to Commerce format
     */
    convertGenericProduct(genericProduct) {
        try {
            // Try to extract common fields with fallbacks
            const productId = genericProduct.id ||
                             genericProduct.product_id ||
                             genericProduct.sku ||
                             `generic-product-${Date.now()}`;

            const title = this.textProcessor.cleanText(genericProduct.title ||
                          genericProduct.name ||
                          genericProduct.product_name ||
                          genericProduct.display_name ||
                          'Untitled Product').substring(0, CONFIG.LIMITS.MAX_TITLE_LENGTH);

            // Try to extract categories from various possible field names
            let categories = [];
            const categoryFields = ['categories', 'category', 'product_categories', 'tags', 'types'];
            for (const field of categoryFields) {
                if (genericProduct[field]) {
                    if (Array.isArray(genericProduct[field])) {
                        categories = genericProduct[field];
                    } else if (typeof genericProduct[field] === 'string') {
                        categories = [genericProduct[field]];
                    }
                    break;
                }
            }
            categories = this.processCategories(categories);

            // Try to extract description
            const description = this.processDescription(
                genericProduct.description ||
                genericProduct.details ||
                genericProduct.summary ||
                genericProduct.content ||
                ''
            );

            // Try to extract price
            let priceInfo = null;
            const priceFields = ['price', 'cost', 'amount', 'value'];
            for (const field of priceFields) {
                if (genericProduct[field] && !isNaN(genericProduct[field])) {
                    priceInfo = this.processPriceInfo(genericProduct[field]);
                    break;
                }
            }

            // Try to extract brand
            const brands = [];
            const brandFields = ['brand', 'manufacturer', 'company', 'vendor'];
            for (const field of brandFields) {
                if (genericProduct[field]) {
                    brands.push(genericProduct[field]);
                    break;
                }
            }

            // Build Commerce format product
            const commerceProduct = {
                id: productId,
                title: title,
                categories: categories.length > 0 ? categories : ['Products'],
                description: description,
                uri: this.generateProductUri(productId, title),
                availability: this.determineGenericAvailability(genericProduct),
                languageCode: 'en',
                ...(priceInfo && { priceInfo: priceInfo }),
                ...(brands.length > 0 && { brands: brands }),
                attributes: this.processGenericAttributes(genericProduct)
            };

            return commerceProduct;

        } catch (error) {
            console.error(`❌ Error converting generic product ${genericProduct.id || 'unknown'}:`, error.message);
            return null;
        }
    }

    /**
     * Determine availability for generic products
     */
    determineGenericAvailability(product) {
        // Check various availability fields
        const availabilityFields = ['availability', 'status', 'stock_status', 'in_stock', 'available'];

        for (const field of availabilityFields) {
            if (product[field] !== undefined) {
                const value = String(product[field]).toLowerCase();
                if (value.includes('stock') || value.includes('available') || value === 'true' || value === '1') {
                    return 'IN_STOCK';
                } else if (value.includes('out') || value === 'false' || value === '0') {
                    return 'OUT_OF_STOCK';
                }
            }
        }

        // Check inventory/quantity fields
        const quantityFields = ['quantity', 'stock', 'inventory', 'qty'];
        for (const field of quantityFields) {
            if (product[field] !== undefined && !isNaN(product[field])) {
                return parseInt(product[field]) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
            }
        }

        return 'IN_STOCK'; // Default to in stock
    }

    /**
     * Process generic product attributes
     */
    processGenericAttributes(genericProduct) {
        const attributes = {};

        // Common attribute field mappings
        const attributeFields = {
            'sku': 'sku',
            'model': 'model',
            'color': 'color',
            'size': 'size',
            'weight': 'weight',
            'dimensions': 'dimensions',
            'material': 'material',
            'features': 'features',
            'specifications': 'specifications',
            'keywords': 'keywords',
            'tags': 'tags'
        };

        Object.entries(attributeFields).forEach(([sourceField, attrName]) => {
            if (genericProduct[sourceField]) {
                const values = Array.isArray(genericProduct[sourceField]) ?
                    genericProduct[sourceField] : [String(genericProduct[sourceField])];
                attributes[attrName] = {
                    text: values.map(val => this.textProcessor.cleanText(String(val)))
                };
            }
        });

        // Add any remaining fields as custom attributes (excluding system fields)
        const systemFields = new Set(['id', 'title', 'name', 'description', 'price', 'categories', 'brand', 'availability']);
        Object.keys(genericProduct).forEach(key => {
            if (!systemFields.has(key) && !attributes[key] && genericProduct[key] !== null && genericProduct[key] !== undefined) {
                const values = Array.isArray(genericProduct[key]) ?
                    genericProduct[key].map(String) : [String(genericProduct[key])];
                attributes[`custom_${key}`] = {
                    text: values.map(val => this.textProcessor.cleanText(val))
                };
            }
        });

        return attributes;
    }
}

/**
 * Main conversion orchestrator - Scalable processing of millions of JSON files
 */
class UniversalConverter {
    constructor() {
        this.productConverter = new ProductConverter();
        this.embeddingGenerator = new EmbeddingGenerator();
        this.logger = new ScalableLogger();
        this.memoryMonitor = new MemoryMonitor();
        this.streamingParser = new StreamingJSONParser(this.logger);
        this.processingQueue = PQueue ? new PQueue({ concurrency: CONFIG.PROCESSING.CONCURRENCY_LIMIT }) : null;

        this.stats = {
            processedFiles: {},
            combined: { total: 0, withEmbeddings: 0, totalFiles: 0 },
            performance: {
                startTime: null,
                endTime: null,
                totalProcessingTime: 0,
                averageItemsPerSecond: 0,
                memoryPeakUsage: 0
            }
        };

        // Setup checkpoint system
        this.checkpointData = {
            processedFiles: new Set(),
            lastCheckpoint: Date.now(),
            checkpointFile: path.resolve(__dirname, CONFIG.PROCESSING.TEMP_DIR, 'conversion_checkpoint.json')
        };

        this.setupTempDirectories();
    }

    /**
     * Setup temporary directories for processing
     */
    setupTempDirectories() {
        const tempDir = path.resolve(__dirname, CONFIG.PROCESSING.TEMP_DIR);
        const logDir = path.resolve(__dirname, CONFIG.LOGGING.LOG_DIR);

        [tempDir, logDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.logger.info(`Created directory: ${dir}`);
            }
        });
    }

    /**
     * Load checkpoint data for resuming interrupted processing
     */
    loadCheckpoint() {
        if (CONFIG.PROCESSING.CHECKPOINT_ENABLED && fs.existsSync(this.checkpointData.checkpointFile)) {
            try {
                const checkpoint = JSON.parse(fs.readFileSync(this.checkpointData.checkpointFile, 'utf8'));
                this.checkpointData.processedFiles = new Set(checkpoint.processedFiles || []);
                this.logger.info(`Loaded checkpoint: ${this.checkpointData.processedFiles.size} files already processed`);
                return true;
            } catch (error) {
                this.logger.warn(`Failed to load checkpoint: ${error.message}`);
            }
        }
        return false;
    }

    /**
     * Save checkpoint data
     */
    saveCheckpoint() {
        if (CONFIG.PROCESSING.CHECKPOINT_ENABLED) {
            try {
                const checkpoint = {
                    processedFiles: Array.from(this.checkpointData.processedFiles),
                    timestamp: new Date().toISOString(),
                    stats: this.stats
                };
                fs.writeFileSync(this.checkpointData.checkpointFile, JSON.stringify(checkpoint, null, 2));
                this.checkpointData.lastCheckpoint = Date.now();
            } catch (error) {
                this.logger.error(`Failed to save checkpoint: ${error.message}`);
            }
        }
    }

    /**
     * Discover all JSON files in the Data directory
     * @returns {Array} Array of file paths to process
     */
    discoverJSONFiles() {
        const dataDir = path.resolve(__dirname, CONFIG.INPUT_DIRECTORY);

        if (!fs.existsSync(dataDir)) {
            throw new Error(`Data directory not found: ${dataDir}`);
        }

        console.log(`🔍 Scanning for JSON files in: ${dataDir}`);

        const files = fs.readdirSync(dataDir);
        const jsonFiles = files.filter(file => {
            // Include JSON files
            if (!CONFIG.FILE_PATTERNS.INCLUDE.test(file)) return false;

            // Exclude unwanted files
            if (CONFIG.FILE_PATTERNS.EXCLUDE.test(file)) return false;

            // Check if it's a file (not directory)
            const filePath = path.join(dataDir, file);
            return fs.statSync(filePath).isFile();
        });

        if (jsonFiles.length === 0) {
            throw new Error(`No JSON files found in ${dataDir}`);
        }

        console.log(`📁 Found ${jsonFiles.length} JSON files to process:`);
        jsonFiles.forEach(file => console.log(`   - ${file}`));

        return jsonFiles.map(file => path.join(dataDir, file));
    }

    /**
     * Generate output file path based on input file name
     * @param {string} inputFilePath - Input file path
     * @returns {string} Output file path
     */
    generateOutputPath(inputFilePath) {
        const outputDir = path.resolve(__dirname, CONFIG.OUTPUT_DIRECTORY);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const inputFileName = path.basename(inputFilePath, path.extname(inputFilePath));
        const outputFileName = `${inputFileName}_commerce_ready.jsonl`;

        return path.join(outputDir, outputFileName);
    }

    /**
     * Enhanced universal JSON file processor with streaming and batch processing
     * @param {string} inputFilePath - Path to the JSON file
     * @param {string} outputFilePath - Path for the output JSONL file
     * @param {string} formatHint - Optional format hint ('bpn', 'vertex', 'auto')
     * @returns {Array} Converted products
     */
    async processAnyJSONFile(inputFilePath, outputFilePath = null, formatHint = 'auto') {
        const fileName = path.basename(inputFilePath);
        this.logger.info(`Starting processing: ${fileName}`);

        try {
            // Resolve paths
            const resolvedInputPath = path.isAbsolute(inputFilePath) ?
                inputFilePath : path.resolve(__dirname, inputFilePath);

            if (!fs.existsSync(resolvedInputPath)) {
                throw new Error(`JSON file not found: ${resolvedInputPath}`);
            }

            // Generate output path if not provided
            if (!outputFilePath) {
                const inputName = path.basename(inputFilePath, path.extname(inputFilePath));
                outputFilePath = path.resolve(__dirname, `${CONFIG.OUTPUT_DIRECTORY}/${inputName}_commerce_ready.jsonl`);
            }

            // Use streaming parser for large files
            const products = await this.streamingParser.parseJSONFile(resolvedInputPath);

            // Auto-detect format
            const { detectedFormat } = this.detectFormatAndExtractProducts({ products }, formatHint);

            this.logger.info(`Detected format: ${detectedFormat}, Products: ${products.length}`);

            // Ensure output directory exists
            const outputDir = path.dirname(outputFilePath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Initialize progress tracking
            this.logger.initProgressBar(products.length, `Processing ${fileName}`);

            // Process with enhanced batch processing and sharding
            const convertedProducts = await this.processBatchesWithSharding(
                products, outputFilePath, detectedFormat, fileName
            );

            this.logger.stopProgress();
            this.logger.info(`Conversion complete: ${fileName} -> ${convertedProducts.length} products`);

            return convertedProducts;

        } catch (error) {
            this.logger.error(`JSON file processing failed: ${fileName}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Process products in batches with output sharding for large datasets
     */
    async processBatchesWithSharding(products, outputFilePath, detectedFormat, fileName) {
        const batchSize = CONFIG.PROCESSING.BATCH_SIZE;
        const maxLinesPerShard = CONFIG.PROCESSING.MAX_LINES_PER_SHARD;
        const convertedProducts = [];

        let currentShard = 0;
        let currentShardLines = 0;
        let currentShardPath = outputFilePath;
        let currentShardStream = null;

        // Determine if sharding is needed based on product count
        const shouldShard = CONFIG.PROCESSING.SHARD_OUTPUT && products.length > maxLinesPerShard;

        // Initialize first output file
        if (shouldShard) {
            currentShardPath = this.getShardPath(outputFilePath, currentShard);
            this.logger.info(`Large dataset detected (${products.length} products). Using sharded output.`);
        } else {
            currentShardPath = outputFilePath;
        }
        currentShardStream = fs.createWriteStream(currentShardPath, { flags: 'w' });

        let processedCount = 0;
        const startTime = Date.now();

        try {
            // Process in batches
            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);

                // Process batch with retry logic
                const batchResults = await this.processBatchWithRetry(batch, detectedFormat, fileName);

                // Write results to current shard
                for (const product of batchResults) {
                    if (product) {
                        // Check if we need to start a new shard (only if sharding is enabled)
                        if (shouldShard && currentShardLines >= maxLinesPerShard) {
                            currentShardStream.end();
                            currentShard++;
                            currentShardLines = 0;
                            currentShardPath = this.getShardPath(outputFilePath, currentShard);
                            currentShardStream = fs.createWriteStream(currentShardPath, { flags: 'w' });
                            this.logger.info(`Started new shard: ${path.basename(currentShardPath)}`);
                        }

                        currentShardStream.write(JSON.stringify(product) + '\n');
                        currentShardLines++;
                        convertedProducts.push(product);
                    }
                }

                processedCount += batch.length;

                // Update progress
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = Math.round(processedCount / elapsed);
                this.logger.updateProgress(processedCount, speed);

                // Save checkpoint periodically
                if (processedCount % CONFIG.PROCESSING.CHECKPOINT_INTERVAL === 0) {
                    this.saveCheckpoint();
                }

                // Memory management
                if (processedCount % (batchSize * 10) === 0) {
                    const memUsage = this.memoryMonitor.getUsage();
                    this.stats.performance.memoryPeakUsage = Math.max(
                        this.stats.performance.memoryPeakUsage, memUsage.heapUsed
                    );

                    if (memUsage.heapUsed > CONFIG.PROCESSING.MEMORY_THRESHOLD_MB) {
                        this.logger.warn(`High memory usage: ${memUsage.heapUsed}MB`);
                        if (global.gc) {
                            global.gc();
                        }
                    }
                }
            }

        } finally {
            // Close current shard stream
            if (currentShardStream) {
                currentShardStream.end();
            }
        }

        return convertedProducts;
    }

    /**
     * Process a batch with retry logic
     */
    async processBatchWithRetry(batch, detectedFormat, fileName) {
        const results = [];

        for (const product of batch) {
            let attempts = 0;
            let success = false;

            while (attempts < CONFIG.PROCESSING.RETRY_ATTEMPTS && !success) {
                try {
                    attempts++;

                    // Convert based on detected format
                    let commerceProduct;
                    if (detectedFormat === 'bpn') {
                        commerceProduct = this.productConverter.convertBPNProduct(product);
                    } else if (detectedFormat === 'vertex') {
                        commerceProduct = this.productConverter.convertVertexProduct(product);
                    } else {
                        commerceProduct = this.productConverter.convertGenericProduct(product);
                    }

                    if (commerceProduct) {
                        // Add embeddings
                        const productWithEmbeddings = this.embeddingGenerator.addEmbeddingsToProduct(
                            commerceProduct, detectedFormat
                        );
                        results.push(productWithEmbeddings);
                        success = true;
                    }

                } catch (error) {
                    if (attempts >= CONFIG.PROCESSING.RETRY_ATTEMPTS) {
                        this.logger.error(`Failed to process product after ${attempts} attempts`, {
                            file: fileName,
                            productId: product.id || 'unknown',
                            error: error.message
                        });
                        results.push(null); // Mark as failed
                    } else {
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, CONFIG.PROCESSING.RETRY_DELAY_MS));
                    }
                }
            }
        }

        return results;
    }

    /**
     * Generate shard file path
     */
    getShardPath(originalPath, shardIndex) {
        const dir = path.dirname(originalPath);
        const ext = path.extname(originalPath);
        const name = path.basename(originalPath, ext);
        return path.join(dir, `${name}_shard_${shardIndex.toString().padStart(3, '0')}${ext}`);
    }

    /**
     * Auto-detect JSON format and extract products array
     * @param {Object} jsonData - Parsed JSON data
     * @param {string} formatHint - Format hint from user
     * @returns {Object} { products: Array, detectedFormat: string }
     */
    detectFormatAndExtractProducts(jsonData, formatHint = 'auto') {
        let products = [];
        let detectedFormat = 'generic';

        // If format hint is provided and not 'auto', use it
        if (formatHint !== 'auto') {
            detectedFormat = formatHint;
        }

        // Handle different JSON structures
        if (Array.isArray(jsonData)) {
            // Direct array of products
            products = jsonData;

            // Auto-detect format based on first product structure
            if (formatHint === 'auto' && products.length > 0) {
                const firstProduct = products[0];
                if (firstProduct.title || firstProduct.categories) {
                    detectedFormat = 'vertex';
                } else {
                    detectedFormat = 'generic';
                }
            }
        } else if (jsonData.products && Array.isArray(jsonData.products)) {
            // Object with products array (like vertex catalog)
            products = jsonData.products;
            if (formatHint === 'auto') {
                detectedFormat = 'vertex';
            }
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
            // Object with data array
            products = jsonData.data;
        } else if (jsonData.items && Array.isArray(jsonData.items)) {
            // Object with items array
            products = jsonData.items;
        } else {
            // Single product object
            products = [jsonData];
        }

        return { products, detectedFormat };
    }

    /**
     * Process BPN Products JSON file
     */
    async processBPNProducts() {
        console.log('📦 Processing BPN Products JSON...');

        try {
            const inputPath = path.resolve(__dirname, CONFIG.INPUT_FILES.BPN_PRODUCTS);
            const outputPath = path.resolve(__dirname, CONFIG.OUTPUT_FILES.BPN_PRODUCTS);

            if (!fs.existsSync(inputPath)) {
                throw new Error(`BPN Products file not found: ${inputPath}`);
            }

            const rawData = fs.readFileSync(inputPath, 'utf8');
            const products = JSON.parse(rawData);

            if (!Array.isArray(products)) {
                throw new Error('BPN Products data must be an array');
            }

            this.stats.bpn.total = products.length;
            console.log(`📊 Found ${products.length} BPN products to convert`);

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Process products in batches
            const batchSize = 100;
            const convertedProducts = [];

            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                console.log(`🔄 Processing BPN batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}`);

                for (const product of batch) {
                    try {
                        // Convert to Commerce format using generic converter
                        const commerceProduct = this.productConverter.convertGenericProduct(product);

                        if (commerceProduct) {
                            // Add embeddings
                            const productWithEmbeddings = this.embeddingGenerator.addEmbeddingsToProduct(
                                commerceProduct, 'generic'
                            );

                            convertedProducts.push(productWithEmbeddings);
                            this.stats.vertex.converted++;

                            if (productWithEmbeddings.attributes?.embedding_info) {
                                this.stats.combined.withEmbeddings++;
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error processing product ${product.id}:`, error.message);
                        this.stats.vertex.errors++;
                    }
                }
            }

            // Write JSONL output
            const jsonlContent = convertedProducts.map(product => JSON.stringify(product)).join('\n');
            fs.writeFileSync(outputPath, jsonlContent, 'utf8');

            console.log(`✅ BPN Products conversion complete: ${outputPath}`);
            console.log(`📊 Converted: ${this.stats.bpn.converted}/${this.stats.bpn.total}, Errors: ${this.stats.bpn.errors}`);

            return convertedProducts;

        } catch (error) {
            console.error('❌ BPN Products processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Process Vertex Catalog JSON file
     */
    async processVertexCatalog() {
        console.log('📦 Processing Vertex Catalog JSON...');

        try {
            const inputPath = path.resolve(__dirname, CONFIG.INPUT_FILES.VERTEX_CATALOG);
            const outputPath = path.resolve(__dirname, CONFIG.OUTPUT_FILES.VERTEX_CATALOG);

            if (!fs.existsSync(inputPath)) {
                throw new Error(`Vertex Catalog file not found: ${inputPath}`);
            }

            const rawData = fs.readFileSync(inputPath, 'utf8');
            const catalogData = JSON.parse(rawData);

            const products = catalogData.products;
            if (!Array.isArray(products)) {
                throw new Error('Vertex Catalog data must contain a "products" array');
            }

            this.stats.vertex.total = products.length;
            console.log(`📊 Found ${products.length} Vertex products to convert`);

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Process products in batches
            const batchSize = 100;
            const convertedProducts = [];

            for (let i = 0; i < products.length; i += batchSize) {
                const batch = products.slice(i, i + batchSize);
                console.log(`🔄 Processing Vertex batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(products.length/batchSize)}`);

                for (const product of batch) {
                    try {
                        // Convert to Commerce format
                        const commerceProduct = this.productConverter.convertVertexProduct(product);

                        if (commerceProduct) {
                            // Add embeddings
                            const productWithEmbeddings = this.embeddingGenerator.addEmbeddingsToProduct(
                                commerceProduct, 'vertex'
                            );

                            convertedProducts.push(productWithEmbeddings);
                            this.stats.vertex.converted++;

                            if (productWithEmbeddings.attributes?.embedding_info) {
                                this.stats.combined.withEmbeddings++;
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error processing Vertex product ${product.id}:`, error.message);
                        this.stats.vertex.errors++;
                    }
                }
            }

            // Write JSONL output
            const jsonlContent = convertedProducts.map(product => JSON.stringify(product)).join('\n');
            fs.writeFileSync(outputPath, jsonlContent, 'utf8');

            console.log(`✅ Vertex Catalog conversion complete: ${outputPath}`);
            console.log(`📊 Converted: ${this.stats.vertex.converted}/${this.stats.vertex.total}, Errors: ${this.stats.vertex.errors}`);

            return convertedProducts;

        } catch (error) {
            console.error('❌ Vertex Catalog processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Process all JSON files from Data directory with enhanced scalability
     */
    async processAllDataFiles() {
        this.logger.info('🚀 Starting Scalable JSON to Commerce Format Conversion...');
        this.logger.info('🎯 Features: Multi-Level Dense + Enhanced Sparse + Comprehensive Hybrid Embeddings');
        this.logger.info('📁 Auto-discovering all JSON files from Data directory with streaming support...');

        // Initialize performance tracking
        this.stats.performance.startTime = Date.now();
        this.memoryMonitor.startMonitoring();

        try {
            // Load checkpoint if available
            const resuming = this.loadCheckpoint();
            if (resuming) {
                this.logger.info('Resuming from checkpoint...');
            }

            // Discover all JSON files
            const jsonFiles = this.discoverJSONFiles();
            this.stats.combined.totalFiles = jsonFiles.length;

            // Filter out already processed files if resuming
            const filesToProcess = resuming ?
                jsonFiles.filter(file => !this.checkpointData.processedFiles.has(path.basename(file))) :
                jsonFiles;

            this.logger.info(`Processing ${filesToProcess.length} JSON files (${jsonFiles.length - filesToProcess.length} already processed)...`);

            // Initialize overall progress
            this.logger.initProgressBar(filesToProcess.length, 'Processing Files');

            // Process files with concurrency control
            const allConvertedProducts = [];
            let fileIndex = 0;

            if (this.processingQueue) {
                // Use p-queue for controlled concurrency
                const fileProcessingPromises = filesToProcess.map(filePath =>
                    this.processingQueue.add(() => this.processFileWithTracking(filePath))
                );

                const results = await Promise.allSettled(fileProcessingPromises);

                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value) {
                        allConvertedProducts.push(...result.value);
                    }
                });

            } else {
                // Sequential processing fallback
                for (const filePath of filesToProcess) {
                    try {
                        const convertedProducts = await this.processFileWithTracking(filePath);
                        if (convertedProducts) {
                            allConvertedProducts.push(...convertedProducts);
                        }

                        fileIndex++;
                        this.logger.updateProgress(fileIndex);

                    } catch (error) {
                        this.logger.error(`Error processing file: ${path.basename(filePath)}`, { error: error.message });
                    }
                }
            }

            this.logger.stopProgress();

            // Update combined stats with accurate embedding counting
            this.stats.combined.total = allConvertedProducts.length;
            this.stats.combined.withEmbeddings = this.countProductsWithEmbeddings(allConvertedProducts);

            // Write combined output with sharding if needed
            if (allConvertedProducts.length > 0) {
                await this.writeCombinedOutput(allConvertedProducts);
            }

            // Final performance tracking
            this.stats.performance.endTime = Date.now();
            this.stats.performance.totalProcessingTime = this.stats.performance.endTime - this.stats.performance.startTime;
            this.stats.performance.averageItemsPerSecond = Math.round(
                this.stats.combined.total / (this.stats.performance.totalProcessingTime / 1000)
            );

            // Clean up checkpoint file on successful completion
            if (CONFIG.PROCESSING.CHECKPOINT_ENABLED && fs.existsSync(this.checkpointData.checkpointFile)) {
                fs.unlinkSync(this.checkpointData.checkpointFile);
                this.logger.info('Checkpoint file cleaned up');
            }

            // Generate comprehensive final report
            this.generateDynamicFinalReport(this.stats.performance.startTime);

        } catch (error) {
            this.logger.error('Dynamic conversion failed', { error: error.message });
            throw error;
        } finally {
            // Ensure all monitoring and intervals are stopped
            this.memoryMonitor.stopMonitoring();

            // Force cleanup of any remaining intervals or timers
            if (this.logger && this.logger.progressBar) {
                this.logger.stopProgress();
            }
        }
    }

    /**
     * Process a single file with comprehensive tracking
     */
    async processFileWithTracking(filePath) {
        const fileName = path.basename(filePath);
        const fileStartTime = Date.now();

        try {
            this.logger.info(`Processing: ${fileName}`);

            const outputPath = this.generateOutputPath(filePath);
            const convertedProducts = await this.processAnyJSONFile(filePath, outputPath, 'auto');

            const processingTime = Date.now() - fileStartTime;

            // Track stats for this file with accurate embedding detection
            const embeddingCount = this.countProductsWithEmbeddings(convertedProducts);
            const actualOutputPath = this.getActualOutputPath(outputPath);

            this.stats.processedFiles[fileName] = {
                inputPath: filePath,
                outputPath: actualOutputPath,
                totalProducts: convertedProducts.length,
                withEmbeddings: embeddingCount,
                processed: true,
                processingTimeMs: processingTime,
                averageItemsPerSecond: Math.round(convertedProducts.length / (processingTime / 1000))
            };

            // Mark as processed in checkpoint
            this.checkpointData.processedFiles.add(fileName);

            this.logger.info(`Completed: ${fileName} (${convertedProducts.length} products, ${processingTime}ms)`);

            return convertedProducts;

        } catch (error) {
            this.logger.error(`Failed to process: ${fileName}`, { error: error.message });

            this.stats.processedFiles[fileName] = {
                inputPath: filePath,
                outputPath: null,
                totalProducts: 0,
                withEmbeddings: 0,
                processed: false,
                error: error.message,
                processingTimeMs: Date.now() - fileStartTime
            };

            return null;
        }
    }

    /**
     * Write combined output with sharding support
     */
    async writeCombinedOutput(allConvertedProducts) {
        const combinedPath = path.resolve(__dirname, CONFIG.OUTPUT_DIRECTORY, 'all_data_files_commerce_ready.jsonl');

        if (CONFIG.PROCESSING.SHARD_OUTPUT && allConvertedProducts.length > CONFIG.PROCESSING.MAX_LINES_PER_SHARD) {
            // Write with sharding
            this.logger.info(`Writing combined output with sharding (${allConvertedProducts.length} products)...`);

            let currentShard = 0;
            let currentShardLines = 0;

            for (let i = 0; i < allConvertedProducts.length; i++) {
                if (currentShardLines === 0) {
                    // Start new shard
                    const shardPath = this.getShardPath(combinedPath, currentShard);
                    this.currentCombinedStream = fs.createWriteStream(shardPath, { flags: 'w' });
                    this.logger.info(`Started combined shard: ${path.basename(shardPath)}`);
                }

                this.currentCombinedStream.write(JSON.stringify(allConvertedProducts[i]) + '\n');
                currentShardLines++;

                if (currentShardLines >= CONFIG.PROCESSING.MAX_LINES_PER_SHARD) {
                    this.currentCombinedStream.end();
                    currentShard++;
                    currentShardLines = 0;
                }
            }

            if (this.currentCombinedStream) {
                this.currentCombinedStream.end();
            }

        } else {
            // Write single file
            this.logger.info(`Writing combined output (${allConvertedProducts.length} products)...`);
            const combinedContent = allConvertedProducts.map(product => JSON.stringify(product)).join('\n');
            fs.writeFileSync(combinedPath, combinedContent, 'utf8');
            this.logger.info(`Combined output written: ${combinedPath}`);
        }
    }

    /**
     * Run complete conversion process (legacy method for backward compatibility)
     */
    async runConversion() {
        // Use the new dynamic processing method
        return this.processAllDataFiles();
    }

    /**
     * Generate comprehensive final report for dynamic processing
     */
    generateDynamicFinalReport(startTime) {
        const endTime = Date.now();
        const duration = startTime ? ((endTime - startTime) / 1000).toFixed(2) : null;

        // Calculate success rates and update combined stats with accurate embedding counting
        const processedFiles = Object.keys(this.stats.processedFiles);
        const successfulFiles = processedFiles.filter(file => this.stats.processedFiles[file].processed);
        const failedFiles = processedFiles.filter(file => !this.stats.processedFiles[file].processed);

        // Update combined stats with accurate data
        this.stats.combined.total = successfulFiles.reduce((sum, f) => sum + this.stats.processedFiles[f].totalProducts, 0);
        this.stats.combined.withEmbeddings = successfulFiles.reduce((sum, f) => sum + this.stats.processedFiles[f].withEmbeddings, 0);

        const report = {
            timestamp: new Date().toISOString(),
            conversion_type: 'Dynamic JSON to Commerce Format with Multi-Level Embeddings',
            duration_seconds: parseFloat(duration),

            // File processing statistics
            file_statistics: {
                total_files_discovered: this.stats.combined.totalFiles,
                successfully_processed: successfulFiles.length,
                failed_to_process: failedFiles.length,
                success_rate: processedFiles.length > 0 ?
                    ((successfulFiles.length / processedFiles.length) * 100).toFixed(2) + '%' : '0.00%'
            },

            // Product statistics
            product_statistics: {
                total_products: this.stats.combined.total,
                products_with_embeddings: this.stats.combined.withEmbeddings,
                embedding_success_rate: this.stats.combined.total > 0 ?
                    ((this.stats.combined.withEmbeddings / this.stats.combined.total) * 100).toFixed(2) + '%' : '0.00%'
            },

            // Advanced embedding features
            embedding_features: {
                primary_dense_embeddings: CONFIG.EMBEDDINGS.ENABLE_DENSE,
                title_focused_dense_embeddings: true,
                category_focused_dense_embeddings: true,
                enhanced_sparse_embeddings: CONFIG.EMBEDDINGS.ENABLE_SPARSE,
                comprehensive_hybrid_metadata: CONFIG.EMBEDDINGS.ENABLE_HYBRID,
                dense_dimensions: CONFIG.EMBEDDINGS.DENSE_DIM,
                max_sparse_features: CONFIG.EMBEDDINGS.MAX_SPARSE_FEATURES,
                search_optimization_enabled: true,
                vertex_ai_commerce_ready: true
            },

            // File-by-file breakdown
            processed_files: this.stats.processedFiles,

            // Output information
            output_directory: path.resolve(__dirname, CONFIG.OUTPUT_DIRECTORY),
            combined_output_file: 'all_data_files_commerce_ready.jsonl'
        };

        // Validate report accuracy before writing
        const validation = this.validateReportAccuracy(report);

        // Add validation results to report
        report.validation = validation;

        // Write report
        const reportPath = path.resolve(__dirname, CONFIG.OUTPUT_DIRECTORY, 'dynamic_conversion_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

        // Console summary
        console.log('\n🎉 DYNAMIC CONVERSION COMPLETE!');
        console.log('=' .repeat(60));
        console.log(`⏱️  Duration: ${duration} seconds`);
        console.log(`� Files Processed: ${successfulFiles.length}/${processedFiles.length} (${report.file_statistics.success_rate})`);
        console.log(`📊 Total Products: ${this.stats.combined.total}`);
        console.log(`🧠 Products with Multi-Level Embeddings: ${this.stats.combined.withEmbeddings}`);
        console.log(`📈 Embedding Success Rate: ${report.product_statistics.embedding_success_rate}`);

        if (failedFiles.length > 0) {
            console.log(`\n⚠️  Failed Files: ${failedFiles.length}`);
            failedFiles.forEach(file => {
                console.log(`   - ${file}: ${this.stats.processedFiles[file].error}`);
            });
        }

        // Display validation results
        if (!validation.isValid) {
            console.log('\n⚠️  REPORT VALIDATION ISSUES:');
            validation.errors.forEach(error => console.log(`   ❌ ${error}`));
        }

        if (validation.warnings.length > 0) {
            console.log('\n⚠️  VALIDATION WARNINGS:');
            validation.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
        }

        if (validation.isValid && validation.warnings.length === 0) {
            console.log('\n✅ REPORT VALIDATION: All checks passed!');
        }

        console.log(`\n📄 Detailed Report: ${reportPath}`);
        console.log('\n🚀 All files ready for Vertex AI Commerce Search import!');
        console.log('🎯 Optimized for comprehensive search coverage with multi-level embeddings');
    }

    /**
     * Count products with actual embeddings (accurate detection)
     */
    countProductsWithEmbeddings(products) {
        if (!products || !Array.isArray(products)) return 0;

        return products.filter(product => {
            if (!product || !product.attributes) return false;

            // Check for any type of embedding
            const hasEmbeddings = !!(
                product.attributes.dense_embedding?.numbers?.length > 0 ||
                product.attributes.title_embedding?.numbers?.length > 0 ||
                product.attributes.category_embedding?.numbers?.length > 0 ||
                product.attributes.sparse_embedding?.text?.length > 0 ||
                product.attributes.search_optimization?.vertex_ai_ready === true
            );

            return hasEmbeddings;
        }).length;
    }

    /**
     * Get actual output path (handles sharding)
     */
    getActualOutputPath(originalPath) {
        if (!originalPath) return null;

        // Check if sharded files exist first
        const dir = path.dirname(originalPath);
        const basename = path.basename(originalPath, '.jsonl');
        const shardedPath = path.join(dir, `${basename}_shard_000.jsonl`);

        try {
            if (fs.existsSync(shardedPath)) {
                return shardedPath;
            }
            // Check if the original file exists
            if (fs.existsSync(originalPath)) {
                return originalPath;
            }
            // Return the path that should exist based on our logic
            return originalPath;
        } catch (error) {
            this.logger.warn(`Could not check for output file: ${error.message}`);
            return originalPath;
        }
    }

    /**
     * Validate report accuracy
     */
    validateReportAccuracy(report) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: []
        };

        // Validate file statistics
        if (report.file_statistics) {
            const fileStats = report.file_statistics;
            if (fileStats.total_files_discovered === 0) {
                validation.errors.push('No files discovered - check input directory');
            }

            if (fileStats.successfully_processed === 0 && fileStats.total_files_discovered > 0) {
                validation.errors.push('No files successfully processed despite files being discovered');
            }
        }

        // Validate product statistics
        if (report.product_statistics) {
            const productStats = report.product_statistics;
            if (productStats.total_products === 0) {
                validation.warnings.push('No products found in processed files');
            }

            // Check embedding success rate logic
            const expectedEmbeddingRate = productStats.total_products > 0 ?
                (productStats.products_with_embeddings / productStats.total_products * 100).toFixed(2) + '%' : '0%';

            if (productStats.embedding_success_rate !== expectedEmbeddingRate) {
                validation.errors.push(`Embedding success rate calculation mismatch: reported ${productStats.embedding_success_rate}, expected ${expectedEmbeddingRate}`);
            }
        }

        // Validate processed files
        if (report.processed_files) {
            Object.entries(report.processed_files).forEach(([fileName, fileData]) => {
                if (fileData.processed && fileData.outputPath) {
                    // Check if output file actually exists
                    try {
                        if (!fs.existsSync(fileData.outputPath)) {
                            validation.warnings.push(`Output file not found: ${fileData.outputPath}`);
                        }
                    } catch (error) {
                        validation.warnings.push(`Could not verify output file: ${fileData.outputPath}`);
                    }
                }

                // Validate embedding count vs total products
                if (fileData.withEmbeddings > fileData.totalProducts) {
                    validation.errors.push(`File ${fileName}: embedding count (${fileData.withEmbeddings}) exceeds total products (${fileData.totalProducts})`);
                }
            });
        }

        // Validate duration
        if (report.duration_seconds === null || report.duration_seconds === undefined) {
            validation.warnings.push('Duration not recorded - timing information missing');
        }

        validation.isValid = validation.errors.length === 0;
        return validation;
    }

    /**
     * Generate comprehensive final report (legacy method for backward compatibility)
     */
    generateFinalReport(startTime) {
        // Use the new dynamic report generation
        return this.generateDynamicFinalReport(startTime);
    }
}

// Run conversion if called directly
if (require.main === module) {
    const converter = new UniversalConverter();

    // Check for command line arguments
    const args = process.argv.slice(2);

    if (args.length > 0) {
        // Custom file processing mode
        const inputFile = args[0];
        const outputFile = args[1] || null;
        const formatHint = args[2] || 'auto';

        console.log('🔧 Custom JSON file processing mode');
        console.log(`📁 Input: ${inputFile}`);
        console.log(`📁 Output: ${outputFile || 'auto-generated'}`);
        console.log(`🎯 Format hint: ${formatHint}`);

        converter.processAnyJSONFile(inputFile, outputFile, formatHint)
            .then(() => {
                console.log('✅ Custom file conversion completed successfully!');
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Custom file conversion failed:', error);
                process.exit(1);
            });
    } else {
        // Default mode - process all JSON files from Data directory
        console.log('🔧 Dynamic processing mode - Auto-discovering all JSON files from Data directory');
        converter.processAllDataFiles()
            .then(() => {
                console.log('✅ Dynamic conversion completed successfully!');
                process.exit(0);
            })
            .catch(error => {
                console.error('❌ Dynamic conversion failed:', error);
                process.exit(1);
            });
    }
}
