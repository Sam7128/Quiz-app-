from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import anyio
from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client


EXPECTED_TOOLS = {
    "search_memory",
    "get_aliases",
    "get_source_of_truth",
    "get_entry_points",
    "get_hotspots",
    "get_search_recipes",
    "get_memory_health",
    "rebuild_project_memory_cache",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify the project-local project-memory MCP server.")
    parser.add_argument("--root", required=True, help="Project root.")
    parser.add_argument("--query", default="AGENTS.md", help="Verification query for search_memory.")
    parser.add_argument("--limit", type=int, default=3, help="Maximum search results to request.")
    parser.add_argument("--timeout", type=float, default=12.0, help="Maximum seconds for MCP startup and verification.")
    return parser.parse_args()


def extract_text_content(result: object) -> str:
    content = getattr(result, "content", None)
    if not isinstance(content, list):
        raise RuntimeError("MCP tool call returned no content.")

    for item in content:
        if getattr(item, "type", "") == "text":
            text = getattr(item, "text", "")
            if isinstance(text, str) and text.strip():
                return text

    raise RuntimeError("MCP tool call returned no text payload.")


async def _verify(root: Path, query: str, limit: int) -> dict[str, object]:
    wrapper_path = root / ".project-memory" / "project_memory_mcp_entry.py"
    if not wrapper_path.exists():
        raise RuntimeError(f"Project-local MCP wrapper missing: {wrapper_path}")

    server = StdioServerParameters(
        command=sys.executable,
        args=[str(wrapper_path)],
        cwd=str(root),
    )

    async with stdio_client(server) as streams:
        read_stream, write_stream = streams
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            tools_response = await session.list_tools()
            tool_names = {tool.name for tool in tools_response.tools}
            missing_tools = sorted(EXPECTED_TOOLS - tool_names)
            if missing_tools:
                raise RuntimeError(f"MCP server missing expected tools: {', '.join(missing_tools)}")

            search_response = await session.call_tool("search_memory", {"query": query, "limit": limit})
            if getattr(search_response, "isError", False):
                raise RuntimeError(f"search_memory returned isError for query: {query}")

            payload = json.loads(extract_text_content(search_response))
            results = payload.get("results")
            if not isinstance(results, list) or not results:
                raise RuntimeError(f"search_memory returned no results for verification query: {query}")

            scoped_response = await session.call_tool("search_memory", {"query": "protocol", "scope": "rules", "limit": 2})
            if getattr(scoped_response, "isError", False):
                raise RuntimeError("search_memory returned isError for scoped verification query.")

            scoped_payload = json.loads(extract_text_content(scoped_response))
            scoped_results = scoped_payload.get("results")
            if not isinstance(scoped_results, list) or not scoped_results:
                raise RuntimeError("search_memory returned no results for scoped verification query.")
            top_scoped = scoped_results[0]
            if top_scoped.get("scope") != "rules":
                raise RuntimeError("Scoped verification query did not return a rules-scoped top result.")

            entry_points_response = await session.call_tool("get_entry_points", {})
            if getattr(entry_points_response, "isError", False):
                raise RuntimeError("get_entry_points returned isError during verification.")

            health_response = await session.call_tool("get_memory_health", {})
            if getattr(health_response, "isError", False):
                raise RuntimeError("get_memory_health returned isError during verification.")

            health_payload = json.loads(extract_text_content(health_response))

            return {
                "root": str(root),
                "wrapper": str(wrapper_path),
                "query": query,
                "tools": sorted(tool_names),
                "result_count": len(results),
                "top_result": results[0],
                "scoped_result_count": len(scoped_results),
                "top_scoped_result": top_scoped,
                "status": health_payload.get("status"),
                "wrapper_status": health_payload.get("wrapper_status"),
                "local_index_status": health_payload.get("local_index_status"),
                "codebase_graph_status": health_payload.get("codebase_graph_status"),
                "health_warnings": health_payload.get("warnings", []),
            }


async def verify(root: Path, query: str, limit: int, timeout_seconds: float = 12.0) -> dict[str, object]:
    try:
        with anyio.fail_after(timeout_seconds):
            return await _verify(root, query, limit)
    except TimeoutError as exc:
        raise RuntimeError(
            f"project-memory server unavailable: startup or query timed out after {timeout_seconds:g}s"
        ) from exc


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {root}")

    try:
        summary = anyio.run(verify, root, args.query, args.limit, args.timeout)
    except RuntimeError as exc:
        sys.stderr.write(f"{exc}\n")
        return 2
    sys.stdout.write(json.dumps(summary, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
