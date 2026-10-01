/**
 * Name of the file a config is stored in.
 *
 * Wildcard keys start with a dot, and a dot-prefixed file falls out of the
 * build twice over: tsc leaves it out of the `include` globs of tsconfig, and
 * webpack drops it from the context module a dynamic import builds. An
 * underscore cannot occur in a hostname, so the prefix can never collide with
 * a config named after a subdomain of its own.
 */
export function configFileName(configKey: string): string {
  return configKey.startsWith('.') ? `_${configKey}` : configKey;
}
