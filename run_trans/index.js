const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const translate = require('@iamtraction/google-translate');
const path = require('path');

function containsChineseCharacters(inputString) {
  const chineseCharacterRegex = /[\u4E00-\u9FFF]/;
  return chineseCharacterRegex.test(inputString);
}

let all = [];
let templates = [];

function extractVariables(inputString) {
  // Regular expression to match ${variable} patterns
  const regex = /\${([^}]+)}/g;

  // Counter to generate unique keys (v1, v2, v3, ...)
  let counter = 1;

  // Extract variables and create JSON object
  const variables = {};
  const replacedString = inputString.replace(regex, (match, variable) => {
    const key = `v${counter}`;
    variables[key] = variable;
    counter++;
    return match;
  });

  let tokens = [];

  for (const key in variables) {
    if (variables.hasOwnProperty(key)) {
      const value = variables[key];
      tokens.push(`${key}: ${value}`)
    }
  }

  if (tokens.length > 0) {
    let text = "{ " + tokens.join(", ") + " }";
    return `i18next.t("${replacedString}", ${text})`;
  } else {
    return `i18next.t("${replacedString}");`
  }
}

function appendXXXToStringLiterals(ast) {
  traverse(ast, {
    StringLiteral(path) {
      if (containsChineseCharacters(path.node.value)) {
        // console.log('StringLiteral - Chinese characters found: ' + path.node.value);
        all.push(path.node);
      }
    },
    TemplateLiteral(path) {
      const { quasis, expressions } = path.node;

      // Construct the final string by combining quasis and expressions
      let finalString = quasis.reduce((acc, quasi, index) => {
        acc += quasi.value.raw;
        if (expressions[index]) {
          acc += '${' + expressions[index].name + '}';
        }
        return acc;
      }, '');

      // console.log('TemplateLiteral value:', finalString);
      if (containsChineseCharacters(finalString)) {
        templates.push(finalString);
      }
    },
    JSXText(path) {
      if (containsChineseCharacters(path.node.value)) {
        // console.log('JSXText - Chinese characters found: ' + path.node.value);
        // console.log(path);
        all.push(path.node);
      }
    }
  });
}


function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

async function parseAndModifyTSX(filePath) {
  try {
    let tsxContent = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(tsxContent, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'], // Enable JSX syntax support
      presets: ['@babel/preset-react'], // Enable React preset
    });

    // Modify the AST to append "xxx" to StringLiterals
    appendXXXToStringLiterals(ast);

    for (i = 0; i < templates.length; i++) {
      console.log("    Processing: " + templates[i] + "...");
      if (tsxContent.indexOf(templates[i]) !== -1) {
        let newTemplate = extractVariables(templates[i]);
        console.log(newTemplate);
        tsxContent = tsxContent.replace(`\`${templates[i]}\``, newTemplate);
      } else {
        console.log("    ERROR! Templates not found: " + templates[i]);
      }
    }

    let uniqueSet = new Set(all.map(element => element.value.trim()));
    console.log(all.length);
    let uniqueArray = [...uniqueSet];
    uniqueArray = uniqueArray.sort((a, b) => b.length - a.length);
    console.log(uniqueArray.length);

    for (i = 0; i < uniqueArray.length; i++) {
      console.log("    Processing: " + uniqueArray[i] + "...");
      let trimed = uniqueArray[i];
      const regexPattern = new RegExp(`(["'\`])${escapeRegExp(trimed)}(["'\`])`, 'g');
      tsxContent = tsxContent.replace(regexPattern, `i18next.t("${trimed}")`);
      const regexPattern1 = new RegExp(`\>([\\s|\\n]*?)${escapeRegExp(trimed)}`, 'gm');
      tsxContent = tsxContent.replace(regexPattern1, `>{i18next.t("${trimed}")}`);
    }

    tsxContent = tsxContent.replace(new RegExp(`"i18next.t\\("`, 'g'), "i18next.t(\"");
    tsxContent = tsxContent.replace(new RegExp(`"\\)"`, 'g'), "\")");
    tsxContent = tsxContent.replace(new RegExp(`=i18next.t([^\\)]+\\))`, 'g'), "={i18next.t$1}");
    tsxContent = tsxContent.replace(new RegExp(`='i18next.t([^\\)]+\\))'`, 'g'), "={i18next.t$1}");
    tsxContent = tsxContent.replace(new RegExp(`\>([\\s|\\n]*?)i18next.t([^\\)]+\\))`, 'gm'), ">$1{i18next.t$2}");
    tsxContent = tsxContent.replace(new RegExp(`\>i18next.t([^\\)]+\\))`, 'gm'), ">$1{i18next.t$2}");

    return tsxContent;
  } catch (error) {
    console.error('    Error occurred while parsing the TSX file:', error);
    return null;
  }
}

(async () => {
  // Replace 'your_file_path.tsx' with the actual file path of your TSX file
  let inputFilePath = process.argv[2];
  const modifiedContent = await parseAndModifyTSX(inputFilePath);


  if (modifiedContent !== null) {
    try {
      fs.writeFileSync(inputFilePath, modifiedContent, 'utf-8');

      console.log('Processed:', inputFilePath);
      
    } catch (error) {
      console.log('Error:', error);
    }
  }
})();
