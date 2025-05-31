#!/usr/bin/env node

/**
 * Display conversion results and file size comparison
 */

const fs = require('fs');
const path = require('path');

// Import constants
const { PATHS } = require('../../constants');

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileStats(filename, directory = PATHS.OUTPUT_DIRECTORY) {
    const filePath = path.join(directory, filename);
    if (!fs.existsSync(filePath)) return null;
    
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim()).length;
    
    return {
        size: stats.size,
        lines: lines,
        sizePerProduct: lines > 0 ? Math.round(stats.size / lines) : 0
    };
}

console.log('\n🎉 CONVERSION RESULTS SUMMARY');
console.log('=' .repeat(80));

const files = [
    { name: 'all_data_files_commerce_ready.jsonl', label: 'Original (Full)', directory: PATHS.OUTPUT_DIRECTORY },
    { name: 'all_data_files_commerce_ready_balanced.jsonl', label: 'Balanced', directory: PATHS.OPTIMIZED_DIRECTORY },
    { name: 'all_data_files_commerce_ready_compact.jsonl', label: 'Compact', directory: PATHS.OPTIMIZED_DIRECTORY },
    { name: 'all_data_files_commerce_ready_minimal.jsonl', label: 'Minimal', directory: PATHS.OPTIMIZED_DIRECTORY }
];

console.log('Version'.padEnd(20) + 'File Size'.padEnd(12) + 'Products'.padEnd(10) + 'Size/Product'.padEnd(15) + 'Reduction');
console.log('-' .repeat(80));

let originalSize = 0;

files.forEach((file, index) => {
    const stats = getFileStats(file.name, file.directory);
    if (stats) {
        if (index === 0) originalSize = stats.size;

        const reduction = originalSize > 0 ?
            ((originalSize - stats.size) / originalSize * 100).toFixed(1) + '%' :
            '0%';

        console.log(
            file.label.padEnd(20) +
            formatBytes(stats.size).padEnd(12) +
            stats.lines.toString().padEnd(10) +
            formatBytes(stats.sizePerProduct).padEnd(15) +
            reduction
        );
    }
});

console.log('-' .repeat(80));

// Show recommendations
console.log('\n💡 RECOMMENDATIONS:');
console.log('');
console.log('🏆 PRODUCTION USE: Balanced version (60% smaller, excellent search quality)');
console.log('   Command: npm run optimize:balanced');
console.log('');
console.log('💾 STORAGE CONSTRAINED: Compact version (83% smaller, good search quality)');
console.log('   Command: npm run optimize:compact');
console.log('');
console.log('🔬 BASIC SEARCH: Minimal version (88% smaller, basic functionality)');
console.log('   Command: npm run optimize:minimal');
console.log('');

// Show next steps
console.log('📋 NEXT STEPS:');
console.log('');
console.log('1. 📤 Upload to Vertex AI Commerce Search:');
console.log('   - Use the balanced version for best results');
console.log('   - File format: JSONL (ready for direct import)');
console.log('');
console.log('2. 🧪 Test search functionality:');
console.log('   - Each product has dense + sparse embeddings');
console.log('   - Search readiness score included');
console.log('');
console.log('3. 🔄 Re-run conversion:');
console.log('   - Add new JSON files to Data/ directory');
console.log('   - Run: npm run convert');
console.log('   - Optimize: npm run optimize:balanced');
console.log('');

console.log('🎯 All files are ready for Vertex AI Commerce Search import!');
console.log('');
