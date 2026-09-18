"""Framework adapters for the Xurface Horizon SDK.

Each adapter wraps a framework's tool abstraction so that a tool call is recorded
in Horizon and, when its risk exceeds the person's appetite, held for their
discernment before the tool body runs.

    openai    - OpenAI function / tool calling (genAI)
    anthropic - Anthropic Claude tool use (genAI)
    langgraph - LangChain / LangGraph tools (genAI orchestration)
    crewai    - CrewAI crew tools (multi-agent genAI)

The coding-agent adapter (MCP, for Claude Code / Cursor / Zed) ships as a Node
stdio server at sdk/typescript/adapters/mcp-server.mjs.
"""
