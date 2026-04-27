const path = require('path');
const fs = require('fs');


function toSnakeCase(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

module.exports = {
  input: [
    'src/components/**/*.{js,jsx,ts,tsx}',
    'src/routes/**/*.{js,jsx,ts,tsx}'
  ],
  output: 'src/core/i18n',
  options: {
    debug: false,
    createOldCatalogs: false,
    removeUnusedKeys: true,
    func: {
      list: [],
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    trans: false,
    lngs: ['en', 'th'],
    defaultLng: 'en',
    ns: ['common', 'account', 'crm', 'admin', 'home', 'message'],
    defaultNs: 'common',
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
      loadPath: './{{lng}}/{{ns}}.json',
      savePath: './{{lng}}/{{ns}}.json',
      jsonIndent: 2,
    },
    nsSeparator: ':',
    keySeparator: false,
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    }
  },
  transform: function (file, enc, done) {
    const parser = this.parser;
    const content = fs.readFileSync(file.path, enc);
    const tFunctionRegex = /t\s*\(\s*(?:['"]([^'"]+)['"]\s*,\s*)?['"]([^'"]+)['"]\s*\)/g;

    let match;
    while ((match = tFunctionRegex.exec(content)) !== null) {
      let namespace, originalText;

      if (namespace === 'message') continue;
      
      if (match[1] !== undefined) {
        namespace = match[1]; // t('namespace', 'key')
        originalText = match[2];
      } else {
        namespace = 'common'; // t('key')
        originalText = match[2];
      }

      if (!originalText) continue;

      const snakeCaseKey = toSnakeCase(originalText); // Convert to snake_case

      if (!parser.options.ns.includes(namespace)) {
        parser.options.ns.push(namespace);
      }

      parser.set(`${namespace}:${snakeCaseKey}`, {
        defaultValue: originalText
      });
    }
    done();
  }
};