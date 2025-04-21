/**
 * Site configuration for content extraction
 * Based on FiveFilters site pattern format
 */
export interface SiteConfig {
  // XPath expressions for targeting content
  title?: string[];                     // The page title
  body?: string[];                      // The body of the article
  date?: string[];                      // The publication date
  author?: string[];                    // The author(s) of the piece

  // Elements to remove
  strip?: string[];                     // Strip matching elements
  strip_id_or_class?: string[];         // Strip elements by class/id
  strip_image_src?: string[];           // Strip images by src

  // Content processing options
  prune?: boolean;                      // Clean content from non-essential elements using Readability algorithm
  autodetect_on_failure?: boolean;      // Auto-detect if patterns fail
  insert_detected_image?: boolean;      // Insert detected image from metadata
  skip_json_ld?: boolean;               // Skip extraction from JSON-LD data

  // Multi-page handling
  single_page_link?: string[];          // Link to single-page view
  single_page_link_in_feed?: string[];  // Single-page link in feed items
  next_page_link?: string[];            // Link to next page

  // String replacements
  find_string?: string[];               // Strings to find
  replace_string?: string[];            // Replacement strings

  // HTTP options
  http_header?: Record<string, string>; // Additional HTTP headers

  // Conditional processing
  if_page_contains?: string[];            // XPath expressions for conditional processing

  // Wrapping elements
  wrap_in?: Record<string, string>;     // Wrap elements with specified tag

  // Advertisement detection
  native_ad_clue?: string[];            // XPath to identify native ads
  
  // Image handling
  src_lazy_load_attr?: string[];        // Image attribute names for lazyloaded images
}

/**
 * Information about available site configurations
 */
export interface SiteIndexData {
  domains: Record<string, boolean>;     // Domains like example.com
  wildcards: string[];                  // Wildcard domains starting with . (e.g. .example.com)
  specificSubdomains: Record<string, boolean>; // Specific subdomains (e.g. blog.example.com)
}