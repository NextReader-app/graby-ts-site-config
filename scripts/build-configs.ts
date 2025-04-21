import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { fileURLToPath } from 'url';
import type { SiteConfig } from '../src';

// Get directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory paths
const CONFIG_DIR = process.env.CONFIG_DIR || path.resolve(__dirname, '../ftr-site-config');
const OUTPUT_DIR = path.resolve(__dirname, '../src/sites');
const INDEX_FILE = path.resolve(__dirname, '../src/site-index.ts');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Authentication-related tags that we'll ignore
const IGNORED_AUTH_TAGS = new Set([
  'requires_login', 'login_uri', 'login_username_field', 'login_password_field', 'login_extra_fields', 'not_logged_in_xpath'
]);

// Testing and debugging related tags that we'll ignore
const IGNORED_TEST_TAGS = new Set([
  'test', 'test_url', 'test_contains', 'test_content', 'test_urls'
]);

// Other tags that we currently don't process
const IGNORED_OTHER_TAGS = new Set([
  'parser', 'convert_double_br_tags', 'strip_comments', 'move_into', 'autodetect_next_page', 'dissolve', 'footnotes', 'skip_id_or_class', 'tidy'
]);

// Boolean parameters - these will be converted to boolean values
const BOOLEAN_TAGS = new Set([
  'prune', 'autodetect_on_failure', 'insert_detected_image', 'skip_json_ld'
]);

// Track known directive types for debugging unknown ones
const KNOWN_DIRECTIVES = new Set([
  // Core content extraction selectors
  'title', 'body', 'date', 'author',

  // Content modification directives
  'strip', 'strip_attr', 'strip_id_or_class', 'strip_image_src',

  // Boolean options
  ...BOOLEAN_TAGS,

  // Multi-page handling
  'single_page_link', 'single_page_link_in_feed', 'next_page_link',

  // Advertisement detection
  'native_ad_clue',
  
  // Image handling
  'src_lazy_load_attr',

  // String replacements
  'find_string', 'replace_string',

  // HTTP and special directives
  'http_header', 'if_page_contains', 'wrap_in',

  // Ignored directives we still want to recognize
  ...IGNORED_AUTH_TAGS,
  ...IGNORED_TEST_TAGS,
  ...IGNORED_OTHER_TAGS
]);

/**
 * Parses a site config text file into a SiteConfig object
 */
function parseConfigFile(content: string, filename: string): SiteConfig {
  // Create an empty config object - we'll only add fields that are explicitly defined
  const config: Partial<SiteConfig> = {};

  const unknownDirectives = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    // Handle special function-like directives: directive(param): value
    if (trimmed.includes('(') && trimmed.includes('):')) {
      const match = trimmed.match(/^([a-z_]+)\(([^)]+)\):(.+)$/i);
      if (match) {
        const [, directive, param, value] = match;
        const trimmedValue = value.trim();

        // Skip ignored directives
        if (IGNORED_AUTH_TAGS.has(directive) || IGNORED_TEST_TAGS.has(directive) || IGNORED_OTHER_TAGS.has(directive)) {
          continue;
        }

        if (directive === 'http_header') {
          if (!config.http_header) {
            config.http_header = {};
          }
          config.http_header[param] = trimmedValue;
          continue;
        }

        if (directive === 'replace_string') {
          if (!config.find_string) {
            config.find_string = [];
          }
          if (!config.replace_string) {
            config.replace_string = [];
          }
          config.find_string.push(param);
          config.replace_string.push(trimmedValue);
          continue;
        }

        if (directive === 'wrap_in') {
          if (!config.wrap_in) {
            config.wrap_in = {};
          }
          config.wrap_in[param] = trimmedValue;
          continue;
        }

        if (!KNOWN_DIRECTIVES.has(directive)) {
          unknownDirectives.add(`${directive}(${param}): ${trimmedValue}`);
        }
        continue;
      }
    }

    // Handle standard key: value format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (!key || !value) continue;

      // Skip all ignored tags
      if (IGNORED_AUTH_TAGS.has(key) || IGNORED_TEST_TAGS.has(key) || IGNORED_OTHER_TAGS.has(key)) {
        continue;
      }

      // Boolean values are now handled in the main switch below

      // Handle strip_attr as an alias for strip
      if (key === 'strip_attr') {
        if (!config.strip) {
          config.strip = [];
        }
        config.strip.push(value);
        continue;
      }

      // Handle array values for content selectors and modifiers
      if (['title', 'body', 'date', 'author', 'strip', 'strip_id_or_class', 'strip_image_src', 
           'single_page_link', 'single_page_link_in_feed', 'next_page_link', 'native_ad_clue',
           'find_string', 'replace_string', 'src_lazy_load_attr', 'if_page_contains'].includes(key)) {
        if (!config[key as keyof SiteConfig]) {
          (config as any)[key] = [];
        }
        (config[key as keyof SiteConfig] as string[]).push(value);
      }
      // Handle boolean values
      else if (BOOLEAN_TAGS.has(key)) {
        (config as any)[key] = (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true');
      }
      // Track unknown directives for debug purposes
      else if (!KNOWN_DIRECTIVES.has(key)) {
        unknownDirectives.add(`${key}: ${value}`);
      }
    }
  }

  // Log unknown directives for debugging
  if (unknownDirectives.size > 0) {
    console.log(`\nUnknown directives in ${filename}:`);
    unknownDirectives.forEach(dir => console.log(`  - ${dir}`));
  }

  return config;
}

