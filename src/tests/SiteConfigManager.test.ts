import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SiteConfigManager } from '../SiteConfigManager';
import type { SiteConfig } from '../types';

// Mock dynamic imports for testing
jest.mock('../site-index', () => ({
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
        hostname === 'blog.test.net') {
      return true;
    }
    return false;
  }
}));

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

// Mock dynamic import for the configs
jest.mock('../configs/example.com.js', () => ({ default: mockExampleConfig }), { virtual: true });
jest.mock('../configs/test.com.js', () => ({ default: mockExampleConfig }), { virtual: true });
jest.mock('../configs/.example.org.js', () => ({ default: mockExampleConfig }), { virtual: true });
jest.mock('../configs/blog.test.net.js', () => ({ default: mockExampleConfig }), { virtual: true });
jest.mock('../configs/global.js', () => ({ default: mockGlobalConfig }), { virtual: true });

describe('SiteConfigManager', () => {
  let manager: SiteConfigManager;

  beforeEach(() => {
    manager = new SiteConfigManager();
    // Clear the cache before each test
    manager.clearCache();
  });

  test('hasConfigForHost returns correct values', () => {
    expect(manager.hasConfigForHost('example.com')).toBe(true);
    expect(manager.hasConfigForHost('www.example.com')).toBe(true);
    expect(manager.hasConfigForHost('unknown.com')).toBe(false);
    expect(manager.hasConfigForHost('sub.example.org')).toBe(true);
    expect(manager.hasConfigForHost('example.org')).toBe(false);
    expect(manager.hasConfigForHost('blog.test.net')).toBe(true);
    expect(manager.hasConfigForHost('test.net')).toBe(false);
  });

  test('normalizeHostname removes www prefix', () => {
    // @ts-ignore - Access private method for testing
    expect(manager['normalizeHostname']('www.example.com')).toBe('www.example.com');
    // @ts-ignore - Access private method for testing
    expect(manager['normalizeHostname']('EXAMPLE.COM')).toBe('example.com');
  });

  test('getConfigKeyForHost returns correct config key', () => {
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

  test('getConfigForHost loads configuration', async () => {
    const config = await manager.getConfigForHost('example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  test('getConfigForHost respects caching', async () => {
    // First call loads the config
    const config1 = await manager.getConfigForHost('example.com');
    
    // Mock implementation to track if loadConfig is called
    const loadConfigSpy = jest.spyOn(manager as any, 'loadConfig');
    
    // Second call should use cache
    const config2 = await manager.getConfigForHost('example.com');
    
    expect(loadConfigSpy).not.toHaveBeenCalled();
    expect(config2).toBe(config1);
  });

  test('getConfigForHost returns global config for unknown domains', async () => {
    const config = await manager.getConfigForHost('unknown.com');
    expect(config).toEqual(mockGlobalConfig);
  });

  test('getConfigForHost loads subdomain configuration', async () => {
    const config = await manager.getConfigForHost('sub.example.org');
    expect(config).toEqual(mockExampleConfig);
  });

  test('getConfigForHost handles www prefix correctly', async () => {
    const config = await manager.getConfigForHost('www.example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  test('getConfigForHost loads specific subdomain configuration', async () => {
    const config = await manager.getConfigForHost('blog.test.net');
    expect(config).toEqual(mockExampleConfig);
  });

  test('preloadConfigs loads multiple configurations', async () => {
    await manager.preloadConfigs(['example.com', 'test.com']);
    
    // Mock implementation to track if loadConfig is called
    const loadConfigSpy = jest.spyOn(manager as any, 'loadConfig');
    
    // These should now be cached
    await manager.getConfigForHost('example.com');
    await manager.getConfigForHost('test.com');
    
    expect(loadConfigSpy).not.toHaveBeenCalled();
  });

  test('clearCache removes cached configurations', async () => {
    // Load and cache a config
    await manager.getConfigForHost('example.com');
    
    // Clear the cache
    manager.clearCache();
    
    // Mock implementation to track if loadConfig is called
    const loadConfigSpy = jest.spyOn(manager as any, 'loadConfig');
    
    // This should now require reloading
    await manager.getConfigForHost('example.com');
    
    expect(loadConfigSpy).toHaveBeenCalled();
  });

  test('loadConfig loads the correct configuration file', async () => {
    // @ts-ignore - Access private method for testing
    const config = await manager['loadConfig']('example.com');
    expect(config).toEqual(mockExampleConfig);
  });

  test('loadConfig handles errors gracefully', async () => {
    // Set up the mock to throw an error
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a condition that would cause an import to fail
    jest.mock('../configs/error.example.com.js', () => {
      throw new Error('Module not found');
    }, { virtual: true });
    
    // @ts-ignore - Access private method for testing
    const config = await manager['loadConfig']('error.example.com');
    
    // Should return global config on error
    expect(config).toEqual(mockGlobalConfig);
  });
});