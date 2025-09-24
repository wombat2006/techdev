const ts = require('typescript');
const babel = require('@babel/core');
const jestHoist = require('babel-plugin-jest-hoist');
const syntaxTypescript = require('@babel/plugin-syntax-typescript');

module.exports = {
  process(sourceText, sourcePath) {
    if (sourcePath.endsWith('.ts')) {
      const hoisted = babel.transformSync(sourceText, {
        filename: sourcePath,
        plugins: [syntaxTypescript, jestHoist],
        sourceType: 'module'
      });

      const { outputText, sourceMapText } = ts.transpileModule(hoisted?.code ?? sourceText, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          sourceMap: true
        },
        fileName: sourcePath
      });

      return {
        code: outputText,
        map: sourceMapText
      };
    }

    return sourceText;
  }
};
