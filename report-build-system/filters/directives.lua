--[[
  directives.lua — Pandoc Lua filter for HTML-comment directives.

  Processes the following directive patterns inside RawBlock "html" nodes:

    <!-- figure: label | path | caption | width -->
    <!-- equation: label | latex -->
    <!-- ref: label -->
    <!-- pagebreak -->
    <!-- table: label | caption -->  ... <!-- /table -->
    <!-- algorithm: label | caption --> ... <!-- /algorithm -->
    <!-- raw-docx --> ... <!-- /raw-docx -->        (stripped in Pandoc path)
    <!-- style: StyleName | text -->                (stripped in Pandoc path)

  Filter order: metadata-defaults → cjk-font → **directives** → crossref → layout
]]

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

--- Split a string by a pipe '|' delimiter and trim whitespace.
local function split_pipe(s)
  local parts = {}
  for part in s:gmatch('[^|]+') do
    parts[#parts + 1] = part:match('^%s*(.-)%s*$')
  end
  return parts
end

--- Match an HTML comment directive: returns (name, args_string) or nil.
local function match_directive(raw)
  return raw:match('^%s*<!%-%-%s*(/?[%w][%w%-]*)%s*:%s*(.-)%s*%-%->%s*$')
end

--- Match a bare directive (no colon): returns name or nil.
local function match_bare_directive(raw)
  return raw:match('^%s*<!%-%-%s*(/?[%w][%w%-]*)%s*%-%->%s*$')
end

-- ---------------------------------------------------------------------------
-- Block-level filter
-- ---------------------------------------------------------------------------

function RawBlock(el)
  if el.format ~= 'html' then return nil end

  local raw = el.text

  -- Try directive with arguments
  local name, args_str = match_directive(raw)
  if not name then
    -- Try bare directive
    name = match_bare_directive(raw)
    args_str = ''
  end

  if not name then return nil end
  name = name:lower()

  -- === pagebreak ===
  if name == 'pagebreak' then
    if FORMAT:match('latex') then
      return pandoc.RawBlock('latex', '\\newpage')
    elseif FORMAT:match('docx') then
      -- OOXML page break
      return pandoc.RawBlock('openxml',
        '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    end
    return pandoc.Para({})
  end

  -- === figure ===
  if name == 'figure' then
    local parts = split_pipe(args_str)
    local label   = parts[1] or ''
    local imgpath = parts[2] or ''
    local caption = parts[3] or ''
    local width   = parts[4]

    local img_attr = pandoc.Attr('fig:' .. label)
    local img = pandoc.Image(
      {pandoc.Str(caption)},
      imgpath,
      caption,
      img_attr
    )
    if width then
      img.attributes['width'] = width
    end
    return pandoc.Para({img})
  end

  -- === equation ===
  if name == 'equation' then
    local parts = split_pipe(args_str)
    local label = parts[1] or ''
    local latex = parts[2] or ''

    local math_el = pandoc.Math(pandoc.DisplayMath, latex)
    local para = pandoc.Para({math_el})
    -- Attach identifier for crossref
    if label ~= '' then
      para.attr = pandoc.Attr('eq:' .. label)
    end
    return para
  end

  -- === ref ===
  if name == 'ref' then
    local parts = split_pipe(args_str)
    local label = parts[1] or ''
    -- Emit as @fig:label / @eq:label / @tbl:label text for crossref.lua
    return pandoc.Para({pandoc.Str('@' .. label)})
  end

  -- === raw-docx / style ===
  -- These are python-docx-only; strip them in the Pandoc path
  if name == 'raw-docx' or name == '/raw-docx' or name == 'style' then
    return pandoc.Null()
  end

  -- === table / algorithm end tags ===
  if name == '/table' or name == '/algorithm' then
    return pandoc.Null()
  end

  -- === table (opening) ===
  if name == 'table' then
    -- We leave the body as-is (normal Markdown table), just add an id.
    -- crossref.lua or pandoc-crossref will handle the numbering.
    local parts = split_pipe(args_str)
    local label   = parts[1] or ''
    local caption = parts[2] or ''
    -- Return a div wrapper so the caption / label can be picked up
    -- The actual table content follows in the next blocks
    if label ~= '' or caption ~= '' then
      return pandoc.Div(
        {pandoc.Para({pandoc.Str(caption)})},
        pandoc.Attr('tbl:' .. label, {'directive-table-caption'})
      )
    end
    return pandoc.Null()
  end

  -- === algorithm (opening) ===
  if name == 'algorithm' then
    local parts = split_pipe(args_str)
    local label   = parts[1] or ''
    local caption = parts[2] or ''
    if label ~= '' or caption ~= '' then
      return pandoc.Div(
        {pandoc.Para({pandoc.Strong({pandoc.Str('Algorithm: ' .. caption)})})},
        pandoc.Attr('alg:' .. label, {'directive-algorithm-caption'})
      )
    end
    return pandoc.Null()
  end

  return nil
end
