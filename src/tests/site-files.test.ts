import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { configFileName } from '../site-files.js';
import { domains, wildcards, specificSubdomains } from '../site-index.js';

const DIST_SITES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/sites');

describe('configFileName', () => {
  it('prefixes wildcard keys and leaves the rest alone', () => {
    expect(configFileName('.example.com')).toBe('_.example.com');
    expect(configFileName('example.com')).toBe('example.com');
    expect(configFileName('blog.example.com')).toBe('blog.example.com');
  });
});

// A config missing from the build is not an error anyone sees: loadConfig logs
// it and hands back the global config, so the rules of the site are quietly
// gone. That is what the leading dot of a wildcard key used to do - it kept the
// file out of the include globs of tsc and out of the context module webpack
// builds for the dynamic import.
describe('generated config files', () => {
  const keys = [...Object.keys(domains), ...wildcards, ...Object.keys(specificSubdomains)];

  it('are built for every key of the index', () => {
    expect(fs.existsSync(DIST_SITES), 'run npm run build first').toBe(true);

    const missing = keys.filter((key) => !fs.existsSync(path.join(DIST_SITES, `${configFileName(key)}.js`)));

    expect(missing).toEqual([]);
  });

  it('are named so that a bundler keeps them', () => {
    expect(fs.readdirSync(DIST_SITES).filter((name) => name.startsWith('.'))).toEqual([]);
  });
});
