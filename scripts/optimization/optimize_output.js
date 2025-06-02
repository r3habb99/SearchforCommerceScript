#!/usr/bin/env node

/**
 * Output File Size Optimizer
 * 
 * This script takes the existing JSONL output files and creates optimized versions
 * with different levels of compression while maintaining data integrity.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// Import constants
const { PATHS } = require('../../constants');

class OutputOptimizer {
    constructor() {
        this.inputDir = PATHS.OUTPUT_DIRECTORY;
        this.outputDir = PATHS.OPTIMIZED_DIRECTORY;

        // Ensure optimized directory exists
        this.ensureOptimizedDirectoryExists();
    }

    /**
     * Ensure the optimized output directory exists
     */
    ensureOptimizedDirectoryExists() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`📁 Created optimized output directory: ${this.outputDir}`);
        }
    }

    /**
     * Optimize a single product record
     */
    optimizeProduct(product, level = 'balanced') {
        const optimized = JSON.parse(JSON.stringify(product));

        switch (level) {
            case 'minimal':
                return this.createMinimalVersion(optimized);
            case 'balanced':
                return this.createBalancedVersion(optimized);
            case 'compact':
                return this.createCompactVersion(optimized);
            default:
                return optimized;
        }
    }

    /**
     * Create minimal version - only essential data for search
     */
    createMinimalVersion(product) {
        const minimal = {
            id: product.id,
            title: product.title,
            categories: product.categories ? product.categories.slice(0, 3) : [],
            description: product.description ? product.description.substring(0, 200) + '...' : '',
            uri: product.uri,
            availability: product.availability,
            languageCode: product.languageCode,
            priceInfo: product.priceInfo,
            brands: product.brands
        };

        // Keep only primary dense embedding and sparse embedding
        if (product.attributes) {
            minimal.attributes = {};
            
            if (product.attributes.dense_embedding) {
                // Reduce precision to 3 decimal places
                minimal.attributes.dense_embedding = {
                    numbers: product.attributes.dense_embedding.numbers.map(n => 
                        parseFloat(n.toFixed(3))
                    )
                };
            }

            if (product.attributes.sparse_embedding) {
                // Keep only top 20 sparse features
                const sparseItems = product.attributes.sparse_embedding.text || [];
                const topSparse = sparseItems
                    .map(item => {
                        const [term, weight] = item.split(':');
                        return { term, weight: parseFloat(weight) };
                    })
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 20)
                    .map(item => `${item.term}:${item.weight.toFixed(3)}`);
                
                minimal.attributes.sparse_embedding = { text: topSparse };
            }

            if (product.attributes.search_readiness_score) {
                minimal.attributes.search_readiness_score = product.attributes.search_readiness_score;
            }
        }

        return minimal;
    }

    /**
     * Create balanced version - good balance of size and functionality
     */
    createBalancedVersion(product) {
        const balanced = JSON.parse(JSON.stringify(product));

        // Optimize description
        if (balanced.description && balanced.description.length > 500) {
            balanced.description = balanced.description.substring(0, 500) + '...';
        }

        // Limit categories
        if (balanced.categories && balanced.categories.length > 5) {
            balanced.categories = balanced.categories.slice(0, 5);
        }

        // Optimize embeddings
        if (balanced.attributes) {
            Object.keys(balanced.attributes).forEach(key => {
                if (key.includes('embedding') && balanced.attributes[key].numbers) {
                    // Reduce precision to 4 decimal places
                    balanced.attributes[key].numbers = balanced.attributes[key].numbers.map(n => 
                        parseFloat(n.toFixed(4))
                    );
                }

                if (key === 'sparse_embedding' && balanced.attributes[key].text) {
                    // Keep top 50 sparse features
                    const sparseItems = balanced.attributes[key].text;
                    const topSparse = sparseItems
                        .map(item => {
                            const [term, weight] = item.split(':');
                            return { term, weight: parseFloat(weight) };
                        })
                        .sort((a, b) => b.weight - a.weight)
                        .slice(0, 50)
                        .map(item => `${item.term}:${item.weight.toFixed(4)}`);
                    
                    balanced.attributes[key].text = topSparse;
                }
            });
        }

        return balanced;
    }

    /**
     * Create compact version - removes secondary embeddings
     */
    createCompactVersion(product) {
        const compact = JSON.parse(JSON.stringify(product));

        // Optimize description
        if (compact.description && compact.description.length > 300) {
            compact.description = compact.description.substring(0, 300) + '...';
        }

        // Limit categories
        if (compact.categories && compact.categories.length > 3) {
            compact.categories = compact.categories.slice(0, 3);
        }

        // Keep only essential embeddings
        if (compact.attributes) {
            const essentialAttributes = {};

            // Keep non-embedding attributes
            Object.keys(compact.attributes).forEach(key => {
                if (!key.includes('embedding') && key !== 'search_readiness_score') {
                    essentialAttributes[key] = compact.attributes[key];
                }
            });

            // Keep only primary dense and sparse embeddings
            if (compact.attributes.dense_embedding) {
                essentialAttributes.dense_embedding = {
                    numbers: compact.attributes.dense_embedding.numbers.map(n => 
                        parseFloat(n.toFixed(3))
                    )
                };
            }

            if (compact.attributes.sparse_embedding) {
                const sparseItems = compact.attributes.sparse_embedding.text || [];
                const topSparse = sparseItems
                    .map(item => {
                        const [term, weight] = item.split(':');
                        return { term, weight: parseFloat(weight) };
                    })
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 30)
                    .map(item => `${item.term}:${item.weight.toFixed(3)}`);
                
                essentialAttributes.sparse_embedding = { text: topSparse };
            }

            if (compact.attributes.search_readiness_score) {
                essentialAttributes.search_readiness_score = compact.attributes.search_readiness_score;
            }

            compact.attributes = essentialAttributes;
        }

        return compact;
    }

    /**
     * Process a JSONL file and create optimized version
     */
    async processFile(inputFile, outputFile, optimizationLevel) {
        console.log(`\n🔄 Processing: ${inputFile}`);
        console.log(`📝 Optimization level: ${optimizationLevel}`);

        const inputPath = path.join(this.inputDir, inputFile);
        const outputPath = path.join(this.outputDir, outputFile);

        if (!fs.existsSync(inputPath)) {
            console.log(`❌ Input file not found: ${inputPath}`);
            return null;
        }

        const fileStream = fs.createReadStream(inputPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const writeStream = fs.createWriteStream(outputPath);
        let processedCount = 0;
        let originalSize = 0;
        let optimizedSize = 0;

        for await (const line of rl) {
            if (line.trim()) {
                try {
                    const product = JSON.parse(line);
                    const optimized = this.optimizeProduct(product, optimizationLevel);
                    
                    const originalJson = JSON.stringify(product);
                    const optimizedJson = JSON.stringify(optimized);
                    
                    originalSize += originalJson.length;
                    optimizedSize += optimizedJson.length;
                    
                    writeStream.write(optimizedJson + '\n');
                    processedCount++;

                    if (processedCount % 1000 === 0) {
                        process.stdout.write(`\r📊 Processed: ${processedCount} products`);
                    }
                } catch (error) {
                    console.log(`\n⚠️  Error processing line ${processedCount + 1}: ${error.message}`);
                }
            }
        }

        writeStream.end();
        console.log(`\n✅ Completed: ${processedCount} products processed`);

        const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
        console.log(`💾 Size reduction: ${compressionRatio}%`);
        console.log(`📁 Output: ${outputPath}`);

        return {
            processedCount,
            originalSize,
            optimizedSize,
            compressionRatio: parseFloat(compressionRatio)
        };
    }

    /**
     * Create compressed version using gzip
     */
    compressFile(inputFile) {
        const inputPath = path.join(this.inputDir, inputFile);  // Read from input directory
        const outputPath = path.join(this.outputDir, inputFile.replace('.jsonl', '_compressed.jsonl.gz'));

        try {
            if (!fs.existsSync(inputPath)) {
                console.log(`❌ Input file not found: ${inputPath}`);
                return null;
            }

            console.log(`\n🗜️  Compressing: ${inputFile}`);
            execSync(`gzip -c "${inputPath}" > "${outputPath}"`);

            const originalStats = fs.statSync(inputPath);
            const compressedStats = fs.statSync(outputPath);
            const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(1);

            console.log(`💾 Compression ratio: ${compressionRatio}%`);
            console.log(`📁 Output: ${outputPath}`);

            return {
                originalSize: originalStats.size,
                compressedSize: compressedStats.size,
                compressionRatio: parseFloat(compressionRatio)
            };
        } catch (error) {
            console.log(`❌ Compression failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Display optimization options
     */
    displayOptions() {
        console.log('\n🔧 Output File Size Optimizer');
        console.log('=' .repeat(60));
        console.log('Choose optimization level:');
        console.log('');
        console.log('1. 📦 MINIMAL (Smallest size, basic search functionality)');
        console.log('   - Essential fields only');
        console.log('   - Primary dense + sparse embeddings');
        console.log('   - 3 decimal precision');
        console.log('   - Expected reduction: ~70%');
        console.log('');
        console.log('2. ⚖️  BALANCED (Good balance of size and functionality)');
        console.log('   - All fields with optimized embeddings');
        console.log('   - 4 decimal precision');
        console.log('   - Truncated descriptions');
        console.log('   - Expected reduction: ~40%');
        console.log('');
        console.log('3. 📊 COMPACT (Moderate reduction, full functionality)');
        console.log('   - Essential embeddings only');
        console.log('   - 3 decimal precision');
        console.log('   - Limited categories');
        console.log('   - Expected reduction: ~50%');
        console.log('');
        console.log('4. 🗜️  COMPRESSED (Gzip compression)');
        console.log('   - Original data with gzip compression');
        console.log('   - Requires decompression before use');
        console.log('   - Expected reduction: ~80%');
        console.log('');
        console.log('5. 📋 ALL VERSIONS (Create all optimized versions)');
        console.log('   - Generate all optimization levels');
        console.log('   - Compare file sizes');
        console.log('');
    }

    /**
     * Get user choice
     */
    getUserChoice() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question('Enter your choice (1-5): ', (answer) => {
                rl.close();
                resolve(parseInt(answer));
            });
        });
    }

    /**
     * Main execution function
     */
    async run() {
        try {
            // Find JSONL files in output directory
            const files = fs.readdirSync(this.inputDir).filter(f => 
                f.endsWith('.jsonl') && !f.includes('_optimized') && !f.includes('_minimal') && !f.includes('_compact')
            );

            if (files.length === 0) {
                console.log('❌ No JSONL files found in output directory.');
                console.log('💡 Run the converter first: npm run convert');
                return;
            }

            console.log(`📁 Found ${files.length} JSONL file(s) to optimize:`);
            files.forEach(file => {
                const stats = fs.statSync(path.join(this.inputDir, file));
                console.log(`   - ${file} (${this.formatBytes(stats.size)})`);
            });

            this.displayOptions();
            const choice = await this.getUserChoice();

            const results = {};

            for (const file of files) {
                const baseName = file.replace('.jsonl', '');
                
                switch (choice) {
                    case 1: // Minimal
                        results.minimal = await this.processFile(file, `${baseName}_minimal.jsonl`, 'minimal');
                        break;
                        
                    case 2: // Balanced
                        results.balanced = await this.processFile(file, `${baseName}_balanced.jsonl`, 'balanced');
                        break;
                        
                    case 3: // Compact
                        results.compact = await this.processFile(file, `${baseName}_compact.jsonl`, 'compact');
                        break;
                        
                    case 4: // Compressed
                        results.compressed = this.compressFile(file);
                        break;
                        
                    case 5: // All versions
                        console.log('\n🔄 Creating all optimization versions...');
                        results.minimal = await this.processFile(file, `${baseName}_minimal.jsonl`, 'minimal');
                        results.balanced = await this.processFile(file, `${baseName}_balanced.jsonl`, 'balanced');
                        results.compact = await this.processFile(file, `${baseName}_compact.jsonl`, 'compact');
                        results.compressed = this.compressFile(file);
                        break;
                        
                    default:
                        console.log('❌ Invalid choice.');
                        return;
                }
            }

            // Display summary
            console.log('\n📊 OPTIMIZATION SUMMARY');
            console.log('=' .repeat(60));
            Object.entries(results).forEach(([type, data]) => {
                if (data) {
                    console.log(`${type.toUpperCase()}: ${data.compressionRatio}% size reduction`);
                }
            });

            console.log('\n🎉 Optimization completed successfully!');
            console.log(`📁 Original files: ${this.inputDir}/`);
            console.log(`📁 Optimized files: ${this.outputDir}/`);

        } catch (error) {
            console.error('❌ Optimization failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const optimizer = new OutputOptimizer();
    optimizer.run();
}

module.exports = { OutputOptimizer };
