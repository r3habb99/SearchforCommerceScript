# Universal JSON to Commerce Format Converter

A comprehensive Node.js application that converts various JSON product catalog formats into Google Cloud Vertex AI Commerce Search compatible format with advanced embedding generation for enhanced search capabilities.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Place your JSON files in Data/ directory
cp your_products.json Data/

# 3. Run conversion
npm run convert

# 4. Check output
ls -lh output/

# 5. Optional: Optimize file size (60% reduction)
npm run optimize:balanced

# 6. View results summary
npm run results
```

## 📋 Quick Reference

| Command | Purpose | Output Size | Use Case |
|---------|---------|-------------|----------|
| `npm run convert` | **Main conversion** | ~28KB/product | Full functionality, best search quality |
| `npm run optimize:balanced` | Balanced optimization | ~11KB/product | **Recommended for production** |
| `npm run optimize:compact` | Compact version | ~5KB/product | Storage-constrained environments |
| `npm run optimize:minimal` | Minimal version | ~3KB/product | Basic search functionality |
| `npm run optimize:compressed` | Gzip compression | ~6KB/product | Archive/backup (requires decompression) |
| `npm run results` | Show file size comparison | - | View optimization results |

## 🚀 Features

### Core Functionality

- **Universal JSON Processing**: Automatically detects and converts multiple JSON formats
- **Advanced Embeddings**: Generates dense, sparse, and hybrid embeddings for optimal search performance
- **Scalable Architecture**: Handles millions of products with streaming processing and memory management
- **Comprehensive Search Optimization**: Multi-layered keyword extraction and semantic search preparation

### Embedding Types

- **Dense Embeddings**: 384-dimensional vectors for semantic similarity search
- **Sparse Embeddings**: TF-IDF style keyword vectors for exact matching
- **Hybrid Embeddings**: Combined approach for optimal search results
- **Multi-context Embeddings**: Title, category, and brand-focused embeddings

### Performance Features

- **Streaming JSON Processing**: Memory-efficient handling of large files
- **Batch Processing**: Configurable batch sizes for optimal performance
- **Checkpoint System**: Resume interrupted processing
- **Memory Monitoring**: Automatic garbage collection and memory management
- **Progress Tracking**: Real-time progress bars and detailed logging

## 📋 Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **NPM**: Version 8.0.0 or higher
- **Memory**: Minimum 4GB RAM recommended for large datasets
- **Storage**: Sufficient disk space for input files, output files, and temporary processing

## 🛠️ Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/r3habb99/vertex-ai-commerce-search.git
   cd vertex-ai-commerce-search
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Verify installation**:

   ```bash
   node --version  # Should be >= 16.0.0
   npm --version   # Should be >= 8.0.0
   ```

## 📁 Project Structure

```text
SearchforCommerceScript/
├── Data/                          # Input JSON files directory
│   └── vertex_catalog.json        # Sample input file
├── output/                        # Original conversion output (auto-created)
│   ├── .gitkeep                   # Preserves directory in git
│   └── *.jsonl                    # Full-featured JSONL files
├── optimized/                     # Size-optimized output (auto-created)
│   └── *.jsonl                    # Optimized JSONL files
├── logs/                          # Processing logs (auto-created)
├── temp/                          # Temporary processing files (auto-created)
├── universal_converter.js         # Main conversion script
├── optimize_output.js             # File size optimization script
├── show_results.js                # Results comparison script
├── package.json                   # Project configuration
└── README.md                      # This file
```

## 📥 Supported Input Formats

### 1. Vertex Catalog Format (Primary)

```json
{
  "products": [
    {
      "id": "prod_123",
      "title": "Product Name",
      "description": "Product description with HTML support",
      "categories": ["Category1", "Category2"],
      "price": {
        "amount": 29.99,
        "currency": "USD"
      },
      "brands": ["Brand Name"],
      "attributes": {
        "sku": { "text": ["SKU123"] },
        "form": { "text": ["tablet"] }
      },
      "availability": "IN_STOCK",
      "images": [...]
    }
  ]
}
```

### 2. Generic JSON Format

The converter automatically detects and maps common field names:

- `id`, `product_id`, `sku` → Product ID
- `title`, `name`, `product_name` → Product Title
- `description`, `details`, `summary` → Description
- `categories`, `category`, `tags` → Categories
- `price`, `cost`, `amount` → Price Information
- `brand`, `manufacturer`, `vendor` → Brand

## 📤 Output Format

The converter generates **JSONL** (JSON Lines) files compatible with Google Cloud Vertex AI Commerce Search:

```json
{
  "id": "prod_123",
  "title": "Product Name",
  "categories": ["Category1", "Category2"],
  "description": "Cleaned product description",
  "uri": "/products/product-name-prod_123",
  "availability": "IN_STOCK",
  "languageCode": "en",
  "priceInfo": {
    "currencyCode": "USD",
    "price": 29.99
  },
  "brands": ["Brand Name"],
  "attributes": {
    "dense_embedding": {
      "numbers": [0.123, -0.456, ...]
    },
    "sparse_embedding": {
      "text": ["keyword1:0.8", "keyword2:0.6", ...]
    },
    "search_readiness_score": {
      "numbers": [0.95]
    }
  }
}
```

## 🚀 Usage

### Step-by-Step Conversion Process

#### Step 1: Prepare Your Data

1. **Place your JSON files** in the `Data/` directory
2. **Supported formats**: Any JSON file with product data (see Input Formats section)
3. **File size**: No limit, but ensure sufficient disk space

#### Step 2: Run the Main Conversion

```bash
# Basic conversion (recommended for most users)
npm run convert
```

**What happens during conversion:**

1. 🔍 **Auto-discovery**: Scans `Data/` directory for JSON files
2. 📊 **Format detection**: Automatically identifies input structure (`{"products": [...]}` or `[...]`)
3. 🔄 **JSON parsing**: Loads and validates JSON data
4. 🧠 **Embedding generation**: Creates dense, sparse, and hybrid embeddings for search
5. 📝 **Format transformation**: Converts to Vertex AI Commerce Search format
6. 💾 **JSONL output**: Writes line-by-line JSON format to `output/` directory

#### Step 3: Verify Output

```bash
# Check generated files
ls -lh output/
# View first few products
head -n 3 output/all_data_files_commerce_ready.jsonl
```

### JSON to JSONL Conversion Details

**Input JSON Structure (Example):**

```json
{
  "products": [
    {
      "id": "prod_123",
      "title": "Product Name",
      "description": "Product description",
      "categories": ["Category1", "Category2"],
      "price": {"amount": 29.99, "currency": "USD"}
    }
  ]
}
```

**Output JSONL Structure (Each line is a separate JSON object):**

```json
{"id":"prod_123","title":"Product Name","categories":["Category1","Category2"],"description":"Product description","uri":"/products/product-name-prod_123","availability":"IN_STOCK","languageCode":"en","priceInfo":{"currencyCode":"USD","price":29.99},"attributes":{"dense_embedding":{"numbers":[0.123,-0.456,...]},"sparse_embedding":{"text":["keyword1:0.8","keyword2:0.6",...]}}}
```

### Advanced Usage Options

#### For Large Datasets (>1GB)

```bash
npm run convert:scalable
```

#### Manual Execution with Custom Memory

```bash
# Basic conversion
node universal_converter.js