// Track available configs
const siteIndex = {
  domains: {} as Record<string, boolean>,
  wildcards: [] as string[],
  specificSubdomains: {} as Record<string, boolean>
};

// Process all config files
const configFiles = glob.sync(path.join(CONFIG_DIR, '*.txt'), { dot: true });
console.log(`Found ${configFiles.length} config files`);

for (const file of configFiles) {
  const basename = path.basename(file, '.txt');
  
  // Skip files with only TLD (except 'global')
  if (basename !== 'global' && !basename.includes('.')) {
    continue;
  }

  // Skip test_url entries and empty configs
  const content = fs.readFileSync(file, 'utf8');

  const config = parseConfigFile(content, basename);

  // Create TypeScript file for this config
  const outputFile = path.join(OUTPUT_DIR, `${basename}.ts`);
  const fileContent = `// Configuration for ${basename}
// Automatically generated from FiveFilters site config
import type { SiteConfig } from '../types';

const config: SiteConfig = ${JSON.stringify(config, null, 2)};

export default config;`;

  fs.writeFileSync(outputFile, fileContent);

  // Add to the appropriate index
  if (basename === 'global') {
    // Global config - handled specially
  } else if (basename.startsWith('.')) {
    // Wildcard config like .example.com
    siteIndex.wildcards.push(basename);
  } else {
    // Count the dots to determine type
    const parts = basename.split('.');

    if (parts.length === 2) {
      // example.com format (two parts with one dot) -> regular domain
      siteIndex.domains[basename] = true;
    } else if (parts.length > 2) {
      // blog.example.com format (more than two parts) -> specific subdomain
      siteIndex.specificSubdomains[basename] = true;
    } else {
      // Only one part, no dots (e.g., "example") -> regular domain
      siteIndex.domains[basename] = true;
    }
  }
}

// Create index file
const indexContent = `// Auto-generated index of available site configurations
// Generated: ${new Date().toISOString()}
// Total configurations: ${configFiles.length}

export const domains: Record<string, boolean> = ${JSON.stringify(siteIndex.domains)};
export const wildcards: string[] = ${JSON.stringify(siteIndex.wildcards)};
export const specificSubdomains: Record<string, boolean> = ${JSON.stringify(siteIndex.specificSubdomains)};

/**
 * Checks if configuration exists for a hostname
 */
export function hasConfig(hostname: string): boolean {
  // Normalize hostname
  hostname = hostname.toLowerCase();
  
  // Check exact match
  if (domains[hostname]) return true;
  
  // Check for "www." variant
  if (hostname.startsWith('www.') && domains[hostname.substring(4)]) {
    return true;
  }
  
  // Check specific subdomain match
  if (specificSubdomains[hostname]) {
    return true;
  }
  
  // Check wildcard match
  for (const wildcard of wildcards) {
    const wildcardDomain = wildcard.substring(1);
    if (hostname.endsWith(wildcardDomain) && 
        hostname !== wildcardDomain && 
        hostname !== 'www.' + wildcardDomain) {
      return true;
    }
  }
  
  return false;
}`;

fs.writeFileSync(INDEX_FILE, indexContent);
console.log(`\nCreated index file with:
- ${Object.keys(siteIndex.domains).length} regular domains
- ${siteIndex.wildcards.length} wildcard domains
- ${Object.keys(siteIndex.specificSubdomains).length} specific subdomains`);