# Grabby-JS Site Config

A dynamic site configuration loader for Grabby-JS based on FiveFilters patterns.

## Features

- Dynamically loads site-specific extraction rules
- TypeScript support with full typings
- Memory-efficient with on-demand loading
- Compatible with all JavaScript environments

## Installation

```bash
npm install grabby-js-site-config
```

## Usage

```javascript
import siteConfigManager from 'grabby-js-site-config';

async function extractContent(url) {
  // Get the site configuration for this URL
  const { hostname } = new URL(url);
  const config = await siteConfigManager.getConfigForHost(hostname);
  
  // Now use the configuration with your content extractor
  console.log('Using config:', config);
  
  // Example: checking if this site has specific extraction rules
  if (config.title && config.title.length > 0) {
    console.log('This site has custom title extraction rules');
  }
}

// Preload configs for frequently used sites
siteConfigManager.preloadConfigs(['medium.com', 'wikipedia.org']);
```

## API

### siteConfigManager.getConfigForHost(hostname)

Asynchronously loads and returns the configuration for the given hostname.

### siteConfigManager.hasConfigForHost(hostname)

Checks if a configuration exists for the given hostname.

### siteConfigManager.preloadConfigs(hostnames)

Preloads configurations for an array of hostnames.

### siteConfigManager.clearCache()

Clears the internal configuration cache.

## License

MIT