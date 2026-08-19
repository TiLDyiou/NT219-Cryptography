local sqli_patterns = {
  "union%s+select","union%s+all%s+select","select%s+.*%s+from",
  "insert%s+into","delete%s+from","drop%s+table","drop%s+database",
  "alter%s+table","exec%s*%(","execute%s*%(","xp_cmdshell",
  "0x[0-9a-fA-F]+","'%s*or%s+'","'%s*or%s+1%s*=%s*1","1%s*=%s*1",
  "';%s*--","'%s*%-%-","%-%-[%s$]","#[%s$]",
  "sleep%s*%(","benchmark%s*%(","waitfor%s+delay",
  "char%s*%(","concat%s*%(","group_concat%s*%(","load_file%s*%(",
  "into%s+outfile","into%s+dumpfile","information_schema",
  "pg_catalog","pg_sleep",
}
local xss_patterns = {
  "<script","</script","javascript%s*:","vbscript%s*:","on%a+%s*=",
  "expression%s*%(","url%s*%(%s*['\"]?javascript","eval%s*%(",
  "alert%s*%(","prompt%s*%(","confirm%s*%(","document%.cookie",
  "document%.domain","document%.write","window%.location",
  "innerHTML","fromCharCode","<iframe","<embed","<object",
  "<svg%s","<img%s+[^>]*onerror",
}
local traversal_patterns = {
  "%.%.%/","%.%.\\","%%2e%%2e","%%252e%%252e","%%c0%%ae","%%c1%%9c",
  "/etc/passwd","/etc/shadow","/proc/self","/var/log","boot%.ini","win%.ini",
}
local bad_agents = {
  "sqlmap","nikto","nessus","masscan","nmap","dirbuster",
  "gobuster","wfuzz","hydra","burpsuite","zgrab","nuclei",
}

local function url_decode(str)
  if not str then return "" end
  return str:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end)
end

local function check_patterns(input, patterns, category)
  if not input or input == "" then return nil end
  local decoded = url_decode(input):lower()
  for _, pattern in ipairs(patterns) do
    if decoded:find(pattern) then
      return { category = category, pattern = pattern }
    end
  end
  return nil
end

local function blocked_response(request_id)
  return string.format(
    '{"error":"forbidden","message":"Access denied","request_id":"%s"}',
    request_id or "unknown"
  )
end

function envoy_on_request(request_handle)
  local request_id = request_handle:headers():get("x-request-id") or "no-id"
  local client_ip  = request_handle:headers():get("x-forwarded-for") or "unknown"
  local method     = request_handle:headers():get(":method") or "?"
  local path       = request_handle:headers():get(":path") or "/"
  local user_agent = request_handle:headers():get("user-agent") or ""

  local ua_lower = user_agent:lower()
  for _, agent in ipairs(bad_agents) do
    if ua_lower:find(agent, 1, true) then
      request_handle:logWarn(string.format("[WAF] BLOCKED ip=%s id=%s", client_ip, request_id))
      request_handle:respond(
        {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="scanner"},
        blocked_response(request_id))
      return
    end
  end

  local match = check_patterns(path, traversal_patterns, "path_traversal")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED ip=%s id=%s", client_ip, request_id))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="path_traversal"},
      blocked_response(request_id))
    return
  end

  match = check_patterns(path, sqli_patterns, "sqli")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED ip=%s id=%s", client_ip, request_id))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="sqli"},
      blocked_response(request_id))
    return
  end

  match = check_patterns(path, xss_patterns, "xss")
  if match then
    request_handle:logWarn(string.format("[WAF] BLOCKED ip=%s id=%s", client_ip, request_id))
    request_handle:respond(
      {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="xss"},
      blocked_response(request_id))
    return
  end

  if method == "POST" or method == "PUT" or method == "PATCH" then
    local content_type = (request_handle:headers():get("content-type") or ""):lower()
    local scan_body = content_type:find("application/json", 1, true) ~= nil
      or content_type:find("application/merge-patch+json", 1, true) ~= nil
      or content_type:find("application/vnd.api+json", 1, true) ~= nil
    if scan_body then
      local body = request_handle:body()
      if body then
        local body_str = body:getBytes(0, math.min(body:length(), 8192))
        match = check_patterns(body_str, sqli_patterns, "sqli_body")
        if match then
          request_handle:respond(
            {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="sqli_body"},
            blocked_response(request_id))
          return
        end
        match = check_patterns(body_str, xss_patterns, "xss_body")
        if match then
          request_handle:respond(
            {[":status"]="403",["content-type"]="application/json",["x-waf-block"]="xss_body"},
            blocked_response(request_id))
          return
        end
      end
    end
  end

  request_handle:headers():add("x-waf-status", "passed")
end

function envoy_on_response(response_handle)
  response_handle:headers():add("X-Content-Type-Options", "nosniff")
  response_handle:headers():add("X-Frame-Options", "DENY")
  response_handle:headers():add("X-XSS-Protection", "1; mode=block")
  response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
  response_handle:headers():add("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
end
