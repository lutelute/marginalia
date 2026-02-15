-- metadata-defaults.lua
-- Sets safe default metadata values for Pandoc documents
-- NOTE: Does NOT set geometry - templates handle their own defaults

function Meta(m)
  if not m.documentclass then
    m.documentclass = 'article'
  end
  if not m.fontsize then
    m.fontsize = '10pt'
  end
  -- Do NOT set geometry, papersize, or lang here
  -- These are handled by the LaTeX templates themselves
  return m
end
