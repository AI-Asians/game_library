// Thumbnail Generator for Game Library
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

// Base directory for the game library
const BASE_DIR = __dirname;
const GAME_OUTPUT_DIR = path.join(BASE_DIR, "game_library_output");
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 320;

// Check if puppeteer is installed
try {
  require.resolve("puppeteer");
} catch (e) {
  console.error("\x1b[31m%s\x1b[0m", "Error: puppeteer is not installed!");
  console.log("Please install it first by running:");
  console.log("\x1b[33m%s\x1b[0m", "npm install puppeteer");
  process.exit(1);
}

// Function to get all game directories
async function getGameDirectories() {
  try {
    const directories = await fs.promises.readdir(GAME_OUTPUT_DIR);

    // Filter out non-directories and system directories (starting with _)
    const gameDirectories = [];

    for (const dir of directories) {
      if (dir.startsWith("_") || dir === ".DS_Store") continue;

      const fullPath = path.join(GAME_OUTPUT_DIR, dir);
      const stats = await fs.promises.stat(fullPath);

      if (stats.isDirectory()) {
        gameDirectories.push(dir);
      }
    }

    return gameDirectories;
  } catch (error) {
    console.error("Error reading game directories:", error);
    return [];
  }
}

// Function to take screenshot of a game
async function generateThumbnail(browser, gameDir) {
  const gamePath = path.join(GAME_OUTPUT_DIR, gameDir);
  const game1Path = path.join(gamePath, "game1.html");
  const thumbnailPath = path.join(gamePath, "thumbnail.png");

  // Check if game1.html exists
  if (!fs.existsSync(game1Path)) {
    console.log(
      `\x1b[33m%s\x1b[0m`,
      `⚠️ Skipping ${gameDir}: game1.html not found`
    );
    return false;
  }
  //// Check if thumbnail already exists
  //if (fs.existsSync(thumbnailPath)) {
  //  console.log(
  //    `\x1b[36m%s\x1b[0m`,
  //    `📸 Thumbnail already exists for ${gameDir}`
  //  );
  //  return true;
  //}

  console.log(`📷 Generating thumbnail for ${gameDir}...`);

  try {
    // Convert file path to URL
    const fileUrl = `file://${game1Path}`;

    // Create a new page
    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      deviceScaleFactor: 1,
    });

    // Navigate to the game HTML file
    await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 10000 });

    // Wait a bit for any animations or resources to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take screenshot
    await page.screenshot({
      path: thumbnailPath,
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
      },
    });

    // Close the page
    await page.close();

    console.log(`\x1b[32m%s\x1b[0m`, `✅ Generated thumbnail for ${gameDir}`);
    return true;
  } catch (error) {
    console.error(
      `\x1b[31m%s\x1b[0m`,
      `❌ Error generating thumbnail for ${gameDir}:`,
      error.message
    );
    return false;
  }
}

// Main function
async function main() {
  console.log("\x1b[35m%s\x1b[0m", "=== Game Library Thumbnail Generator ===");

  // Get all game directories
  const gameDirectories = await getGameDirectories();

  if (gameDirectories.length === 0) {
    console.log(
      "\x1b[33m%s\x1b[0m",
      "No game directories found! Run node app.js first to generate games."
    );
    return;
  }

  console.log(`Found ${gameDirectories.length} game directories.`);

  // Launch browser
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Track results
  let successCount = 0;
  let failCount = 0;

  // Process each game directory
  for (let i = 0; i < gameDirectories.length; i++) {
    const gameDir = gameDirectories[i];
    const progress = `[${i + 1}/${gameDirectories.length}]`;

    console.log(`${progress} Processing ${gameDir}...`);

    const success = await generateThumbnail(browser, gameDir);
    success ? successCount++ : failCount++;
  }

  // Close the browser
  await browser.close();

  // Summary
  console.log("\n\x1b[35m%s\x1b[0m", "=== Thumbnail Generation Summary ===");
  console.log(
    `\x1b[32m%s\x1b[0m`,
    `✅ Successfully generated: ${successCount} thumbnails`
  );
  console.log(`\x1b[31m%s\x1b[0m`, `❌ Failed: ${failCount} thumbnails`);
  console.log("\x1b[35m%s\x1b[0m", "=====================================");

  console.log("\nTo install puppeteer if needed:");
  console.log("\x1b[33m%s\x1b[0m", "npm install puppeteer");

  console.log(
    "\nTo use the thumbnails, open the game_library_interface.html file."
  );
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error);
});
