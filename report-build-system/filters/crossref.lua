-- crossref.lua: Auto-numbering for figures, tables, equations + cross-references
--
-- 3パス構成:
--   1. Meta        — 言語判定（ja なら 図/表/式 プレフィックス）
--   2. 採番・登録   — Figure / Table / 数式 Para を文書順に採番しキャプションを書き換え
--   3. 参照解決     — @fig: @tbl: @eq: の Str を「図N」等に置換
-- パスを分けているため、本文より後に登場する図表への前方参照も解決できる。
--
-- pandoc 3 ではキャプション付き画像は Figure ブロックになるため、
-- 採番は Figure 単位で行う（裸の Image は採番しない）。

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

local function make_caption(inlines)
  if pandoc.Caption then
    return pandoc.Caption({pandoc.Plain(inlines)})
  end
  return {long = {pandoc.Plain(inlines)}, short = {}}
end

-- Pass 1: Read metadata for language
local function Meta(m)
  if m.lang then
    local lang = pandoc.utils.stringify(m.lang)
    if lang:sub(1,2) == "ja" then is_japanese = true end
  end
  -- LaTeX 出力では図表の採番は LaTeX 側が行う。日本語文書ではラベル名を 図/表 に差し替える
  if is_japanese and FORMAT:match('latex') then
    local renames = pandoc.MetaBlocks({pandoc.RawBlock('latex',
      '\\renewcommand{\\figurename}{図}\n\\renewcommand{\\tablename}{表}')})
    local hi = m['header-includes']
    if hi == nil then
      m['header-includes'] = renames
    else
      m['header-includes'] = pandoc.MetaList({hi, renames})
    end
  end
  return m
end

-- Pass 2 (Figure): register labels and add numbered captions
local function Figure(fig)
  fig_counter = fig_counter + 1

  -- ラベルは Figure 自身の id か、内部 Image の id から拾う
  local label = fig.attr and fig.attr.identifier or ""
  if label == "" then
    pandoc.walk_block(fig, {Image = function(img)
      if img.attr and img.attr.identifier ~= "" then
        label = img.attr.identifier
      end
      return nil
    end})
  end
  if label ~= "" then
    fig_refs[label] = fig_counter
  end

  local cap = pandoc.utils.stringify(fig.caption or "")
  cap = cap:gsub("%s*%{#[^}]+%}", "")
  -- LaTeX は figure 環境が自前で「図N:」を付けるためテキストのみにする
  if FORMAT:match('latex') then
    fig.caption = make_caption({pandoc.Str(cap)})
    return fig
  end
  local prefix = get_prefix("fig") .. tostring(fig_counter)
  if cap ~= "" then
    fig.caption = make_caption({pandoc.Str(prefix .. ": " .. cap)})
  else
    fig.caption = make_caption({pandoc.Str(prefix)})
  end
  return fig
end

-- Pass 2 (Table): register labels and add numbered captions
local function Table(tbl)
  if tbl.caption and pandoc.utils.stringify(tbl.caption) ~= "" then
    tbl_counter = tbl_counter + 1
    local cap = pandoc.utils.stringify(tbl.caption)
    -- Extract label {#tbl:xxx}
    local label = cap:match("{#([^}]+)}")
    if label then
      tbl_refs[label] = tbl_counter
      cap = cap:gsub("%s*%{#[^}]+%}", "")
      cap = cap:match("^%s*(.-)%s*$")
    end
    -- LaTeX は table 環境が自前で「表N:」を付けるためテキストのみにする
    if FORMAT:match('latex') then
      tbl.caption = make_caption({pandoc.Str(cap)})
    else
      local prefix = get_prefix("tbl") .. tostring(tbl_counter)
      tbl.caption = make_caption({pandoc.Str(prefix .. ": " .. cap)})
    end
  end
  return tbl
end

-- Pass 2 (Para): detect display math with {#eq:label}
local function Para(para)
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

-- Pass 3 (Str): resolve @fig: @tbl: @eq: references
local function Str(el)
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

-- 採番（パス2）を解決（パス3）より先に全文書へ適用することで前方参照を可能にする
return {
  {Meta = Meta},
  {Figure = Figure, Table = Table, Para = Para},
  {Str = Str},
}
