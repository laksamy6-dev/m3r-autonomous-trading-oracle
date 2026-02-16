const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.resetCache = false;

config.resolver.blockList = [
  /\.git\/.*/,
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

config.resolver.nodeModulesPaths = [
  require("path").resolve(__dirname, "node_modules"),
];

config.cacheVersion = "m3r-v3.1";

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: false,
      reduce_funcs: false,
    },
  },
};

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
};

config.maxWorkers = 2;

module.exports = config;