# With increased memory allocation for large files
node --max-old-space-size=8192 --expose-gc universal_converter.js
```

## 🎯 File Size Optimization (Optional Feature)

After running the main conversion, you can optionally optimize file sizes while maintaining data integrity:

### Quick Optimization

```bash
# Balanced optimization (60% size reduction)
npm run optimize:balanced

# Minimal size (88% size reduction, basic search functionality)
npm run optimize:minimal

# Compact version (83% size reduction, good functionality)
npm run optimize:compact

# Compressed version (80% size reduction, requires decompression)
npm run optimize:compressed
```

### Interactive Optimization

```bash
# Choose optimization level interactively
npm run optimize
```

### Optimization Comparison

| Version | Size Reduction | Search Quality | Use Case |
|---------|---------------|----------------|----------|
| **Original** | 0% | Excellent | Full functionality, best search results |
| **Balanced** | ~60% | Very Good | Recommended for most production use |
| **Compact** | ~83% | Good | Storage-constrained environments |
| **Minimal** | ~88% | Basic | Basic search, minimal storage |
| **Compressed** | ~80% | Excellent | Archive/backup (requires decompression) |

## ⚙️ Configuration

The converter includes extensive configuration options in `universal_converter.js`:

### Input/Output Settings

```javascript
INPUT_DIRECTORY: '../../Data'           # Input files location
OUTPUT_DIRECTORY: '../../output'        # Output files location
FILE_PATTERNS: {
  INCLUDE: /\.json$/i,                  # Include JSON files
  EXCLUDE: /\.(log|tmp|backup)$/i       # Exclude temp files
}
```

### Embedding Configuration

```javascript
EMBEDDINGS: {
  DENSE_DIM: 384,                       # Dense embedding dimensions
  MAX_SPARSE_FEATURES: 100,             # Maximum sparse keywords
  ENABLE_DENSE: true,                   # Enable dense embeddings
  ENABLE_SPARSE: true,                  # Enable sparse embeddings
  ENABLE_HYBRID: true                   # Enable hybrid approach
}
```

### Performance Settings

```javascript
PROCESSING: {
  BATCH_SIZE: 1000,                     # Items per batch
  CONCURRENCY_LIMIT: 5,                 # Parallel processing limit
  ENABLE_STREAMING: true,               # Use streaming for large files
  MEMORY_THRESHOLD_MB: 512              # Memory usage threshold
}
```

## 📊 Detailed Processing Workflow

### What Happens When You Run `npm run convert`

#### Phase 1: Discovery & Validation (1-2 seconds)

```text
🔍 Scanning for JSON files in: /path/to/Data
📁 Found 1 JSON files to process:
   - vertex_catalog.json
