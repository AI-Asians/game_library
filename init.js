// Game Library Initialization Script
const fs = require('fs');
const path = require('path');

// Print a welcome message
console.log('=== Game Library Initialization ===');

// Base directory
const BASE_DIR = __dirname;
const outputDir = path.join(BASE_DIR, 'game_library_output');
const appJsPath = path.join(BASE_DIR, 'app.js');

// Check if API key is set
try {
  let appJsContent = fs.readFileSync(appJsPath, 'utf8');
  if (appJsContent.includes("API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY'")) {
    console.log('\nWARNING: You need to set your Anthropic API key in app.js');
    console.log('Replace YOUR_ANTHROPIC_API_KEY with your actual API key or set the ANTHROPIC_API_KEY environment variable');
  }
} catch (error) {
  console.error('\nERROR: Could not read app.js', error);
}

// Create game_library_output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  console.log('\nCreating output directory...');
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('Created: ' + outputDir);
}

// Create subdirectories for the games
const gameSubdirs = ['binary_jump', 'bubble_pop', 'quick_shoot', 'swipe_sort'];
for (const dir of gameSubdirs) {
  const gameDirPath = path.join(outputDir, dir);
  if (!fs.existsSync(gameDirPath)) {
    fs.mkdirSync(gameDirPath, { recursive: true });
    console.log('Created: ' + gameDirPath);
  }
}

// Copy standard_questions.json to output directory if it doesn't exist
const sourceQuestionsPath = path.join(BASE_DIR, 'game_library', 'standard_questions.json');
const destQuestionsPath = path.join(outputDir, 'standard_questions.json');

if (fs.existsSync(sourceQuestionsPath) && !fs.existsSync(destQuestionsPath)) {
  console.log('\nCopying standard questions to output directory...');
  fs.copyFileSync(sourceQuestionsPath, destQuestionsPath);
  console.log('Copied: ' + destQuestionsPath);
}

// Copy index.html template to the output directory
const sourceIndexPath = path.join(BASE_DIR, 'game_library', 'index.html');
const destIndexPath = path.join(outputDir, 'index.html');

if (fs.existsSync(sourceIndexPath) && !fs.existsSync(destIndexPath)) {
  console.log('\nCopying index.html template to output directory...');
  fs.copyFileSync(sourceIndexPath, destIndexPath);
  console.log('Copied: ' + destIndexPath);
} else {
  // Create a simple placeholder index.html
  const placeholderHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Educational Game Library</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #121212;
      color: white;
    }
    h1, h2 {
      color: #fff;
    }
    p {
      color: #ddd;
    }
  </style>
</head>
<body>
  <h1>Educational Game Library</h1>
  <p>Games will appear here after generation. Run <code>node app.js</code> to generate games.</p>
</body>
</html>`;

  if (!fs.existsSync(destIndexPath)) {
    fs.writeFileSync(destIndexPath, placeholderHtml);
    console.log('Created placeholder index.html in output directory');
  }
}

// Check if game_prompt.txt exists
const gamePromptPath = path.join(BASE_DIR, 'game_prompt.txt');
if (!fs.existsSync(gamePromptPath)) {
  console.error('\nWARNING: game_prompt.txt not found. This file is required for game generation.');
}

console.log('\nInitialization complete!');
console.log('\nTo generate games, run:');
console.log('node app.js');