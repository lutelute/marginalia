import { loadCatalog } from '../utils/manifest.js';

export function listTemplates() {
  const catalog = loadCatalog();
  return Object.entries(catalog).map(([name, entry]) => ({
    name,
    description: entry.description,
    type: entry.type,
    features: entry.features || [],
    formats: entry.bundle
      ? Object.entries(entry.bundle).flatMap(([engine, formats]) =>
          Object.keys(formats).map(fmt => `${fmt} (${engine})`)
        )
      : [],
  }));
}
