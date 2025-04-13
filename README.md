# Educational Game Library

This project generates educational HTML5 games using AI to dynamically create different game mechanics for multiple-choice and true/false questions.

## Project Structure

- `app.js` - Main application for generating games
- `init.js` - Initialization script
- `game_prompt.txt` - Template for generating games
- `questions/` - Contains game mechanic definitions
  - `mcq.txt` - Multiple-choice game mechanics
  - `tf.txt` - True/False game mechanics
- `game_library/` - Contains sample questions and templates
  - `standard_questions.json` - Question database
- `game_library_output/` - Generated games will be saved here

## Setup and Running

1. Initialize the project:
   ```
   node init.js
   ```

2. Set your Anthropic API key in `app.js`:
   ```javascript
   const API_KEY = 'YOUR_ANTHROPIC_API_KEY'; // Replace with your actual key
   ```
   Alternatively, you can set the `ANTHROPIC_API_KEY` environment variable.

3. Generate games:
   ```
   node app.js
   ```

4. Open the generated `game_library_output/index.html` file in your browser to play the games.

## Available Game Mechanics

This library includes:
- Multiple-choice questions with various game mechanics such as bubble-pop, quick-shoot, etc.
- True/False questions with mechanics like binary-jump, swipe-sort, etc.

## Game Design

All games follow a retro 8-bit style and are designed to:
- Start immediately in a playable state
- Complete in under 10 seconds
- Provide simple, addictive gameplay
- Run on web browsers without external dependencies

## Note on API Usage

This project uses the Anthropic Claude API to generate the games. Each game generation will consume tokens, so be mindful of your API usage and limits.