const [, rendererConfig] = require('../webpack.dev.js');

module.exports = {
  stories: ['../stories/**/*.stories.tsx'],
  webpackFinal: async (config) => {
    config.module.rules = rendererConfig.module.rules;
    config.resolve.extensions = rendererConfig.resolve.extensions;
    config.resolve.alias = rendererConfig.resolve.alias;
    return config;
  }
};
