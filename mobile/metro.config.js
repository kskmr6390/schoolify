const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Use watchman-compatible resolver; fall back to polling to avoid EMFILE
config.resolver.unstable_enableSymlinks = false
config.watcher = {
  additionalExts: ['mjs', 'cjs'],
  watchman: {
    deferStates: ['hg.update'],
  },
  healthCheck: {
    enabled: false,
  },
}

module.exports = config
