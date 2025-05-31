# Constants Directory

This directory contains all configuration constants and settings for the SearchforCommerceScript project, organized by functionality for better maintainability and reusability.

## Directory Structure

```
constants/
├── index.js           # Main export file - import everything from here
├── config.js          # Main configuration combining all constants
├── paths.js           # File and directory path constants
├── embeddings.js      # Embedding configuration and text processing
├── processing.js      # Processing and performance settings
├── optimization.js    # File size optimization configurations
├── logging.js         # Logging and monitoring settings
└── README.md          # This documentation file
```

## Usage

### Basic Usage (Recommended)

```javascript
// Import the main CONFIG object (backward compatible)
const { CONFIG } = require('./constants');

// Use configuration
console.log(CONFIG.INPUT_DIRECTORY);
console.log(CONFIG.EMBEDDINGS.DENSE_DIM);
```

### Advanced Usage

```javascript
// Import specific constant groups
const { 
    PATHS, 
    EMBEDDINGS, 
    PROCESSING, 
    OPTIMIZATION 
} = require('./constants');

// Use specific configurations
const inputPath = PATHS.INPUT_DIRECTORY;
const batchSize = PROCESSING.BATCH_SIZE;
const optimizationLevel = OPTIMIZATION.LEVELS.BALANCED;
```

### Environment-Specific Configuration

```javascript
const { CONFIG_HELPERS } = require('./constants');

// Get configuration for specific environment
const devConfig = CONFIG_HELPERS.getEnvironmentConfig('development');
const prodConfig = CONFIG_HELPERS.getEnvironmentConfig('production');
```

### Convenience Imports

```javascript
const { COMMON } = require('./constants');

// Quick access to frequently used constants
const inputDir = COMMON.INPUT_DIR;
const batchSize = COMMON.BATCH_SIZE;
const denseDim = COMMON.DENSE_DIM;
```

## Constant Categories

### 1. **paths.js** - File and Directory Paths
- Input/output directories
- Script locations
- Log file paths
- File naming patterns
- Path helper functions

### 2. **embeddings.js** - Embedding Configuration
- Dense/sparse embedding settings
- Text processing patterns
- Keyword boosting weights
- Synonym expansion rules
- Language processing options

### 3. **processing.js** - Processing Settings
- Batch processing configuration
- Memory management settings
- Performance targets
- Resource allocation
- Concurrency limits

### 4. **optimization.js** - Optimization Settings
- File size optimization levels
- Field optimization rules
- Compression settings
- Size estimation formulas
- Reduction targets

### 5. **logging.js** - Logging Configuration
- Log levels and formats
- Progress bar settings
- Error handling
- Performance monitoring
- Log rotation settings

### 6. **config.js** - Main Configuration
- Combines all constants
- Backward compatibility
- Environment configurations
- Helper functions

## Migration from Old Configuration

### Before (in universal_converter.js)
```javascript
const CONFIG = {
    INPUT_DIRECTORY: './Data',
    OUTPUT_DIRECTORY: './output',
    EMBEDDINGS: {
        DENSE_DIM: 384,
        // ... more settings
    }
};
```

### After (using constants)
```javascript
const { CONFIG } = require('./constants');
// All settings are now centralized and organized
```

## Adding New Constants

1. **Choose the appropriate file** based on functionality
2. **Add the constant** to the relevant section
3. **Export it** in the module.exports
4. **Update index.js** to include the new constant
5. **Update this README** if needed

### Example: Adding a new path constant

```javascript
// In constants/paths.js
const PATHS = {
    // ... existing paths
    NEW_DIRECTORY: './new_directory'
};

// In constants/index.js
module.exports = {
    // ... existing exports
    PATHS,
    // ... rest of exports
};
```

## Best Practices

1. **Use descriptive names** for constants
2. **Group related constants** together
3. **Provide comments** explaining complex settings
4. **Maintain backward compatibility** when possible
5. **Use environment-specific configs** for different deployment scenarios
6. **Validate configurations** before use

## Environment Variables

Some constants can be overridden by environment variables:

```bash
# Override input directory
export INPUT_DIRECTORY="/custom/data/path"

# Override batch size
export BATCH_SIZE=500

# Override log level
export LOG_LEVEL="debug"
```

## Testing Configuration

```javascript
const { CONFIG_HELPERS } = require('./constants');

// Validate configuration
const isValid = CONFIG_HELPERS.validateConfig(CONFIG);
console.log('Configuration valid:', isValid);
```

## Backward Compatibility

The constants are designed to be backward compatible with the existing codebase. The main `CONFIG` object maintains the same structure as before, so existing code will continue to work without modifications.
