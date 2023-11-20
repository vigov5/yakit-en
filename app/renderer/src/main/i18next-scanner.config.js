const typescriptTransform = require('i18next-scanner-typescript');

module.exports = {
    input: ['src/**/*.js', 'src/**/*.jsx', 'src/**/*.ts', 'src/**/*.tsx'],
    // output: './locales/{{lng}}/{{ns}}.json',
    options: {
      debug: true,
      removeUnusedKeys: true,
      sort: true,
      func: {
        list: ['i18next.t', 'i18n.t', 't', ],
        extensions: ['.js', '.jsx']
      },
      trans: {
        component: 'Trans',
        extensions: ['.js', '.jsx']
      },
      lngs: ['en'], // Add other languages as needed
      ns: ['translations'],
      defaultLng: 'en',
      defaultNs: 'translations',
      defaultValue: '__STRING_NOT_TRANSLATED__',
      resource: {
        loadPath: './src/locales/{{lng}}/{{ns}}.json',
        savePath: './src/locales/{{lng}}/{{ns}}.json',
      },
      nsSeparator: ':',
      keySeparator: false,
      interpolation: {
        prefix: '{{',
        suffix: '}}',
      },
    },
    transform: typescriptTransform({ extensions: ['.ts', '.tsx'] }),
  };
