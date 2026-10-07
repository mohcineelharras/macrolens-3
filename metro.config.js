const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

function projectPathPattern(directory) {
  const escaped = path
    .resolve(__dirname, directory)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[/\\]/g, "[\\\\/]");
  return new RegExp(`${escaped}[\\\\/].*`);
}

config.resolver.blockList.push(
  projectPathPattern("server"),
  projectPathPattern("tests"),
  /[/\\]node_modules[/\\]@google[/\\]generative-ai[/\\].*/,
);

module.exports = config;
