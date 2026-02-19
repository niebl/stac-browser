export const HOME_PATH = process.env.CI ? '/stac-browser/' : '/';

const catalog_path = "http://localhost:8000/catalog.json"
export const CATALOG_PATH = process.env.CI ? `/stac-browser/external/${catalog_path}` : `/external/${catalog_path}`