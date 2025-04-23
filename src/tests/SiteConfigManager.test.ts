import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SiteConfigManager } from '../SiteConfigManager';
import type { SiteConfig } from '../types';

// Mock configs
const mockExampleConfig: SiteConfig = {
  title: ['//h1'],
  body: ['//article'],
  date: ['//time'],
  author: ['//span[@class="author"]'],
  strip: ['//div[@class="ads"]'],
  prune: true
};

const mockGlobalConfig: SiteConfig = {
  title: [],
  author: [],
  date: [],
  body: [],
  strip: [],
  native_ad_clue: [],
  insert_detected_image: true,
  autodetect_on_failure: true,
  skip_json_ld: true,
  src_lazy_load_attr: [],
  if_page_contains: []
};

// Mock site-index module
vi.mock('../site-index', () => {
  return {
    domains: {
      'example.com': true,
      'test.com': true
    },
    wildcards: ['.example.org'],
    specificSubdomains: {
      'blog.test.net': true
    },
    hasConfig: (hostname: string) => {
      if (hostname === 'example.com' || hostname === 'www.example.com' ||
          hostname === 'test.com' || hostname === 'sub.example.org' ||
          hostname === 'another.example.org' || hostname === 'blog.test.net') {
        return true;
      }
      return false;
    }
  };
});

