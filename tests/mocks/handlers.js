import fs from 'fs';
import path from 'path';
import { SEARCHABLE_ITEMS } from "./searchable_items/items";

export const catalogHandler = async (route) => {
  const request = route.request();
    // 1. Handle CORS Preflights automatically
    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. Serve the local JSON files automatically
    try {
      const url = new URL(request.url());
      const subpath = url.pathname.replace('/api/stac/v1/', '') || 'catalog.json';
      const filePath = path.resolve('./tests/mocks/example_catalog/', subpath);
      
      const fileBuffer = fs.readFileSync(filePath, 'utf-8');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: fileBuffer
      });
    } catch (error) {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    }
}

export const searchRootHandler = async (route) => { 
    try {
      const filePath = path.resolve('./tests/mocks/example_catalog/catalog.json');
      const fileBuffer = fs.readFileSync(filePath, 'utf-8');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: fileBuffer
      });
    } catch (error) {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    }
}

export const searchHandler = async (route) => {
  const request = route.request();

  async function search(searchParams) {
    // perform search logic here
    
    // filter by collection
    let items = SEARCHABLE_ITEMS;
    if (searchParams.collections) {
      const collections = searchParams.collections;
      items = items.filter(item => collections.includes(item.collection));
    }

    // filter by bbox
    if (searchParams.bbox) {
      const [west, south, east, north] = searchParams.bbox
      items = items.filter(item => {
        const [itemWest, itemSouth, itemEast, itemNorth] = item.bbox;
        return !(itemEast < west || itemWest > east || itemNorth < south || itemSouth > north);
      });
    }

    // filter by intersects (TODO)

    // filter by datetime
    if (searchParams.datetime) {
      //TODO: single datetimes
      const [start, end] = searchParams.datetime.split('/');
      items = items.filter(item => {
        const itemStart = item.properties.datetime;
        return (!start || itemStart >= start) && (!end || itemStart <= end);
      });
    }

    // filter by ids
    if (searchParams.ids) {
      const ids = searchParams.ids;
      items = items.filter(item => ids.includes(item.id));
    }

    // limit results
    // TODO: improve pagination here    
    if (searchParams.limit) {
      const limit = parseInt(searchParams.limit);
      items = items.slice(0, limit);
    }

    return {
      type: "FeatureCollection",
      features: items,
      links: [],
    };
  }

  try {  
    if (request.method() === 'GET') {
      //handle GET requests
      // parse arguments
      url = URL.parse(request.url())
      const searchParams = Object.fromEntries( 
          url.search.slice(1)
            .split('&')
            .map(param => param.split('='))
        )

      // return data
      return await search(searchParams)
    }

    if (request.method() === 'POST') {
      //handle POST requests
      const searchParams = request.postDataJSON();

      // return data
      const result = await search(searchParams)
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(result)
      }); 
    }

  } catch (error) {
    //TODO: search will need more than just 404
    console.warn(error);
    await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
  }
}