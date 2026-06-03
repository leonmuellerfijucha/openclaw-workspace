const DROPBOX_ACCESS_TOKEN = Deno.env.get("DROPBOX_ACCESS_TOKEN") || "";
const CONSUMER_KEY = Deno.env.get("DROPBOX_MCP_CONSUMER_KEY") || "";

// --- Constants ---
const DBX_API = "https://api.dropboxapi.com/2";
const DBX_CONTENT_API = "https://content.dropboxapi.com/2";
const SESSION_THRESHOLD = 150 * 1024 * 1024; // 150 MB
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB

// --- Helpers ---

function constantTimeCompare(providedKey: string, actualKey: string | undefined): boolean {
  if (!providedKey || !actualKey) return false;
  const providedBuffer = new TextEncoder().encode(providedKey);
  const actualBuffer = new TextEncoder().encode(actualKey);
  if (providedBuffer.length !== actualBuffer.length) return false;
  return providedBuffer.every((val, idx) => val === actualBuffer[idx]);
}

function normalizePath(path: string): string {
  const normalized = path.trim();
  if (normalized === "/" || normalized === "\\") return "";
  return normalized;
}

async function dropboxFetch(
  endpoint: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<any> {
  const url = `${DBX_API}/${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (options.headers) Object.assign(headers, options.headers);

  const response = await fetch(url, {
    method: options.method || "POST",
    headers,
    body: options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (data.error) {
        const error: any = new Error(data.error_summary || data.error?.message || JSON.stringify(data));
        error.status = response.status;
        error.dropbox_error = data;
        throw error;
      }
    } catch {
      throw new Error(`Dropbox API error (${response.status}): ${text.substring(0, 200)}`);
    }
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return await response.text();
  }

  return await response.json();
}

async function dropboxContentFetch(
  endpoint: string,
  args: {
    arg?: Record<string, any>;
    body?: BodyInit;
    method?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const url = `${DBX_CONTENT_API}/${endpoint}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${DROPBOX_ACCESS_TOKEN}`,
  };
  
  if (args.arg) {
    headers["Dropbox-API-Arg"] = JSON.stringify(args.arg);
  }
  if (args.headers) Object.assign(headers, args.headers);

  return await fetch(url, {
    method: args.method || "POST",
    headers,
    body: args.body,
  });
}

// --- Tool Definitions ---

const TOOLS = [
  {
    name: "list_folder",
    description: "List folder contents. Returns cursor for pagination.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to folder (empty for root)" },
        recursive: { type: "boolean", default: false, description: "List recursively" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_folder_continue",
    description: "Continue folder listing with cursor from list_folder.",
    inputSchema: {
      type: "object",
      properties: { cursor: { type: "string" } },
      required: ["cursor"],
    },
  },
  {
    name: "get_metadata",
    description: "Get metadata for file or folder.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "create_folder",
    description: "Create a folder.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "delete_item",
    description: "Delete file or folder.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "move_item",
    description: "Move or rename file/folder.",
    inputSchema: {
      type: "object",
      properties: {
        from_path: { type: "string" },
        to_path: { type: "string" },
      },
      required: ["from_path", "to_path"],
    },
  },
  {
    name: "copy_item",
    description: "Copy file or folder.",
    inputSchema: {
      type: "object",
      properties: {
        from_path: { type: "string" },
        to_path: { type: "string" },
      },
      required: ["from_path", "to_path"],
    },
  },
  {
    name: "upload_file",
    description: "Upload file. Auto-handles large files via sessions.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string", description: "Base64 encoded content" },
        mode: { type: "string", enum: ["add", "overwrite", "update"], default: "overwrite" },
        autorename: { type: "boolean", default: false },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "download_file",
    description: "Download file as Base64 string.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "get_temporary_link",
    description: "Get temporary direct link to file.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "get_thumbnail",
    description: "Get thumbnail for image file.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        format: { type: "string", enum: ["jpeg", "png"], default: "jpeg" },
        size: { type: "string", enum: ["w32h32", "w64h64", "w128h128", "w256h256", "w480h320", "w640h480", "w960h640", "w1024h768", "w2048h1536"], default: "w256h256" },
      },
      required: ["path"],
    },
  },
  {
    name: "search",
    description: "Search files and folders.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        path: { type: "string", description: "Limit search to folder" },
        max_results: { type: "number", default: 100 },
      },
      required: ["query"],
    },
  },
  {
    name: "create_shared_link",
    description: "Create shared link for file/folder.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        requested_visibility: { type: "string", enum: ["public", "team_only", "password"], default: "public" },
        audience: { type: "string", enum: ["public", "team", "no_one"], default: "public" },
        access_level: { type: "string", enum: ["viewer", "editor"], default: "viewer" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_shared_links",
    description: "List shared links.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Optional: filter by path" },
      },
    },
  },
  {
    name: "get_shared_link_metadata",
    description: "Get metadata for shared link URL.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "revoke_shared_link",
    description: "Revoke shared link.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
  },
  {
    name: "get_current_account",
    description: "Get current account info.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_space_usage",
    description: "Get space usage info.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_revisions",
    description: "List file revisions.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "restore_file",
    description: "Restore file to specific revision.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        rev: { type: "string" },
      },
      required: ["path", "rev"],
    },
  },
];

// --- Handler ---

async function handleTool(name: string, args: any) {
  // Check consumer key if set
  // Temporarily disabled for testing
  // if (CONSUMER_KEY && CONSUMER_KEY !== "") {
  //   const providedKey = args?.["x-consumer-api-key"] || "";
  //   if (!constantTimeCompare(providedKey, CONSUMER_KEY)) {
  //     throw new Error("Unauthorized: Invalid x-consumer-api-key");
  //   }
  // }

  switch (name) {
    case "list_folder": {
      const path = normalizePath(args?.path as string);
      const recursive = args?.recursive as boolean || false;
      const data = await dropboxFetch("files/list_folder", {
        method: "POST",
        body: JSON.stringify({ path, recursive, include_deleted: false }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "list_folder_continue": {
      const cursor = args?.cursor as string;
      const data = await dropboxFetch("files/list_folder/continue", {
        method: "POST",
        body: JSON.stringify({ cursor }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_metadata": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("files/get_metadata", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "create_folder": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("files/create_folder_v2", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "delete_item": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("files/delete_v2", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "move_item": {
      const from_path = normalizePath(args?.from_path as string);
      const to_path = normalizePath(args?.to_path as string);
      const data = await dropboxFetch("files/move_v2", {
        method: "POST",
        body: JSON.stringify({ from_path, to_path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "copy_item": {
      const from_path = normalizePath(args?.from_path as string);
      const to_path = normalizePath(args?.to_path as string);
      const data = await dropboxFetch("files/copy_v2", {
        method: "POST",
        body: JSON.stringify({ from_path, to_path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "upload_file": {
      const path = normalizePath(args?.path as string);
      const content = args?.content as string;
      const mode = (args?.mode as string) || "overwrite";
      
      // Convert base64 to bytes
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length < SESSION_THRESHOLD) {
        const arg = {
          path,
          mode: { [mode]: {} },
        };
        const response = await dropboxContentFetch("files/upload", {
          arg,
          body: bytes,
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Upload failed (${response.status}): ${error}`);
        }
        const data = await response.json();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } else {
        // Large file session upload
        const startRes = await dropboxFetch("files/upload_session/start", {
          method: "POST",
          body: JSON.stringify({}),
        });
        const session_id = startRes.session_id;
        
        let offset = 0;
        while (offset < bytes.length) {
          const end = Math.min(offset + CHUNK_SIZE, bytes.length);
          const chunk = bytes.slice(offset, end);
          
          const appendRes = await dropboxContentFetch("files/upload_session/append_v2", {
            arg: { session_id, offset },
            body: chunk,
          });
          if (!appendRes.ok) {
            const error = await appendRes.text();
            throw new Error(`Append failed at offset ${offset}: ${error}`);
          }
          offset = end;
        }
        
        const finishRes = await dropboxFetch("files/upload_session/finish", {
          method: "POST",
          body: JSON.stringify({
            cursor: { session_id, offset: bytes.length },
            commit: { path, mode: { [mode]: {} } },
          }),
        });
        return { content: [{ type: "text", text: JSON.stringify(finishRes, null, 2) }] };
      }
    }

    case "download_file": {
      const path = normalizePath(args?.path as string);
      const response = await dropboxContentFetch("files/download", {
        arg: { path },
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Download failed (${response.status}): ${error}`);
      }
      const buffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      return { content: [{ type: "text", text: base64 }] };
    }

    case "get_temporary_link": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("files/get_temporary_link", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "search": {
      const query = args?.query as string;
      const data = await dropboxFetch("files/search_v2", {
        method: "POST",
        body: JSON.stringify({ query, options: { max_results: 100 } }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data.matches || data, null, 2) }] };
    }

    case "create_shared_link": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("sharing/create_shared_link_with_settings", {
        method: "POST",
        body: JSON.stringify({ path, settings: {} }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "list_shared_links": {
      const path = args?.path as string;
      const body = path ? { path } : {};
      const data = await dropboxFetch("sharing/list_shared_links", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_shared_link_metadata": {
      const url = args?.url as string;
      const data = await dropboxFetch("sharing/get_shared_link_metadata", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "revoke_shared_link": {
      const url = args?.url as string;
      const data = await dropboxFetch("sharing/revoke_shared_link", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_current_account": {
      const data = await dropboxFetch("users/get_current_account", {
        method: "POST",
        body: JSON.stringify({}),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "get_space_usage": {
      const data = await dropboxFetch("users/get_space_usage", {
        method: "POST",
        body: JSON.stringify({}),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "list_revisions": {
      const path = normalizePath(args?.path as string);
      const data = await dropboxFetch("files/list_revisions", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    case "restore_file": {
      const path = normalizePath(args?.path as string);
      const rev = args?.rev as string;
      const data = await dropboxFetch("files/restore", {
        method: "POST",
        body: JSON.stringify({ path, rev }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// --- Main Server ---

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Only POST allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error" },
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { jsonrpc, method, params, id } = body;

  if (jsonrpc !== "2.0") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" },
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    let result: any;

    if (method === "tools/list") {
      result = { tools: TOOLS };
    } else if (method === "tools/call") {
      const { name, arguments: args } = params;
      result = await handleTool(name, args);
    } else {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found" },
      }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: {
        code: error.status || -32603,
        message: error.message || "Internal error",
      },
    }), {
      status: error.status || 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
