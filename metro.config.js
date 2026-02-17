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

config.cacheVersion = "m3r-v3.0";

module.exports = config;
