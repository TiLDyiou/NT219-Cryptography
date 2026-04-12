-- =============================================================================
-- NT219 Crypto Capstone — Envoy Lua WAF (Web Application Firewall)
-- Week 2: Basic WAF rules for SQL injection, XSS, path traversal detection
--
-- This runs as an Envoy Lua HTTP filter BEFORE JWT validation and routing.
-- Blocked requests receive 403 Forbidden with a JSON error body.
--
-- NOTE: This is a teaching/demo WAF. For production, use ModSecurity or
-- cloud-native WAFs (AWS WAF, Cloudflare WAF).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Pattern definitions
-- ─────────────────────────────────────────────────────────────────────────────

-- SQL Injection patterns (case-insensitive matching applied later)
local sqli_patterns = {
  "union%s+select",
  "union%s+all%s+select",
  "select%s+.*%s+from",
  "insert%s+into",
  "delete%s+from",
  "drop%s+table",
  "drop%s+database",
  "alter%s+table",
  "exec%s*%(", 
  "execute%s*%(",
  "xp_cmdshell",
  "0x[0-9a-fA-F]+",          -- hex-encoded payloads
  "'%s*or%s+'",               -- ' or '
  "'%s*or%s+1%s*=%s*1",      -- ' or 1=1
  "1%s*=%s*1",                -- 1=1
  "';%s*--",                  -- SQL comment termination
  "sleep%s*%(", 
  "benchmark%s*%(",
  "waitfor%s+delay",
  "char%s*%(",                -- char() encoding bypass
  "concat%s*%(",
  "group_concat%s*%(",
  "load_file%s*%(",
  "into%s+outfile",
  "into%s+dumpfile",
  "information_schema",
  "pg_catalog",               -- PostgreSQL-specific
  "pg_sleep",                 -- PostgreSQL-specific
}

-- XSS patterns
local xss_patterns = {
  "<script",
  "</script",
  "javascript%s*:",
  "vbscript%s*:",
  "on%a+%s*=",               -- onerror=, onload=, onclick=, etc.
  "expression%s*%(",          -- CSS expression()
  "url%s*%(%s*['\"]?javascript",
  "eval%s*%(",
  "alert%s*%(",
  "prompt%s*%(",
  "confirm%s*%(",
  "document%.cookie",
  "document%.domain",
  "document%.write",
  "window%.location",
  "innerHTML",
  "fromCharCode",
  "<iframe",
  "<embed",
  "<object",
  "<svg%s",
  "<img%s+[^>]*onerror",
}

-- Path traversal patterns
local traversal_patterns = {
  "%.%.%/",                   -- ../
  "%.%.\\",                   -- ..\
  "%%2e%%2e",                 -- URL-encoded ..
  "%%252e%%252e",             -- double URL-encoded ..
  "%%c0%%ae",                 -- overlong UTF-8 encoding of .
  "%%c1%%9c",                 -- overlong UTF-8 encoding of /
  "/etc/passwd",
  "/etc/shadow",
  "/proc/self",
  "/var/log",
  "boot%.ini",
  "win%.ini",
}

-- Suspicious User-Agent patterns (common scanners/bots)
local bad_agents = {
  "sqlmap",
  "nikto",
  "nessus",
  "masscan",
  "nmap",
  "dirbuster",
  "gobuster",
  "wfuzz",
  "hydra",
  "burpsuite",               -- Burp Suite scanner
  "zgrab",
  "nuclei",
}

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────────────────────────────────────────

-- URL-decode a string (handles %XX encoding)
local function url_decode(str)
  if not str then return "" end
  str = str:gsub("%%(%x%x)", function(h) 
    return string.char(tonumber(h, 16)) 
  end)
  return str
end

-- Check a string against a list of patterns (case-insensitive)
local function check_patterns(input, patterns, category)
  if not input or input == "" then
    return nil
  end
  
  -- Normalize: URL-decode and lowercase
  local decoded = url_decode(input):lower()
  
  for _, pattern in ipairs(patterns) do
    if decoded:find(pattern) then
      return {
        category = category,
        pattern = pattern,
        input_preview = input:sub(1, 100),  -- truncate for log safety
      }
    end
  end
  
  return nil
end

-- Build a JSON error response body
local function blocked_response(reason, category, request_id)
  return string.format(
    '{"error":"blocked_by_waf","reason":"%s","category":"%s","request_id":"%s","support":"Contact admin if this is a false positive"}',
    reason, category, request_id or "unknown"
  )
