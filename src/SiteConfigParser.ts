import type { SiteConfig } from './types';

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
export function parseConfigFile(content: string, filename: string): SiteConfig {
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
          config.http_header[param.toLowerCase()] = trimmedValue;
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

        if (!KNOWN_DIRECTIVES.has(directive) && !IGNORED_OTHER_TAGS.has(directive)) {
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

  // Clean up find_string & replace_string if they don't have equal numbers
  if (config.find_string && config.replace_string) {
    if (config.find_string.length !== config.replace_string.length) {
      console.warn('find_string & replace_string size mismatch, check the site config to fix it', {
        find_size: config.find_string.length, 
        replace_size: config.replace_string.length
      });
      config.find_string = [];
      config.replace_string = [];
    }
  }

  return config as SiteConfig;
}