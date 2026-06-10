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

--- Caption オブジェクトを構築（pandoc 3 は pandoc.Caption、旧版は素のテーブル）
local function make_caption(inlines)
  if pandoc.Caption then
    return pandoc.Caption({pandoc.Plain(inlines)})
  end
  return {long = {pandoc.Plain(inlines)}, short = {}}
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

    local img = pandoc.Image({pandoc.Str(caption)}, imgpath, caption)
    if width then
      img.attributes['width'] = width
    end
    -- pandoc 3: キャプション付き図は Figure ブロック（実装が無い旧 pandoc では Para に縮退）
    if pandoc.Figure then
      return pandoc.Figure(
        {pandoc.Plain({img})},
        make_caption({pandoc.Str(caption)}),
        pandoc.Attr('fig:' .. label)
      )
    end
    img.attr = pandoc.Attr('fig:' .. label)
    return pandoc.Para({img})
  end

  -- === equation ===
  if name == 'equation' then
    -- LaTeX 本体には |x| などのパイプが現れるため、最初の | でのみ分割する
    local label, latex = args_str:match('^%s*(.-)%s*|%s*(.*)%s*$')
    if not label then
      label = args_str:match('^%s*(.-)%s*$') or ''
      latex = ''
    end

    local math_el = pandoc.Math(pandoc.DisplayMath, latex)
    -- crossref.lua は Para 内の {#eq:label} トークンで数式ラベルを検出する。
    -- （pandoc.Para に attr は存在しないため、属性ではなくトークンで渡す）
    local inlines = {math_el}
    if label ~= '' then
      table.insert(inlines, pandoc.Str('{#eq:' .. label .. '}'))
    end
    return pandoc.Para(inlines)
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
    return {}  -- ブロック削除（pandoc 3.x で Null は廃止）
  end

  -- === algorithm end tag ===
  if name == '/algorithm' then
    return {}  -- ブロック削除
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
    return {}  -- ブロック削除（pandoc 3.x で Null は廃止）
  end

  return nil
end

-- ---------------------------------------------------------------------------
-- Inline-level filter: 文中の <!-- ref: ... --> を @label トークンに変換
-- ---------------------------------------------------------------------------

function RawInline(el)
  if el.format ~= 'html' then return nil end
  local name, args_str = match_directive(el.text)
  if not name then return nil end
  if name:lower() == 'ref' then
    local parts = split_pipe(args_str)
    local label = parts[1] or ''
    return pandoc.Str('@' .. label)
  end
  return nil
end

-- ---------------------------------------------------------------------------
-- Blocks パス: <!-- table: label | caption --> の次に来る Table 本体へ
-- キャプション + {#tbl:label} トークンを付与する（採番は crossref.lua）
-- ---------------------------------------------------------------------------

local function process_table_directives(blocks)
  local out = {}
  local pending = nil      -- { label, caption } 直後の Table へ付与
  local pending_ref = nil  -- 行頭 ref を次の Para 先頭へ結合（段落分断を防ぐ）

  local function flush_ref()
    if pending_ref then
      table.insert(out, pandoc.Para({pandoc.Str('@' .. pending_ref)}))
      pending_ref = nil
    end
  end

  for _, b in ipairs(blocks) do
    local consumed = false

    if b.t == 'RawBlock' and b.format == 'html' then
      local name, args_str = match_directive(b.text)
      if not name then
        name = match_bare_directive(b.text)
        args_str = ''
      end
      if name then
        local lname = name:lower()
        if lname == 'table' then
          flush_ref()
          local parts = split_pipe(args_str)
          pending = { label = parts[1] or '', caption = parts[2] or '' }
          consumed = true
        elseif lname == '/table' then
          flush_ref()
          pending = nil
          consumed = true
        elseif lname == 'ref' then
          flush_ref()
          local parts = split_pipe(args_str)
          pending_ref = parts[1] or ''
          consumed = true
        end
      end
    elseif b.t == 'Table' and pending then
      flush_ref()
      local cap = pending.caption
      if pending.label ~= '' then
        cap = cap .. ' {#tbl:' .. pending.label .. '}'
      end
      b.caption = make_caption({pandoc.Str(cap)})
      pending = nil
      table.insert(out, b)
      consumed = true
    elseif b.t == 'Para' and pending_ref then
      -- 直前の行頭 ref をこの段落の先頭に取り込む
      table.insert(b.content, 1, pandoc.Space())
      table.insert(b.content, 1, pandoc.Str('@' .. pending_ref))
      pending_ref = nil
      table.insert(out, b)
      consumed = true
    end

    if not consumed then
      flush_ref()
      table.insert(out, b)
    end
  end

  flush_ref()
  return out
end

-- パス1: 表ディレクティブの結合 → パス2: 単独ディレクティブ変換
return {
  { Blocks = process_table_directives },
  { RawBlock = RawBlock, RawInline = RawInline },
}
