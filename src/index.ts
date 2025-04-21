import { SiteConfigManager } from './SiteConfigManager';
import type { SiteConfig } from './types';

// Export types
export type { SiteConfig };

// Create and export default instance
const siteConfigManager = new SiteConfigManager();
export default siteConfigManager;

// Also export the class for custom instances
export { SiteConfigManager };