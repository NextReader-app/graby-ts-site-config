import { SiteConfigManager } from './SiteConfigManager.js';
import type { SiteConfig } from './types.js';
import { parseConfigFile } from './SiteConfigParser.js';

// Export types
export type { SiteConfig };

// Create and export default instance
const siteConfigManager = new SiteConfigManager();
export default siteConfigManager;

// Also export the class and utilities for custom instances
export { SiteConfigManager, parseConfigFile };