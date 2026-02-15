-- layout.lua: Fenced div → LaTeX layout commands
-- Supports: two-column, three-column, landscape, pagebreak, wrap-figure, here-figure

local function has_class(classes, name)
  for _, c in ipairs(classes) do
    if c == name then return true end
  end
  return false
end

local function wrap_multicol(el, ncols)
  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("latex",
    "\\begin{multicols}{" .. tostring(ncols) .. "}"))
  for _, block in ipairs(el.content) do
    table.insert(blocks, block)
  end
  table.insert(blocks, pandoc.RawBlock("latex", "\\end{multicols}"))
  return blocks
end

local function wrap_env(el, envname)
  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("latex", "\\begin{" .. envname .. "}"))
  for _, block in ipairs(el.content) do
    table.insert(blocks, block)
  end
  table.insert(blocks, pandoc.RawBlock("latex", "\\end{" .. envname .. "}"))
  return blocks
end

local function wrap_figure(el, classes, attrs)
  local side = "r"
  if has_class(classes, "left") then
    side = "l"
  end
  local width = attrs["width"] or "0.4"
  -- Ensure width has \textwidth unit
  if not width:match("\\") then
    width = width .. "\\textwidth"
  end

  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("latex",
    "\\begin{wrapfigure}{" .. side .. "}{" .. width .. "}"))
  table.insert(blocks, pandoc.RawBlock("latex", "\\centering"))
  for _, block in ipairs(el.content) do
    table.insert(blocks, block)
  end
  table.insert(blocks, pandoc.RawBlock("latex", "\\end{wrapfigure}"))
  return blocks
end

local function here_figure(el)
  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("latex", "\\begin{figure}[H]"))
  table.insert(blocks, pandoc.RawBlock("latex", "\\centering"))
  for _, block in ipairs(el.content) do
    table.insert(blocks, block)
  end
  table.insert(blocks, pandoc.RawBlock("latex", "\\end{figure}"))
  return blocks
end

function Div(el)
  local classes = el.classes or {}

  -- Pagebreak
  if has_class(classes, "pagebreak") then
    return pandoc.RawBlock("latex", "\\newpage")
  end

  -- Multi-column
  if has_class(classes, "two-column") then
    return wrap_multicol(el, 2)
  end
  if has_class(classes, "three-column") then
    return wrap_multicol(el, 3)
  end

  -- Landscape
  if has_class(classes, "landscape") then
    return wrap_env(el, "landscape")
  end

  -- Wrap figure
  if has_class(classes, "wrap-figure") then
    return wrap_figure(el, classes, el.attributes)
  end

  -- Here figure (float=H)
  if has_class(classes, "here-figure") then
    return here_figure(el)
  end

  return el
end

return {{Div = Div}}
