module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Required for NativeWind v4: injects NativeWind JSX transform
          jsxImportSource: 'nativewind',
        },
      ],
      // Must come AFTER babel-preset-expo
      'nativewind/babel',
    ],
  }
}
