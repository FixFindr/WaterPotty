const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the workspace packages directory only (not the whole workspace root,
// which would include node_modules and cause EMFILE on macOS)
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages'),
]

// Resolve node_modules from the app first, then the workspace root
// This prevents duplicate React instances from being bundled
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = withNativeWind(config, {
  // Points to the global CSS file with Tailwind directives
  input: './global.css',
})
