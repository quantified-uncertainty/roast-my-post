#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import {
  join,
  resolve,
} from "path";

const CONFIG_DIR = join(homedir(), "Library", "Application Support", "Claude");
const CONFIG_FILE = join(CONFIG_DIR, "claude_desktop_config.json");

// Get database URL from project's .env file
function getDatabaseUrl() {
  // Try multiple locations for .env file to support both monorepo and worktree structures
  const possibleEnvPaths = [
    join(resolve("."), "..", "..", ".env"), // Project root (monorepo: mcp-server -> apps -> root)
    join(resolve("."), "..", ".env"),       // Apps directory (legacy path)
    join(resolve("."), ".env")              // MCP server directory
  ];

  let envPath = null;
  let envContent = null;

  for (const path of possibleEnvPaths) {
    if (existsSync(path)) {
      envPath = path;
      envContent = readFileSync(path, "utf8");
      console.log(`✅ Found .env file at: ${path}`);
      break;
    }
  }

  if (!envPath) {
    console.error("❌ Could not find .env file in any expected location:");
    possibleEnvPaths.forEach(path => console.error(`  - ${path}`));
    console.error("Please ensure you have a .env file with ROAST_MY_POST_MCP_DATABASE_URL or DATABASE_URL set");
    process.exit(1);
  }
  
  // First try ROAST_MY_POST_MCP_DATABASE_URL
  let match = envContent.match(/ROAST_MY_POST_MCP_DATABASE_URL="?([^"\n]+)"?/);
  if (match) {
    console.log("✅ Found ROAST_MY_POST_MCP_DATABASE_URL in parent .env file");
    return match[1];
  }
  
  // Fall back to DATABASE_URL
  match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (!match) {
    console.error("❌ Could not find ROAST_MY_POST_MCP_DATABASE_URL or DATABASE_URL in .env file");
    process.exit(1);
  }

  console.log("✅ Found DATABASE_URL in parent .env file");
  return match[1];
}

// Read existing config or create new one
function loadConfig() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    } catch (error) {
      console.error("⚠️  Could not parse existing config, creating new one");
      return {};
    }
  }

  return {};
}

// Main configuration
function configure() {
  console.log(
    "🔧 Configuring Claude Desktop for Roast My Post MCP Server...\n"
  );

  const databaseUrl = getDatabaseUrl();

  const config = loadConfig();

  // Ensure mcpServers object exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Get the absolute path to the built server
  const serverPath = resolve(join(".", "dist", "index.js"));

  // Add our server configuration
  config.mcpServers["roast-my-post"] = {
    command: "node",
    args: [serverPath],
    env: {
      DATABASE_URL: databaseUrl,
      ROAST_MY_POST_MCP_API_BASE_URL:
        process.env.ROAST_MY_POST_MCP_API_BASE_URL || "http://localhost:3000",
    },
  };

  // Write the updated config
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  console.log(`✅ Configuration written to: ${CONFIG_FILE}`);
  console.log("\n📋 Next steps:");
  console.log("1. Restart Claude Desktop");
  console.log('2. Look for "roast-my-post" in the MCP tools menu');
  console.log("3. Try commands like:");
  console.log('   - "Show me all agents"');
  console.log('   - "Get recent failed evaluations"');
  console.log('   - "What are the stats for agent-123?"');
  console.log("\n✨ MCP server configured successfully!");
}

// Run configuration
try {
  configure();
} catch (error) {
  console.error("❌ Error configuring Claude Desktop:", error.message);
  process.exit(1);
}
