import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { fileURLToPath } from 'url';
// @ts-ignore
import { parseConfigFile } from '../src/SiteConfigParser.ts';

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