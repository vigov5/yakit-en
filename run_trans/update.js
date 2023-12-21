const fs = require('fs');
const translate = require('@iamtraction/google-translate');

let inputFilePath = process.argv[2];

function fixPlaceholder(translatedText) {
  let viCounter = 1;

  while (translatedText.includes('${')) {
    const startIndex = translatedText.indexOf('${');
    const endIndex = translatedText.indexOf('}', startIndex);
    if (startIndex !== -1 && endIndex !== -1) {
      const variableName = translatedText.substring(startIndex + 2, endIndex);
      const replacement = `{{v${viCounter}}}`;
      translatedText = translatedText.substring(0, startIndex) + replacement + translatedText.substring(endIndex + 1);
      viCounter++;
    } else {
      break;
    }
  }

  return translatedText;
}

// Read the translations.json file
fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    // Parse JSON data
    const translations = JSON.parse(data);

    // Array to store promises for each translation
    const translationPromises = [];

    // Iterate through each key-value pair
    for (const key in translations) {
      if (translations.hasOwnProperty(key)) {

        if (translations[key] === '__STRING_NOT_TRANSLATED__') {
          // Translate the untranslated string to English
          const translationPromise = translate(key, { to: 'en' })
            .then((result) => {
              // Update the value with the translated text
              // const formatted = result.text.charAt(0).toUpperCase() + result.text.slice(1);
              console.log(`${key} => ${result.text}`);
              translations[key] = fixPlaceholder(result.text);
            })
            .catch((error) => {
              console.error(`Error translating "${key}":`, error.message);
            });

          // Add the promise to the array
          translationPromises.push(translationPromise);
        } else {
          translations[key] = fixPlaceholder(translations[key]);
        }
      }
    }

    // Wait for all translation promises to resolve
    Promise.all(translationPromises)
      .then(() => {
        // Save the updated translations to the same file
        const updatedData = JSON.stringify(translations, null, 2);
        fs.writeFile(inputFilePath, updatedData, 'utf8', (writeErr) => {
          if (writeErr) {
            console.error('Error writing file:', writeErr);
          } else {
            console.log('Translations updated and saved successfully.');
          }
        });
      })
      .catch((promiseError) => {
        console.error('Error in translation promises:', promiseError);
      });
  } catch (jsonParseError) {
    console.error('Error parsing JSON:', jsonParseError);
  }
});