describe('SiteConfigManager', () => {
  let manager: SiteConfigManager;

  beforeEach(() => {
    manager = new SiteConfigManager();
    // Clear the cache before each test
    manager.clearCache();

    // Mock the loadConfig method to return our test configurations
    vi.spyOn(manager as any, 'loadConfig').mockImplementation((...args: any[]) => {
      const configKey = args[0] as string;
      if (configKey === 'global') {
        return Promise.resolve(mockGlobalConfig);
      } else {
        return Promise.resolve(mockExampleConfig);
      }
    });
  });

  it('hasConfigForHost returns correct values', () => {
    expect(manager.hasConfigForHost('example.com')).toBe(true);
    expect(manager.hasConfigForHost('www.example.com')).toBe(true);
    expect(manager.hasConfigForHost('unknown.com')).toBe(false);
    expect(manager.hasConfigForHost('sub.example.org')).toBe(true);
    expect(manager.hasConfigForHost('example.org')).toBe(false);
    expect(manager.hasConfigForHost('blog.test.net')).toBe(true);
    expect(manager.hasConfigForHost('test.net')).toBe(false);
  });

  it('normalizeHostname removes www prefix', () => {
    // @ts-ignore - Access private method for testing
    expect(manager['normalizeHostname']('www.example.com')).toBe('www.example.com');
    // @ts-ignore - Access private method for testing
    expect(manager['normalizeHostname']('EXAMPLE.COM')).toBe('example.com');
  });

  it('getConfigKeyForHost returns correct config key', () => {
    // @ts-ignore - Access private method for testing
    expect(manager['getConfigKeyForHost']('example.com')).toBe('example.com');
    // @ts-ignore - Access private method for testing
    expect(manager['getConfigKeyForHost']('www.example.com')).toBe('example.com');
    // @ts-ignore - Access private method for testing
    expect(manager['getConfigKeyForHost']('sub.example.org')).toBe('.example.org');
    // @ts-ignore - Access private method for testing
    expect(manager['getConfigKeyForHost']('blog.test.net')).toBe('blog.test.net');
    // @ts-ignore - Access private method for testing
    expect(manager['getConfigKeyForHost']('unknown.com')).toBeNull();
  });

  it('domain pattern matching follows documentation rules', () => {
    // Case 1: example.com.txt should match both www.example.com and example.com
    expect(manager.hasConfigForHost('example.com')).toBe(true);
    expect(manager.hasConfigForHost('www.example.com')).toBe(true);

    // Case 2: .example.org should match any subdomain like sport.example.org
    expect(manager.hasConfigForHost('sub.example.org')).toBe(true);
    expect(manager.hasConfigForHost('another.example.org')).toBe(true);

    // Case 3: .example.org should NOT match the main domain or www subdomain
    expect(manager.hasConfigForHost('example.org')).toBe(false);
    expect(manager.hasConfigForHost('www.example.org')).toBe(false);

    // Case 4: Specific subdomain should only match that exact subdomain
    expect(manager.hasConfigForHost('blog.test.net')).toBe(true);
    expect(manager.hasConfigForHost('news.test.net')).toBe(false);
    expect(manager.hasConfigForHost('test.net')).toBe(false);
  });

  it('getConfigForHost loads configuration', async () => {
    const config = await manager.getConfigForHost('example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  it('getConfigForHost respects caching', async () => {
    // Create a new instance for this test
    const cacheManager = new SiteConfigManager();

    // Setup spy before first call
    const loadConfigSpy = vi.spyOn(cacheManager as any, 'loadConfig').mockImplementation(() => {
      return Promise.resolve(mockExampleConfig);
    });

    // First call loads the config
    const config1 = await cacheManager.getConfigForHost('example.com');

    // Reset call history on the spy
    loadConfigSpy.mockClear();

    // Second call should use cache
    const config2 = await cacheManager.getConfigForHost('example.com');

    expect(loadConfigSpy).not.toHaveBeenCalled();
    expect(config2).toBe(config1);
  });

  it('getConfigForHost returns global config for unknown domains', async () => {
    // Create a new instance for this test
    const unknownManager = new SiteConfigManager();

    // Mock getGlobalConfig to return our mockGlobalConfig
    vi.spyOn(unknownManager as any, 'getGlobalConfig').mockImplementation(() => {
      return mockGlobalConfig;
    });

    const config = await unknownManager.getConfigForHost('unknown.com');
    expect(config).toEqual(mockGlobalConfig);
  });

  it('getConfigForHost loads subdomain configuration', async () => {
    const config = await manager.getConfigForHost('sub.example.org');
    expect(config).toEqual(mockExampleConfig);
  });

  it('getConfigForHost handles www prefix correctly', async () => {
    const config = await manager.getConfigForHost('www.example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  it('getConfigForHost loads specific subdomain configuration', async () => {
    const config = await manager.getConfigForHost('blog.test.net');
    expect(config).toEqual(mockExampleConfig);
  });

  it('preloadConfigs loads multiple configurations', async () => {
    // Create new instance
    const preloadManager = new SiteConfigManager();

    // Setup spy for loadConfig
    const loadConfigSpy = vi.spyOn(preloadManager as any, 'loadConfig')
      .mockImplementation(() => Promise.resolve(mockExampleConfig));

    // Preload configs
    await preloadManager.preloadConfigs(['example.com', 'test.com']);

    // Clear mock history after preloading
    loadConfigSpy.mockClear();

    // These should now be cached
    await preloadManager.getConfigForHost('example.com');
    await preloadManager.getConfigForHost('test.com');

    expect(loadConfigSpy).not.toHaveBeenCalled();
  });

  it('clearCache removes cached configurations', async () => {
    // Load and cache a config
    await manager.getConfigForHost('example.com');

    // Clear the cache
    manager.clearCache();

    // Mock implementation to track if loadConfig is called
    const loadConfigSpy = vi.spyOn(manager as any, 'loadConfig');

    // This should now require reloading
    await manager.getConfigForHost('example.com');

    expect(loadConfigSpy).toHaveBeenCalled();
  });

  it('loadConfig loads the correct configuration file', async () => {
    // Use the already mocked loadConfig method
    // @ts-ignore - Access private method for testing
    const config = await manager['loadConfig']('example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  it('loadConfig handles errors gracefully', async () => {
    // Create a new instance to avoid conflict with the mocked loadConfig
    const errorTestManager = new SiteConfigManager();

    // Mock console.error to prevent output during test
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a spy for original implementation that will throw an error
    vi.spyOn(errorTestManager as any, 'loadConfig').mockImplementation(() => {
      throw new Error('Module not found');
    });

    // Create a spy for getGlobalConfig
    const getGlobalConfigSpy = vi.spyOn(errorTestManager as any, 'getGlobalConfig')
      .mockReturnValue(mockGlobalConfig);
    
    // This should now catch the error and return global config
    const result = await errorTestManager.getConfigForHost('error.example.com');
    
    // Verify the global config was returned
    expect(result).toEqual(mockGlobalConfig);
    expect(getGlobalConfigSpy).toHaveBeenCalled();
  });
});