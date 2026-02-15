-- crossref.lua: Auto-numbering for figures, tables, equations + cross-references
-- Compatible with Pandoc 2.9.x (no doc:walk)

local fig_counter = 0
local tbl_counter = 0
local eq_counter = 0
local fig_refs = {}
local tbl_refs = {}
local eq_refs = {}
local is_japanese = false

local function get_prefix(t)
  if is_japanese then
    return ({fig="図", tbl="表", eq="式"})[t] or ""
  else
    return ({fig="Figure ", tbl="Table ", eq="Equation "})[t] or ""
  end
end

-- Pass 1: Read metadata for language
function Meta(m)
  if m.lang then
    local lang = pandoc.utils.stringify(m.lang)
    if lang:sub(1,2) == "ja" then is_japanese = true end
  end
  return m
end

-- Pass 2 (Image): register labels and add numbered captions
function Image(img)
  fig_counter = fig_counter + 1
  local label = img.attr and img.attr.identifier or ""
  if label ~= "" then
    fig_refs[label] = fig_counter
  end
  -- Prepend number to caption
  local prefix = get_prefix("fig") .. tostring(fig_counter)
  if img.caption and #img.caption > 0 then
    local cap = pandoc.utils.stringify(img.caption)
    -- Remove {#...} from caption text
    cap = cap:gsub("%s*%{#[^}]+%}", "")
    img.caption = {pandoc.Str(prefix .. ": " .. cap)}
  else
    img.caption = {pandoc.Str(prefix)}
  end
  return img
end

-- Pass 2 (Table): register labels and add numbered captions
function Table(tbl)
  if tbl.caption and pandoc.utils.stringify(tbl.caption) ~= "" then
    tbl_counter = tbl_counter + 1
    local cap = pandoc.utils.stringify(tbl.caption)
    -- Extract label {#tbl:xxx}
    local label = cap:match("{#([^}]+)}")
    if label then
      tbl_refs[label] = tbl_counter
      cap = cap:gsub("%s*%{#[^}]+%}", "")
    end
    local prefix = get_prefix("tbl") .. tostring(tbl_counter)
    tbl.caption = {pandoc.Str(prefix .. ": " .. cap)}
  end
  return tbl
end

-- Pass 2 (Str): resolve @fig: @tbl: @eq: references
function Str(el)
  local text = el.text
  -- @fig:label
  local fl = text:match("@fig:([%w_%-]+)")
  if fl and fig_refs[fl] then
    return pandoc.Str(get_prefix("fig") .. tostring(fig_refs[fl]))
  end
  if fl and fig_refs["fig:" .. fl] then
    return pandoc.Str(get_prefix("fig") .. tostring(fig_refs["fig:" .. fl]))
  end
  -- @tbl:label
  local tl = text:match("@tbl:([%w_%-]+)")
  if tl and tbl_refs[tl] then
    return pandoc.Str(get_prefix("tbl") .. tostring(tbl_refs[tl]))
  end
  if tl and tbl_refs["tbl:" .. tl] then
    return pandoc.Str(get_prefix("tbl") .. tostring(tbl_refs["tbl:" .. tl]))
  end
  -- @eq:label
  local el_label = text:match("@eq:([%w_%-]+)")
  if el_label and eq_refs[el_label] then
    return pandoc.Str(get_prefix("eq") .. tostring(eq_refs[el_label]))
  end
  return el
end

-- Pass 2 (Para): detect display math with {#eq:label}
function Para(para)
  local text = pandoc.utils.stringify(para)
  local label = text:match("{#eq:([%w_%-]+)}")
  if label then
    eq_counter = eq_counter + 1
    eq_refs["eq:" .. label] = eq_counter
    eq_refs[label] = eq_counter
    -- Remove {#eq:...} from rendered output, add equation number
    local new_content = {}
    for _, inline in ipairs(para.content) do
      if inline.t == "Str" and inline.text:match("{#eq:") then
        -- skip label token
      elseif inline.t == "Math" and inline.mathtype == "DisplayMath" then
        -- Add equation number via \tag
        local numbered = inline.text .. " \\tag{" .. tostring(eq_counter) .. "}"
        table.insert(new_content, pandoc.Math("DisplayMath", numbered))
      else
        table.insert(new_content, inline)
      end
    end
    return pandoc.Para(new_content)
  end
  return para
end

-- Return as list of filter passes (Pandoc 2.9 compatible)
return {{Meta = Meta}, {Image = Image, Table = Table, Para = Para, Str = Str}}