end

-- ─────────────────────────────────────────────────────────────────────────────
-- Envoy Lua filter entry point
-- ─────────────────────────────────────────────────────────────────────────────

function envoy_on_request(request_handle)
  -- Generate a pseudo request ID for logging
  local request_id = request_handle:headers():get("x-request-id") or "no-id"
  local client_ip = request_handle:headers():get("x-forwarded-for") or "unknown"
  local method = request_handle:headers():get(":method") or "?"
  local path = request_handle:headers():get(":path") or "/"
  local user_agent = request_handle:headers():get("user-agent") or ""
  
  -- ── Check 1: Suspicious User-Agent ──
  local ua_lower = user_agent:lower()
  for _, agent in ipairs(bad_agents) do
    if ua_lower:find(agent, 1, true) then
      request_handle:logWarn(string.format(
        "[WAF] BLOCKED scanner | ip=%s ua=%s agent_match=%s req_id=%s",
        client_ip, user_agent:sub(1, 50), agent, request_id
      ))
      request_handle:respond(
        {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "scanner"},
        blocked_response("Automated scanner detected", "scanner", request_id)
      )
      return
    end
  end
  
  -- ── Check 2: Path traversal in URL path ──
  local match = check_patterns(path, traversal_patterns, "path_traversal")
  if match then
    request_handle:logWarn(string.format(
      "[WAF] BLOCKED path_traversal | ip=%s path=%s pattern=%s req_id=%s",
      client_ip, path:sub(1, 100), match.pattern, request_id
    ))
    request_handle:respond(
      {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "path_traversal"},
      blocked_response("Path traversal attempt detected", "path_traversal", request_id)
    )
    return
  end
  
  -- ── Check 3: SQL injection in URL path + query string ──
  match = check_patterns(path, sqli_patterns, "sqli")
  if match then
    request_handle:logWarn(string.format(
      "[WAF] BLOCKED sqli | ip=%s path=%s pattern=%s req_id=%s",
      client_ip, path:sub(1, 100), match.pattern, request_id
    ))
    request_handle:respond(
      {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "sqli"},
      blocked_response("SQL injection attempt detected", "sqli", request_id)
    )
    return
  end
  
  -- ── Check 4: XSS in URL path + query string ──
  match = check_patterns(path, xss_patterns, "xss")
  if match then
    request_handle:logWarn(string.format(
      "[WAF] BLOCKED xss | ip=%s path=%s pattern=%s req_id=%s",
      client_ip, path:sub(1, 100), match.pattern, request_id
    ))
    request_handle:respond(
      {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "xss"},
      blocked_response("Cross-site scripting attempt detected", "xss", request_id)
    )
    return
  end
  
  -- ── Check 5: Request body inspection (POST/PUT/PATCH only) ──
  if method == "POST" or method == "PUT" or method == "PATCH" then
    -- Read body (limited to first 8KB to avoid memory issues)
    local body = request_handle:body()
    if body then
      local body_str = body:getBytes(0, math.min(body:length(), 8192))
      
      match = check_patterns(body_str, sqli_patterns, "sqli_body")
      if match then
        request_handle:logWarn(string.format(
          "[WAF] BLOCKED sqli_body | ip=%s path=%s pattern=%s req_id=%s",
          client_ip, path:sub(1, 100), match.pattern, request_id
        ))
        request_handle:respond(
          {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "sqli_body"},
          blocked_response("SQL injection in request body detected", "sqli_body", request_id)
        )
        return
      end
      
      match = check_patterns(body_str, xss_patterns, "xss_body")
      if match then
        request_handle:logWarn(string.format(
          "[WAF] BLOCKED xss_body | ip=%s path=%s pattern=%s req_id=%s",
          client_ip, path:sub(1, 100), match.pattern, request_id
        ))
        request_handle:respond(
          {[":status"] = "403", ["content-type"] = "application/json", ["x-waf-block"] = "xss_body"},
          blocked_response("Cross-site scripting in request body detected", "xss_body", request_id)
        )
        return
      end
    end
  end
  
  -- ── All checks passed — add WAF header and continue ──
  request_handle:headers():add("x-waf-status", "passed")
end

-- Response filter: add security headers
function envoy_on_response(response_handle)
  response_handle:headers():add("X-Content-Type-Options", "nosniff")
  response_handle:headers():add("X-Frame-Options", "DENY")
  response_handle:headers():add("X-XSS-Protection", "1; mode=block")
  response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
  response_handle:headers():add("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
end
