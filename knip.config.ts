import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    '.claude/**',              // External skills/plugins  
    'container/**',            // Separate container package
    'scripts/**',              // Standalone scripts
    'src/self-improvement/**', // Not yet integrated
    'vitest.skills.config.ts', // Used by vitest for skill tests
  ],
  ignoreDependencies: [
    'pino-pretty',             // Dynamically loaded by pino transport
    '@vitest/coverage-v8',     // Used for coverage reports
  ],
  // Skip unused export warnings - many are public API for external consumers
  // and will be used once more features are enabled
  exclude: ['exports', 'types'],
};

export default config;
