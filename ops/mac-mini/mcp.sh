#!/bin/sh
set -eu
umask 077
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
cd /Users/steven/services/actual/mcp
# Keep the server password and budget ID exclusively on the Mini.
# This package loads .env quietly; stdio is reserved for MCP JSON-RPC.
# Separate API replicas prevent concurrent MCP clients sharing SQLite files.
mkdir -p sessions
MCP_BRIDGE_DATA_DIR=$(mktemp -d "$PWD/sessions/client.XXXXXX")
export MCP_BRIDGE_DATA_DIR
trap 'rm -rf "$MCP_BRIDGE_DATA_DIR"' EXIT
/opt/homebrew/bin/node node_modules/actual-mcp-server/bin/actual-mcp-server.js --stdio
