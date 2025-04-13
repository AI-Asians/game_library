// Required Node.js modules
const fs = require("fs");
const path = require("path");
const https = require("https");

// API configuration - Set your API key here or use environment variable
const API_KEY = process.env.ANTHROPIC_API_KEY || "YOUR_API_KEY";
const MODEL = "claude-3-7-sonnet-20250219";
const MAX_TOKENS = 20000;

// Use relative paths from the base directory
const BASE_DIR = __dirname;
const gameTypes = {
  mcq: path.join(BASE_DIR, "questions", "mcq.txt"),
  tf: path.join(BASE_DIR, "questions", "tf.txt"),
};

// File paths
const standardQuestions = [
  {
    type: "mcq",
    question: "What is the capital of France?",
    options: ["Paris", "London", "Berlin", "Madrid"],
    answer: "Paris",
  },
  {
    type: "mcq",
    question: "Which planet is known as the Red Planet?",
    options: ["Earth", "Mars", "Venus", "Jupiter"],
    answer: "Mars",
  },
  {
    type: "tf",
    question: "The Great Wall of China is visible from space.",
    answer: false,
  },
  {
    type: "tf",
    question: "Water boils at 100 degrees Celsius at sea level.",
    answer: true,
  },
];
const gamePromptPath = path.join(BASE_DIR, "game_prompt.txt");
const outputDir = path.join(BASE_DIR, "game_library_output");

// Base system prompt
const baseSystemPrompt = `
You are a expert game designer and developer creating HTML5 canvas educational mini-games.

Follow all instructions precisely and optimize for the specified device.

Use 8-bit retro styling as specified in the instructions.
`;

function saveFailed(gameType, mechanicName, questionIndex) {
  const failedDir = path.join(outputDir, "_failed_generations");
  ensureDirectoryExists(failedDir);

  const failedPath = path.join(failedDir, "failed_generations.json");
  let failedData = [];

  // Read existing failed data if available
  if (fs.existsSync(failedPath)) {
    try {
      failedData = JSON.parse(fs.readFileSync(failedPath, "utf8"));
    } catch (error) {
      console.error("Error reading failed generations file:", error);
    }
  }

  // Add new failed item
  failedData.push({
    gameType,
    mechanicName,
    questionIndex,
    timestamp: new Date().toISOString(),
  });

  // Save updated failed data
  try {
    fs.writeFileSync(failedPath, JSON.stringify(failedData, null, 2));
    console.log(`  Added failed generation to ${failedPath}`);
  } catch (error) {
    console.error("Error saving failed generation:", error);
  }
}

// Read files and prepare data
function readTextFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return null;
  }
}

// Parse game mechanics from text files - improved to handle both bolded and italicized entries
function parseGameMechanics(filePath) {
  const content = readTextFile(filePath);
  if (!content) return [];

  const lines = content.split("\n");
  const games = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match numbered list items with either ** or * formatting
    if (
      line.match(/^\d+\.\s+[\*\_]{1,2}(.+?)[\*\_]{1,2}/) ||
      line.match(/^\d+\.\s+[\*\_]{1,2}(.+?)[\*\_]{1,2}:/)
    ) {
      let match = line.match(/^\d+\.\s+[\*\_]{1,2}(.+?)[\*\_]{1,2}:/);
      if (!match) {
        match = line.match(/^\d+\.\s+[\*\_]{1,2}(.+?)[\*\_]{1,2}/);
      }

      if (match && match[1]) {
        const gameName = match[1].trim();
        let description = "";

        // Look for description in the same line after the colon
        const descriptionMatch = line.match(
          /[\*\_]{1,2}(.+?)[\*\_]{1,2}:\s+(.*)/
        );
        if (descriptionMatch && descriptionMatch[2]) {
          description = descriptionMatch[2].trim();
        }

        games.push({
          name: gameName,
          description: description,
        });
      }
    }
  }

  return games;
}

// Read game prompt template
function readGamePrompt() {
  const promptText = readTextFile(gamePromptPath);
  if (!promptText) {
    throw new Error(
      "Could not read game prompt template. Make sure game_prompt.txt exists."
    );
  }
  return promptText;
}

async function callAnthropicAPI(prompt, systemPrompt) {
  return new Promise((resolve, reject) => {
    try {
      const requestData = JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const options = {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(requestData),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode !== 200) {
            console.error(`API error: ${res.statusCode}`);
            console.error(`Response: ${data}`);
            resolve(null);
            return;
          }

          try {
            const result = JSON.parse(data);
            if (result.content && result.content[0] && result.content[0].text) {
              resolve(result.content[0].text);
            } else {
              console.error("Unexpected API response format:", result);
              resolve(null);
            }
          } catch (error) {
            console.error("Error parsing API response:", error);
            resolve(null);
          }
        });
      });

      req.on("error", (error) => {
        console.error("Error making API request:", error);
        resolve(null);
      });

      req.write(requestData);
      req.end();
    } catch (error) {
      console.error("Error calling API:", error);
      resolve(null);
    }
  });
}

function ensureDirectoryExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error("Error creating directory:", error);
  }
}

// Utility function to sanitize names for filenames
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\\/:*?"<>|:]/g, "");
}

function saveGame(gameType, gameName, gameHtml, questionIndex) {
  const sanitizedGameName = sanitizeFilename(gameName);
  const gameDir = path.join(outputDir, sanitizedGameName);
  ensureDirectoryExists(gameDir);

  const filePath = path.join(gameDir, `game${questionIndex + 1}.html`);
  try {
    fs.writeFileSync(filePath, gameHtml);
    console.log(`  Saved game to: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error("Error saving game:", error);
    return null;
  }
}

async function generateGameWithPrompt(gameType, gameMechanic, question) {
  console.log(
    `\nGenerating ${gameType.toUpperCase()} game: ${gameMechanic.name}`
  );
  console.log(`  Question: ${question.question}`);

  // Step 1: Generate the filled prompt from the template (NO API call yet)
  const gamePromptTemplate = readGamePrompt();

  // Prepare info dictionary with all required fields
  const infoDict = {
    GAME_TYPE: gameType.toUpperCase(),
    QUESTION: question.question,
    DEVICE_TYPE: "web",
    GAME_MECHANIC: gameMechanic.name,
    GAME_MECHANIC_DESCRIPTION: gameMechanic.description,
  };

  // Add options for MCQ questions
  if (gameType === "mcq" && question.options) {
    infoDict.OPTIONS = JSON.stringify(question.options);
  }

  // Fill in the template with info dictionary
  let filledPrompt = gamePromptTemplate;
  for (const [key, value] of Object.entries(infoDict)) {
    filledPrompt = filledPrompt.replace(new RegExp(`{${key}}`, "g"), value);
  }

  console.log("  Step 1: Generated filled prompt template");

  // Save the original template prompt for reference
  const tempDir = path.join(outputDir, "_templates");
  ensureDirectoryExists(tempDir);
  const sanitizedMechanicName = sanitizeFilename(gameMechanic.name);
  const templateFileName = `${gameType}_${sanitizedMechanicName}_template.txt`;
  fs.writeFileSync(path.join(tempDir, templateFileName), filledPrompt);

  // Step 2: First API call - Generate the ACTUAL prompt from the template
  console.log("  Step 2: Making first API call to generate actual prompt...");
  const firstAPISystemPrompt = `
You are a game prompt generator. Your job is to create detailed instructions for building HTML5 educational games.
Fill in the template below with additional details as needed, following the instructions exactly.
`;
  const actualPrompt = await callAnthropicAPI(
    filledPrompt,
    firstAPISystemPrompt
  );

  if (!actualPrompt) {
    console.error("  Failed to generate actual prompt in first API call");
    return null;
  }

  console.log("  First API call successful - Generated actual game prompt");

  // Save the actual prompt from first API call
  const promptsDir = path.join(outputDir, "_filled_prompts");
  ensureDirectoryExists(promptsDir);
  const promptFileName = `${gameType}_${sanitizedMechanicName}_prompt.txt`;
  fs.writeFileSync(path.join(promptsDir, promptFileName), actualPrompt);

  console.log("  Step 3: Making second API call to generate game HTML...");
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let gameHtml = null;

  while (retryCount < MAX_RETRIES) {
    gameHtml = await callAnthropicAPI(actualPrompt, baseSystemPrompt);

    // Check if we got a response
    if (!gameHtml) {
      console.error(
        `  API call failed (attempt ${retryCount + 1}/${MAX_RETRIES})`
      );
      retryCount++;
      continue;
    }

    // Validate HTML - extract only HTML content if it exists
    const htmlMatch = gameHtml.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);

    if (htmlMatch) {
      console.log("  Valid HTML content found");
      // Only keep the actual HTML part
      gameHtml = htmlMatch[0].trim();
      break; // Valid HTML found, exit loop
    } else {
      console.warn(
        `  No valid HTML found in response (attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      console.warn("  Retrying API call...");
      retryCount++;
    }
  }

  if (gameHtml && gameHtml.includes("<!DOCTYPE html>")) {
    console.log("  Second API call successful - Game HTML generated");
    return gameHtml;
  } else {
    console.error("  Failed to generate valid HTML after multiple attempts");
    return null;
  }
}

// Main function to orchestrate the process
async function main() {
  try {
    console.log("=== Educational Game Library Generator ===");

    // Check if the API key is set
    if (API_KEY === "YOUR_ANTHROPIC_API_KEY") {
      console.error(
        "\nERROR: You need to set your Anthropic API key in app.js"
      );
      console.error(
        "Replace YOUR_ANTHROPIC_API_KEY with your actual API key or set ANTHROPIC_API_KEY environment variable"
      );
      return;
    }

    // Create output directory
    ensureDirectoryExists(outputDir);

    // 1. Read game mechanics for each game type
    console.log("\nReading game mechanics...");
    const gameSetups = {};
    for (const [type, filePath] of Object.entries(gameTypes)) {
      gameSetups[type] = parseGameMechanics(filePath);
      console.log(
        `Found ${gameSetups[type].length} game mechanics for ${type}`
      );
    }

    // 2. Read standard questions
    console.log("\nReading standard questions...");

    // 3. Generate games for each game type
    console.log("\nGenerating games...");
    const generatedGames = [];

    // Create a queue of all game generation tasks
    const allGameTasks = [];

    // Number of games to generate per mechanic
    const GAMES_PER_MECHANIC = 3; // Generate 3 games for each mechanic
    const BATCH_SIZE = 5; // Process in batches of 10

    // Track progress
    let totalMechanics = 0;
    for (const [type, mechanics] of Object.entries(gameSetups)) {
      totalMechanics += mechanics.length;
    }
    ``;
    console.log("\nPreparing all game generation tasks...");

    // Build the complete task list
    for (const [type, mechanics] of Object.entries(gameSetups)) {
      // Filter questions by type
      const typeQuestions = standardQuestions.filter((q) => q.type === type);

      if (typeQuestions.length === 0) {
        console.warn(`No questions found for type: ${type}`);
        continue;
      }

      console.log(`\n===== Adding ${type.toUpperCase()} games to queue =====`);
      console.log(
        `Found ${mechanics.length} mechanics of type ${type.toUpperCase()}`
      );

      for (const mechanic of mechanics) {
        for (let i = 0; i < GAMES_PER_MECHANIC; i++) {
          // Select a question (cycling through available questions)
          const question = typeQuestions[i % typeQuestions.length];

          // Add task to queue
          allGameTasks.push({
            type,
            mechanic,
            question,
            index: i,
          });
        }
      }
    }

    console.log(`Total game generation tasks prepared: ${allGameTasks.length}`);
    console.log(`Processing in batches of ${BATCH_SIZE}...`);

    // Process tasks in batches
    for (let i = 0; i < allGameTasks.length; i += BATCH_SIZE) {
      const batch = allGameTasks.slice(i, i + BATCH_SIZE);
      console.log(
        `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          allGameTasks.length / BATCH_SIZE
        )}, tasks ${i + 1}-${Math.min(i + BATCH_SIZE, allGameTasks.length)}`
      );

      // Create array of promises for the current batch
      const batchPromises = batch.map((task) => {
        return (async () => {
          const { type, mechanic, question, index } = task;

          console.log(
            `  Starting generation: ${type.toUpperCase()} game: ${
              mechanic.name
            } (${index + 1}/${GAMES_PER_MECHANIC})`
          );

          try {
            const gameHtml = await generateGameWithPrompt(
              type,
              mechanic,
              question
            );

            if (gameHtml) {
              const gamePath = saveGame(type, mechanic.name, gameHtml, index);

              if (gamePath) {
                return {
                  type,
                  name: mechanic.name,
                  question: question.question,
                  path: gamePath,
                };
              }
            }

            // If we got here, generation failed
            saveFailed(type, mechanic.name, index);
            return null;
          } catch (error) {
            console.error(`  Error generating game: ${error.message}`);
            saveFailed(type, mechanic.name, index);
            return null;
          }
        })();
      });

      // Wait for the current batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Add successful results to generated games
      batchResults.filter(Boolean).forEach((game) => generatedGames.push(game));

      console.log(
        `Batch completed. Total successful games so far: ${generatedGames.length}`
      );
    }

    console.log("\nGame generation completed successfully!");
    console.log(
      `Generated ${generatedGames.length} games out of ${allGameTasks.length} attempted`
    );
    console.log(`Open ${path.join(outputDir, "index.html")} to view the games`);
    console.log(
      `Check ${path.join(
        outputDir,
        "_failed_generations",
        "failed_generations.json"
      )} for any failed generations`
    );
  } catch (error) {
    console.error("Error in main process:", error);
  }
}

// Start the process
main();
