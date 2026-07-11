/** Vercel serverless handler → Netlify Function köprüsü (kariyer API). */
function createNetlifyHandler(vercelHandler) {
  return async (event) => {
    const url = new URL(event.rawUrl || `https://local${event.path}`);
    const req = {
      method: event.httpMethod,
      url: url.toString(),
      headers: Object.fromEntries(
        Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), String(v ?? "")]),
      ),
      body: event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64").toString("utf8")
        : event.body,
      query: { ...(event.queryStringParameters || {}), ...(event.pathParameters || {}) },
    };

    if (req.body && typeof req.body === "string" && req.headers["content-type"]?.includes("json")) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        /* ham string bırak */
      }
    }

    let statusCode = 200;
    const headers = {};

    const res = {
      set statusCode(code) {
        statusCode = code;
      },
      get statusCode() {
        return statusCode;
      },
      setHeader(key, value) {
        headers[String(key).toLowerCase()] = value;
      },
      end(data) {
        this._body = data;
      },
      _body: "",
    };

    await vercelHandler(req, res);

    return {
      statusCode,
      headers,
      body: typeof res._body === "string" ? res._body : JSON.stringify(res._body ?? {}),
    };
  };
}

module.exports = { createNetlifyHandler };
