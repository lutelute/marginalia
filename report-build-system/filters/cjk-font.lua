-- cjk-font.lua: Auto-detect CJK characters and wrap in \cjkmainfont{}
-- For XeTeX with DejaVu (Latin) + Droid Sans Fallback (CJK)

local function is_cjk(c)
  return (c >= 0x3000 and c <= 0x303F)
      or (c >= 0x3040 and c <= 0x309F)
      or (c >= 0x30A0 and c <= 0x30FF)
      or (c >= 0x3400 and c <= 0x4DBF)
      or (c >= 0x4E00 and c <= 0x9FFF)
      or (c >= 0xF900 and c <= 0xFAFF)
      or (c >= 0xFF00 and c <= 0xFFEF)
      or (c >= 0x20000 and c <= 0x2FA1F)
end

local function wrap_cjk(text)
  local result = {}
  local buf = {}
  local in_cjk = false
  for _, c in utf8.codes(text) do
    local cjk = is_cjk(c)
    if cjk ~= in_cjk and #buf > 0 then
      local s = table.concat(buf)
      if in_cjk then
        table.insert(result, "{\\cjkmainfont " .. s .. "}")
      else
        table.insert(result, s)
      end
      buf = {}
    end
    in_cjk = cjk
    table.insert(buf, utf8.char(c))
  end
  if #buf > 0 then
    local s = table.concat(buf)
    if in_cjk then
      table.insert(result, "{\\cjkmainfont " .. s .. "}")
    else
      table.insert(result, s)
    end
  end
  return table.concat(result)
end

function Str(el)
  local text = el.text
  local has_cjk = false
  for _, c in utf8.codes(text) do
    if is_cjk(c) then has_cjk = true; break end
  end
  if has_cjk then
    return pandoc.RawInline('latex', wrap_cjk(text))
  end
  return el
end

function Meta(m)
  -- Process title, subtitle, author for CJK
  local function process_meta_inlines(field)
    if m[field] then
      local s = pandoc.utils.stringify(m[field])
      local has = false
      for _, c in utf8.codes(s) do
        if is_cjk(c) then has = true; break end
      end
      if has then
        m[field] = pandoc.MetaInlines({pandoc.RawInline('latex', wrap_cjk(s))})
      end
    end
  end
  process_meta_inlines('title')
  process_meta_inlines('subtitle')
  -- Author can be a list
  if m.author then
    local atype = m.author.t or ""
    if atype == "MetaList" then
      for i, a in ipairs(m.author) do
        local s = pandoc.utils.stringify(a)
        local has = false
        for _, c in utf8.codes(s) do
          if is_cjk(c) then has = true; break end
        end
        if has then
          m.author[i] = pandoc.MetaInlines({pandoc.RawInline('latex', wrap_cjk(s))})
        end
      end
    else
      process_meta_inlines('author')
    end
  end
  return m
end

return {{Meta = Meta}, {Str = Str}}
