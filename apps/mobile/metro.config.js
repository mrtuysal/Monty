const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace for shared packages, but use projectRoot as the main root
config.watchFolders = [...(config.watchFolders || []), workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

// IMPORTANT: Set the project root so Metro finds index.js correctly
config.projectRoot = projectRoot;

module.exports = config;
