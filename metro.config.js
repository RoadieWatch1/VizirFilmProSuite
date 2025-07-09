const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// ✅ Add or merge your aliases here
config.resolver.alias = {
  '@': path.resolve(projectRoot, './'),
};

// ✅ Disable symbolication to avoid <anonymous> lookups
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
    dev: {
      enableSymbolication: false,
    },
  }),
};

module.exports = config;
