import type { SiteConfig } from './types';
import { domains, wildcards, specificSubdomains } from './site-index';

/**
 * Manager for site-specific extraction configurations
 */
export class SiteConfigManager {
  private cache: Record<string, SiteConfig> = {};
  private loading: Record<string, Promise<SiteConfig>> = {};

  /**
   * Normalizes a hostname by removing 'www.' prefix and converting to lowercase
   */
  private normalizeHostname(hostname: string): string {
    return hostname.toLowerCase();
  }

  /**
   * Gets the appropriate config key for a given hostname based on FiveFilters rules:
   * - example.com.txt matches www.example.com and example.com
   * - .example.com.txt matches subdomains like sport.example.com but NOT www.example.com or example.com
   * - sport.example.com.txt matches only that specific subdomain
   */
  private getConfigKeyForHost(hostname: string): string | null {
    hostname = this.normalizeHostname(hostname);

    // Check for exact match first (highest priority)
    if (domains[hostname]) {
      return hostname;
    }

    // Check for "www." variant - example.com.txt should match www.example.com
    if (hostname.startsWith('www.')) {
      const withoutWww = hostname.substring(4);
      if (domains[withoutWww]) {
        return withoutWww;
      }
    }

    // Check for specific subdomain match
    if (specificSubdomains[hostname]) {
      return hostname;
    }

    // Check for wildcard match (.example.com.txt)
    for (const wildcard of wildcards) {
      // Get the domain part without the leading dot
      const wildcardDomain = wildcard.substring(1);

      // Check if hostname is a subdomain of wildcardDomain
      // AND ensure it's not just the domain itself (no wildcard for example.com itself)
      if (hostname.endsWith(wildcardDomain) &&
          hostname !== wildcardDomain &&
          hostname !== 'www.' + wildcardDomain) {
        return wildcard;
      }
    }

    return null;
  }

  /**
   * Checks if a configuration exists for a given hostname
   */
  public hasConfigForHost(hostname: string): boolean {
    return this.getConfigKeyForHost(hostname) !== null;
  }

  /**
   * Gets configuration for a hostname, loading it dynamically if needed
   */
  public async getConfigForHost(hostname: string): Promise<SiteConfig> {
    hostname = this.normalizeHostname(hostname);

    // Check cache first
    if (this.cache[hostname]) {
      return this.cache[hostname];
    }

    // If already loading, return the promise
    if (hostname in this.loading) {
      return this.loading[hostname];
    }

    // Determine which config file to load
    const configKey = this.getConfigKeyForHost(hostname);

    // If we found a matching config, load it
    if (configKey) {
      this.loading[hostname] = this.loadConfig(configKey).then((config: SiteConfig) => {
        this.cache[hostname] = config;
        delete this.loading[hostname];
        return config;
      });

      return this.loading[hostname];
    }

    // Fall back to global config
    return this.getGlobalConfig();
  }

  /**
   * Loads configuration for a specific config key
   */
  private async loadConfig(configKey: string): Promise<SiteConfig> {
    try {
      // Dynamic import for the config file
      const configModule = await import(`./configs/${configKey}.js`);
      return configModule.default as SiteConfig;
    } catch (error) {
      console.error(`Failed to load config for ${configKey}:`, error);
      return this.getGlobalConfig();
    }
  }

  /**
   * Returns the global fallback configuration
   */
  private getGlobalConfig(): SiteConfig {
    // Return a default empty configuration
    return {
      title: [],
      author: [],
      date: [],
      body: [],
      strip: [],
      native_ad_clue: [],
      insert_detected_image: true, // Default is true according to the documentation
      autodetect_on_failure: true, // Default is true
      skip_json_ld: true, // Default is true as specified
      src_lazy_load_attr: undefined, // Default is undefined
      // Add any other default properties your SiteConfig type requires
    };
  }

  /**
   * Preloads configurations for an array of hostnames
   */
  public async preloadConfigs(hostnames: string[]): Promise<void> {
    const promises = hostnames.map(hostname =>
      this.getConfigForHost(hostname)
    );

    await Promise.all(promises);
  }

  /**
   * Clears the internal configuration cache
   */
  public clearCache(): void {
    this.cache = {};
  }
}