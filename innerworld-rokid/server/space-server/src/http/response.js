const apiCorsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, accept"
};

const jsonHeaders = {
  ...apiCorsHeaders,
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const preflightHeaders = {
  ...apiCorsHeaders,
  "cache-control": "no-store"
};

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export function sendJson(res, status, body) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(body, null, 2));
}

export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

export function sendPreflight(res) {
  res.writeHead(204, preflightHeaders);
  res.end();
}
