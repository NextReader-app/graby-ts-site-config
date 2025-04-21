import { SiteConfigManager } from './SiteConfigManager';
import type { SiteConfig } from './types';
import { parseConfigFile } from './SiteConfigParser';

// Export types
export type { SiteConfig };

// Create and export default instance
const siteConfigManager = new SiteConfigManager();
export default siteConfigManager;

// Also export the class and utilities for custom instances
export { SiteConfigManager, parseConfigFile };