```

- Scans `Data/` directory for `.json` files
- Validates file accessibility and basic structure
- Estimates processing requirements

#### Phase 2: Format Detection & Parsing (2-5 seconds)

```text
📊 Detected format: vertex, Products: 3811
🔄 Using fallback parser for: vertex_catalog.json
```

- **Auto-detects format**: Recognizes `{"products": [...]}`, `[...]`, or custom structures
- **Chooses parser**: Streaming parser for large files, fallback for complex structures
- **Validates data**: Ensures required fields are present

#### Phase 3: Product Processing (Main Phase)

```text
Processing vertex_catalog.json |████████████████████| 100% | 3811/3811 | Speed: 345/s
```

**For each product, the system:**

1. **Data Cleaning**:
   - Removes HTML tags from descriptions
   - Normalizes text encoding
   - Validates required fields

2. **Field Mapping**:
   - Maps input fields to Vertex AI format
   - Generates SEO-friendly URIs
   - Standardizes price information

3. **Embedding Generation** (Most time-consuming):
   - **Dense Embedding**: 384-dimensional semantic vector
   - **Sparse Embedding**: Keyword-weight pairs for exact matching
   - **Title Embedding**: Focused on product titles
   - **Category Embedding**: Focused on categories
   - **Search Readiness Score**: Quality metric (0-1)

4. **Format Transformation**:
   - Converts to Vertex AI Commerce Search JSON structure
   - Adds required fields (languageCode, availability, etc.)
   - Optimizes for search performance

#### Phase 4: Output Generation (1-3 seconds)

```text
💾 Writing combined output (3811 products)...
📁 Combined output written: output/all_data_files_commerce_ready.jsonl
```

- Writes JSONL format (one JSON object per line)
- Creates multiple output files if needed (sharding)
- Generates processing statistics and reports

#### Phase 5: Completion Summary

```text
🎉 DYNAMIC CONVERSION COMPLETE!
📊 Total Products: 3811
🧠 Products with Multi-Level Embeddings: 3811
📈 Embedding Success Rate: 100%
```

### Understanding the Output

**Generated Files:**

**In `output/` directory (original, full-featured):**

- `all_data_files_commerce_ready.jsonl` - Main output file (~28KB per product)
- `vertex_catalog_commerce_ready_shard_000.jsonl` - Sharded version
- `dynamic_conversion_report.json` - Detailed statistics

**In `optimized/` directory (size-optimized versions):**

- `all_data_files_commerce_ready_balanced.jsonl` - Balanced optimization (~11KB per product)
- `all_data_files_commerce_ready_compact.jsonl` - Compact version (~5KB per product)
- `all_data_files_commerce_ready_minimal.jsonl` - Minimal version (~3KB per product)

**File Structure:**

- **JSONL Format**: Each line is a complete JSON object
- **Self-contained**: Each product has all necessary data
- **Vertex AI Ready**: Direct import to Google Cloud Commerce Search
- **Directory Separation**: Original and optimized files are cleanly separated

## 📈 Performance Metrics

The converter provides detailed performance tracking:

- **Processing Speed**: Items per second
- **Memory Usage**: Real-time memory monitoring
- **File Statistics**: Per-file processing metrics
- **Search Readiness**: Quality scores for each product
- **Error Tracking**: Detailed error logs and recovery

## 🔧 Troubleshooting

### Common Issues

1. **Out of Memory Errors**:

   ```bash
   # Increase memory allocation
   node --max-old-space-size=8192 universal_converter.js
   ```

2. **Large File Processing**:
   - Enable streaming: Set `ENABLE_STREAMING: true`
   - Reduce batch size: Lower `BATCH_SIZE` value
   - Enable checkpointing for resume capability

3. **Missing Dependencies**:

   ```bash
   npm install  # Reinstall all dependencies
   ```

### Log Files

Check the `logs/` directory for detailed processing information:

- `conversion.log`: General processing logs
- `errors.log`: Error-specific logs
- Progress and performance metrics

## 🎯 Search Optimization Features

### Multi-layered Keyword Extraction

- **Context-aware weighting**: Title, brand, category emphasis
- **Pattern recognition**: Sizes, colors, numbers, commerce terms
- **Synonym expansion**: Enhanced search coverage
- **Stemming support**: Language processing optimization

### Embedding Quality

- **Search readiness scoring**: 0-1 quality metric per product
- **Multi-context embeddings**: Different search scenarios
- **Hybrid approach**: Combines semantic and keyword matching
- **Performance optimization**: Balanced accuracy and speed

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review log files for detailed error information

## 🔍 Example Usage Scenarios

### Scenario 1: Single File Conversion

```bash
# Place your file in Data/ directory
cp my_products.json Data/
npm run convert
# Output: output/my_products_commerce_ready.jsonl
```

### Scenario 2: Batch Processing Multiple Files

```bash
# Place multiple JSON files in Data/
cp *.json Data/
npm run convert:scalable
# Output: Multiple JSONL files in output/ directory
```

### Scenario 3: Resume Interrupted Processing

```bash
# If processing was interrupted, simply restart
npm run convert
# The system will automatically resume from the last checkpoint
```

## 📋 Input File Requirements

### Minimum Required Fields

For successful conversion, your JSON should contain at least:

- **Product ID**: `id`, `product_id`, or `sku`
- **Product Name**: `title`, `name`, or `product_name`

### Recommended Fields for Best Results

- **Description**: Rich product descriptions improve search quality
- **Categories**: Help with filtering and organization
- **Price**: Essential for commerce applications
- **Brand**: Important for brand-based searches
- **Attributes**: Additional product specifications

### File Size Limitations

- **Small files** (< 100MB): Standard processing
- **Medium files** (100MB - 1GB): Automatic streaming enabled
- **Large files** (> 1GB): Use `convert:scalable` command
- **Maximum**: No hard limit, but ensure sufficient disk space

## 🎛️ Advanced Configuration Options

### Custom Embedding Settings

```javascript
// In universal_converter.js, modify CONFIG.EMBEDDINGS:
EMBEDDINGS: {
  DENSE_DIM: 384,                    // Adjust embedding dimensions
  MAX_SPARSE_FEATURES: 150,          // Increase for more keywords
  KEYWORD_BOOST: {                   // Custom field importance
    'title': 4.0,                    // Higher = more important
    'brand': 3.0,
    'category': 2.5
  }
}
```

### Memory Optimization

```javascript
// Adjust for your system capabilities:
PROCESSING: {
  BATCH_SIZE: 500,                   // Reduce for less memory usage
  MEMORY_THRESHOLD_MB: 256,          // Lower threshold for smaller systems
  CONCURRENCY_LIMIT: 3               // Reduce parallel processing
}
```

## 📊 Output File Structure

### Generated Files

```text
output/                                     # Original conversion output
├── all_data_files_commerce_ready.jsonl    # Main output file (full-featured)
├── vertex_catalog_commerce_ready_shard_000.jsonl  # Sharded version
├── dynamic_conversion_report.json         # Conversion statistics
└── .gitkeep                               # Preserves directory in git

