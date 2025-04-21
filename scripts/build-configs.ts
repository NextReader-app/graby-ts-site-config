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

// Track known directive types for debugging unknown ones
const KNOWN_DIRECTIVES = new Set([
  'title', 'body', 'date', 'author', 'strip', 'strip_attr', 'strip_id_or_class',
  'strip_image_src', 'tidy', 'prune', 'autodetect_on_failure', 'insert_detected_image',
  'single_page_link', 'single_page_link_in_feed', 'next_page_link',
  'find_string', 'replace_string', 'http_header', 'if_page_contains',
  'wrap_in', 'test_url', 'test_contains', 'parser', 'convert_double_br_tags',
  'strip_comments', 'move_into', 'autodetect_next_page', 'dissolve', 'footnotes',
]);

/**
 * Parses a site config text file into a SiteConfig object
 */
function parseConfigFile(content: string, filename: string): SiteConfig {
  const config: SiteConfig = {
    title: [],
    body: [],
    strip: [],
    strip_id_or_class: [],
    strip_image_src: [],
    find_string: [],
    replace_string: [],
    http_header: {},
    wrap_in: {},
  };

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

        if (directive === 'http_header') {
          config.http_header![param] = trimmedValue;
          continue;
        }

        if (directive === 'replace_string') {
          config.find_string!.push(param);
          config.replace_string!.push(trimmedValue);
          continue;
        }

        if (directive === 'wrap_in') {
          config.wrap_in![param] = trimmedValue;
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

      // Skip test and unused entries
      if (key in ['test_url', 'test_contains', 'parser', 'convert_double_br_tags', 'strip_comments', 'move_into',
        'autodetect_next_page', 'dissolve', 'footnotes']) {
        continue;
      }

      // Handle boolean values
      if (key === 'tidy' || key === 'prune' || key === 'autodetect_on_failure' || key === 'insert_detected_image') {
        (config as any)[key] = (value.toLowerCase() === 'yes' || value.toLowerCase() === 'true');
        continue;
      }

      // Handle strip_attr as an alias for strip
      if (key === 'strip_attr') {
        config.strip!.push(value);
        continue;
      }

      // Handle array values
      if (Array.isArray(config[key as keyof SiteConfig])) {
        (config[key as keyof SiteConfig] as string[]).push(value);
      }
      // Handle if_page_contains
      else if (key === 'if_page_contains') {
        if (!config.if_page_contains) {
          config.if_page_contains = {};
        }
        // Parse if_page_contains format
        const parts = value.split(' ');
        const subKey = parts[0];
        const subValue = parts.slice(1).join(' ');
        config.if_page_contains[subKey] = subValue;
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