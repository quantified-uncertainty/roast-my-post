# Open Annotate MCP Server

A Model Context Protocol (MCP) server for fast database access to the Open Annotate system.

## Features

This MCP server provides direct database access to Open Annotate, enabling fast queries and analytics without writing scripts.

For detailed documentation of all available tools and their parameters, see [FEATURES.md](./FEATURES.md).

## Quick Setup

Run this single command to set up everything:

```bash
cd mcp-server
npm run setup
```

This will:

1. Install dependencies
2. Build the server
3. Configure Claude Desktop automatically

After running setup, restart Claude Desktop to load the MCP server.

## Manual Setup (if needed)

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Claude Desktop

```bash
npm run configure
```

Or manually add to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "open-annotate": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "your-database-url",
        "ROAST_MY_POST_MCP_USER_API_KEY": "oa_your-api-key-here"
      }
    }
  }
}
```

### Setting Up API Key Authentication

To enable mutation operations (creating agent versions and spawning batch jobs), you need to create an API key:

1. Log into the Open Annotate web interface
2. Navigate to your user settings or API keys page
3. Create a new API key with a descriptive name
4. Copy the API key (you won't be able to see it again)
5. Add it to your Claude Desktop configuration as shown above

The API key gives the MCP server the same permissions as your user account.

## Usage Examples

Once configured, you can use these tools in Claude:

```
"Show me all active agents"
"Get recent failed evaluations for agent-123"
"What's the performance of the ASSESSOR agents over the last 30 days?"
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This watches for changes and rebuilds automatically.

### Adding New Tools

1. Add the tool definition in the `ListToolsRequestSchema` handler
2. Add the argument schema using Zod
3. Implement the tool logic in the `CallToolRequestSchema` handler
4. The tool will be automatically available in Claude after rebuilding

### Testing the Server

You can test the server manually:

```bash
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node dist/index.js
```

## Troubleshooting

1. **Database Connection Issues**: Ensure DATABASE_URL is correct and the database is accessible
2. **Prisma Client Errors**: The MCP server uses the parent project's Prisma client - rebuild if you see import errors
3. **Server Not Available in Claude**: Check the config file path and restart Claude Desktop
4. **Permission Errors**: Ensure the built file has execute permissions

## Future Enhancements

- Add write operations (update agent instructions, archive agents)
- Implement caching for frequently accessed data
- Add more analytical tools (trend analysis, comparison tools)
- Support for batch operations
- Real-time monitoring capabilities
