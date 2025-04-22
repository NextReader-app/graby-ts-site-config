# Graby-TS Site Config

A dynamic site configuration loader for Graby-TS based on FiveFilters site patterns format.
This library provides standardized content extraction rules for different websites, allowing for consistent extraction
across a wide range of domains.

The site configuration rules are sourced from [FiveFilters ftr-site-config](https://github.com/fivefilters/ftr-site-config), which contains a comprehensive collection of extraction rules for thousands of websites.

## Features

- Dynamically loads site-specific extraction rules
- Well-typed with full TypeScript support
- Memory-efficient with on-demand loading and caching
- Compatible with all JavaScript environments
- Supports wildcard domain patterns
- Based on the established FiveFilters site patterns format

## Installation

```bash
npm install graby-ts-site-config
```

## Usage

```javascript
import { SiteConfigManager } from 'graby-ts-site-config';

// Create a site config manager instance
const configManager = new SiteConfigManager();

async function extractContent(url) {
  // Get the site configuration for this URL
  const { hostname } = new URL(url);
  const config = await configManager.getConfigForHost(hostname);
  
  // Now use the configuration with your content extractor
  console.log('Using config:', config);
  
  // Example: checking if this site has specific extraction rules
  if (config.title && config.title.length > 0) {
    console.log('This site has custom title extraction rules');
  }
}

// Preload configs for frequently used sites
configManager.preloadConfigs(['medium.com', 'wikipedia.org']);
```

## API

### SiteConfigManager

#### `getConfigForHost(hostname: string): Promise<SiteConfig>`

Asynchronously loads and returns the configuration for the given hostname.

```javascript
const config = await configManager.getConfigForHost('nytimes.com');
```

#### `hasConfigForHost(hostname: string): boolean`

Checks if a configuration exists for the given hostname.

```javascript
if (configManager.hasConfigForHost('medium.com')) {
  console.log('Medium has custom extraction rules');
}
```

#### `preloadConfigs(hostnames: string[]): Promise<void>`

Preloads configurations for an array of hostnames to improve performance.

```javascript
await configManager.preloadConfigs(['medium.com', 'wikipedia.org']);
```

#### `clearCache(): void`

Clears the internal configuration cache.

```javascript
configManager.clearCache();
```

## Configuration Fields

The SiteConfig object contains various fields that control how content is extracted from a website:

### Content Selection (XPath expressions)

| Field | Type | Description |
|-------|------|-------------|
| `title` | string[] | XPath expressions to extract the page title |
| `body` | string[] | XPath expressions to extract the article body content |
| `date` | string[] | XPath expressions to extract the publication date |
| `author` | string[] | XPath expressions to extract the author(s) information |

### Content Cleaning

| Field | Type | Description |
|-------|------|-------------|
| `strip` | string[] | XPath expressions for elements to remove from the content |
| `strip_id_or_class` | string[] | Element IDs or classes to remove from the content |
| `strip_image_src` | string[] | Remove images with matching src attributes |
| `native_ad_clue` | string[] | XPath expressions to identify native advertisements |

### Processing Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prune` | boolean | `true` | Clean content from non-essential elements using Readability algorithm |
| `autodetect_on_failure` | boolean | `true` | Fall back to auto-detection if the pattern-based extraction fails |
| `insert_detected_image` | boolean | `true` | Insert the main image detected from metadata |
| `skip_json_ld` | boolean | `true` | Skip extraction from JSON-LD structured data |

### Multi-page Handling

| Field | Type | Description |
|-------|------|-------------|
| `single_page_link` | string[] | XPath expressions to find the "view as single page" link |
| `single_page_link_in_feed` | string[] | XPath for single-page links in feed items |
| `next_page_link` | string[] | XPath expressions to find links to subsequent pages |
| `if_page_contains` | string[] | XPath expressions for conditional processing of multi-page content |

### Content Enhancement

| Field | Type | Description |
|-------|------|-------------|
| `find_string` | string[] | Strings to find and replace in the content |
| `replace_string` | string[] | Replacement strings (paired with find_string) |
| `wrap_in` | Record<string, string> | Wrap matching elements with specified tags |
| `src_lazy_load_attr` | string[] | Image attribute names for lazy-loaded images |

### HTTP Options

| Field | Type | Description |
|-------|------|-------------|
| `http_header` | Record<string, string> | Additional HTTP headers to send with requests |

## License

MIT