optimized/                                  # Size-optimized output (auto-created)
├── all_data_files_commerce_ready_balanced.jsonl   # 60% size reduction
├── all_data_files_commerce_ready_compact.jsonl    # 83% size reduction
├── all_data_files_commerce_ready_minimal.jsonl    # 88% size reduction
└── *.jsonl.gz                             # Compressed versions (if created)
```

### JSONL Format Benefits

- **Line-by-line processing**: Easy to stream and process
- **Vertex AI Compatible**: Direct import to Google Cloud
- **Error resilient**: Single malformed line doesn't break entire file
- **Scalable**: Handles millions of products efficiently

## 🚨 Error Handling & Recovery

### Automatic Error Recovery

- **Retry mechanism**: Failed operations retry up to 3 times
- **Graceful degradation**: Continues processing even if some products fail
- **Error isolation**: Single product errors don't stop entire batch
- **Detailed logging**: All errors logged with context

### Manual Error Resolution

1. **Check error logs**: Review `logs/errors.log`
2. **Identify patterns**: Common issues in failed products
3. **Fix source data**: Correct issues in input JSON
4. **Resume processing**: Restart converter to process fixed data

## 🔧 Development & Customization

### Adding New Input Formats

1. **Extend ProductConverter class**: Add new conversion method
2. **Update format detection**: Modify auto-detection logic
3. **Test thoroughly**: Ensure compatibility with existing features

### Custom Attribute Processing

```javascript
// Example: Add custom attribute processing
processCustomAttributes(product) {
  const attributes = {};

  // Your custom logic here
  if (product.customField) {
    attributes.custom_field = {
      text: [product.customField]
    };
  }

  return attributes;
}
```

## 📈 Performance Benchmarks

### Typical Processing Speeds

- **Small products** (< 1KB each): 1000-2000 products/second
- **Medium products** (1-10KB each): 500-1000 products/second
- **Large products** (> 10KB each): 100-500 products/second

### Memory Usage

- **Base memory**: ~100MB for application
- **Per 1000 products**: ~50-100MB additional
- **Peak usage**: Depends on batch size and product complexity

### Optimization Tips

1. **Use streaming**: For files > 100MB
2. **Adjust batch size**: Balance memory vs. speed
3. **Enable checkpointing**: For long-running processes
4. **Monitor memory**: Use built-in memory monitoring

---

**Note**: This converter is optimized for Google Cloud Vertex AI Commerce Search but can be adapted for other commerce search platforms with minimal modifications.
