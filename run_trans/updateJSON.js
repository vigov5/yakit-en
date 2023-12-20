const fs = require('fs');

// Check if correct number of arguments are provided
if (process.argv.length !== 4) {
  console.error('Usage: node updateJSON.js A.json B.json');
  process.exit(1);
}

// Extract file paths from command line arguments
const [,, fileA, fileB] = process.argv;

// Read the content of A.json and B.json
const contentA = fs.readFileSync(fileA, 'utf8');
const contentB = fs.readFileSync(fileB, 'utf8');

// Parse JSON content
const jsonA = JSON.parse(contentA);
const jsonB = JSON.parse(contentB);

// Update values in A.json with values from B.json
for (const key in jsonA) {
  if (jsonA.hasOwnProperty(key) && jsonB.hasOwnProperty(key)) {
    jsonA[key] = jsonB[key];
  }
}

// Save the updated A.json
fs.writeFileSync(fileA, JSON.stringify(jsonA, null, 2), 'utf8');

console.log(`Values from ${fileB} updated to ${fileA}.`);