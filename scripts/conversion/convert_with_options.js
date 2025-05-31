#!/usr/bin/env node

/**
 * Universal Converter with File Size Optimization Options
 * 
 * This script provides multiple conversion options to balance file size vs data completeness:
 * 1. Full conversion (all embeddings, largest file size)
 * 2. Optimized conversion (reduced precision, smaller file size)
 * 3. Compact conversion (essential embeddings only, smallest file size)
 * 4. Compressed conversion (gzip compressed output)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import the main converter and constants
const { UniversalConverter } = require('../../universal_converter.js');
const { CONFIG, OPTIMIZATION, CONFIG_HELPERS } = require('../../constants');

class OptimizedConverter {
    constructor() {
        this.outputDir = './output';
        this.dataDir = './Data';
    }

    /**
     * Display conversion options to user
     */
    displayOptions() {
        console.log('\n🔧 Universal JSON to Commerce Format Converter');
        console.log('=' .repeat(60));
        console.log('Choose your conversion option:');
        console.log('');
        console.log('1. 📊 FULL CONVERSION (Largest file, best search quality)');
        console.log('   - All embeddings (dense, sparse, title, category)');
        console.log('   - Full precision floating point numbers');
        console.log('   - Complete product descriptions');
        console.log('   - Estimated size: ~28KB per product');
        console.log('');
        console.log('2. ⚡ OPTIMIZED CONVERSION (Balanced size and quality)');
        console.log('   - All embeddings with reduced precision');
        console.log('   - Truncated long descriptions');
        console.log('   - Optimized sparse embeddings');
        console.log('   - Estimated size: ~18KB per product (35% smaller)');
        console.log('');
        console.log('3. 📦 COMPACT CONVERSION (Smallest file, good search quality)');
        console.log('   - Essential embeddings only (primary dense + sparse)');
        console.log('   - Reduced precision and optimized format');
        console.log('   - Limited categories and descriptions');
        console.log('   - Estimated size: ~8KB per product (70% smaller)');
        console.log('');
        console.log('4. 🗜️  COMPRESSED CONVERSION (Gzip compressed output)');
        console.log('   - Full conversion with gzip compression');
        console.log('   - Requires decompression before use');
        console.log('   - Estimated size: ~5KB per product (80% smaller)');
        console.log('');
        console.log('5. 📋 COMPARISON MODE (Generate all versions for comparison)');
        console.log('   - Creates all 4 versions for size/quality analysis');
        console.log('   - Useful for determining optimal format');
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
     * Update configuration for different optimization levels
     */
    updateConfig(level) {
        // Get optimization configuration from constants
        let optimizationLevel;

        switch(level) {
            case 1: // Full conversion
                optimizationLevel = 'FULL';
                break;
            case 2: // Optimized conversion
                optimizationLevel = 'OPTIMIZED';
                break;
            case 3: // Compact conversion
                optimizationLevel = 'COMPACT';
                break;
            case 4: // Compressed conversion
                optimizationLevel = 'COMPRESSED';
                break;
            default:
                optimizationLevel = 'BALANCED';
        }

        // Get the optimization configuration
        const optimizationConfig = CONFIG_HELPERS.getOptimizationConfig(optimizationLevel.toLowerCase());

        // Update CONFIG with optimization settings
        Object.assign(CONFIG.OPTIMIZATION, optimizationConfig);

        // Update limits if specified in optimization config
        if (optimizationConfig.MAX_DESCRIPTION_LENGTH) {
            CONFIG.LIMITS.MAX_DESCRIPTION_LENGTH = optimizationConfig.MAX_DESCRIPTION_LENGTH;
        }
        if (optimizationConfig.MAX_CATEGORIES) {
            CONFIG.LIMITS.MAX_CATEGORIES = optimizationConfig.MAX_CATEGORIES;
        }

        return CONFIG;
    }

    /**
     * Run conversion with specified optimization level
     */
    async runConversion(level, suffix = '') {
        console.log(`\n🚀 Starting conversion with optimization level ${level}${suffix}...`);
        
        // Update configuration
        this.updateConfig(level);
        
        // Create converter instance
        const converter = new UniversalConverter();
        
        // Run conversion
        await converter.processAllDataFiles();
        
        // Rename output files with suffix
        if (suffix) {
            this.renameOutputFiles(suffix);
        }
        
        return this.getOutputStats(suffix);
    }

    /**
     * Rename output files with suffix
     */
    renameOutputFiles(suffix) {
        const files = fs.readdirSync(this.outputDir);
        
        files.forEach(file => {
            if (file.endsWith('.jsonl')) {
                const oldPath = path.join(this.outputDir, file);
                const newPath = path.join(this.outputDir, file.replace('.jsonl', `${suffix}.jsonl`));
                fs.renameSync(oldPath, newPath);
            }
        });
    }

    /**
     * Get output file statistics
     */
    getOutputStats(suffix = '') {
        const files = fs.readdirSync(this.outputDir);
        const jsonlFiles = files.filter(f => f.includes(suffix) && f.endsWith('.jsonl'));
        
        let totalSize = 0;
        let totalLines = 0;
        
        jsonlFiles.forEach(file => {
            const filePath = path.join(this.outputDir, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            
            // Count lines
            const content = fs.readFileSync(filePath, 'utf8');
            totalLines += content.split('\n').filter(line => line.trim()).length;
        });
        
        return {
            files: jsonlFiles.length,
            totalSize: totalSize,
            totalLines: totalLines,
            avgSizePerProduct: totalLines > 0 ? Math.round(totalSize / totalLines) : 0
        };
    }

    /**
     * Compress files using gzip
     */
    compressFiles() {
        const files = fs.readdirSync(this.outputDir);
        const jsonlFiles = files.filter(f => f.endsWith('.jsonl') && !f.includes('compressed'));
        
        jsonlFiles.forEach(file => {
            const inputPath = path.join(this.outputDir, file);
            const outputPath = path.join(this.outputDir, file.replace('.jsonl', '_compressed.jsonl.gz'));
            
            try {
                execSync(`gzip -c "${inputPath}" > "${outputPath}"`);
                console.log(`✅ Compressed: ${file} -> ${path.basename(outputPath)}`);
            } catch (error) {
                console.log(`⚠️  Could not compress ${file}: ${error.message}`);
            }
        });
    }

    /**
     * Display comparison results
     */
    displayComparison(stats) {
        console.log('\n📊 CONVERSION RESULTS COMPARISON');
        console.log('=' .repeat(80));
        console.log('Format'.padEnd(20) + 'Files'.padEnd(8) + 'Total Size'.padEnd(15) + 'Products'.padEnd(12) + 'Size/Product');
        console.log('-' .repeat(80));
        
        Object.entries(stats).forEach(([format, data]) => {
            const sizeStr = this.formatBytes(data.totalSize);
            const avgSizeStr = this.formatBytes(data.avgSizePerProduct);
            
            console.log(
                format.padEnd(20) + 
                data.files.toString().padEnd(8) + 
                sizeStr.padEnd(15) + 
                data.totalLines.toString().padEnd(12) + 
                avgSizeStr
            );
        });
        
        console.log('-' .repeat(80));
        
        // Calculate savings
        if (stats.full && stats.compact) {
            const savings = ((stats.full.totalSize - stats.compact.totalSize) / stats.full.totalSize * 100).toFixed(1);
            console.log(`💾 Compact version saves ${savings}% of storage space`);
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
     * Main execution function
     */
    async run() {
        try {
            this.displayOptions();
            const choice = await this.getUserChoice();
            
            const stats = {};
            
            switch(choice) {
                case 1:
                    stats.full = await this.runConversion(1);
                    console.log(`\n✅ Full conversion complete!`);
                    break;
                    
                case 2:
                    stats.optimized = await this.runConversion(2);
                    console.log(`\n✅ Optimized conversion complete!`);
                    break;
                    
                case 3:
                    stats.compact = await this.runConversion(3);
                    console.log(`\n✅ Compact conversion complete!`);
                    break;
                    
                case 4:
                    await this.runConversion(2);
                    this.compressFiles();
                    stats.compressed = this.getOutputStats('compressed');
                    console.log(`\n✅ Compressed conversion complete!`);
                    break;
                    
                case 5:
                    console.log('\n🔄 Running comparison mode...');
                    stats.full = await this.runConversion(1, '_full');
                    stats.optimized = await this.runConversion(2, '_optimized');
                    stats.compact = await this.runConversion(3, '_compact');
                    this.compressFiles();
                    stats.compressed = this.getOutputStats('compressed');
                    this.displayComparison(stats);
                    break;
                    
                default:
                    console.log('❌ Invalid choice. Please run the script again.');
                    return;
            }
            
            if (choice !== 5) {
                console.log('\n📊 Conversion Statistics:');
                Object.entries(stats).forEach(([format, data]) => {
                    console.log(`${format}: ${data.files} files, ${this.formatBytes(data.totalSize)}, ${data.totalLines} products`);
                    console.log(`Average size per product: ${this.formatBytes(data.avgSizePerProduct)}`);
                });
            }
            
            console.log('\n🎉 Conversion completed successfully!');
            console.log(`📁 Output files are in: ${this.outputDir}/`);
            
        } catch (error) {
            console.error('❌ Conversion failed:', error.message);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const converter = new OptimizedConverter();
    converter.run();
}

module.exports = { OptimizedConverter };
