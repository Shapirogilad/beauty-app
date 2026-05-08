const PHOTON_URL = 'https://photon.komoot.io/api/'
const ISRAEL_BBOX = '34.2,29.5,35.9,33.4'

export interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    district?: string
    county?: string
    country?: string
    type?: string
  }
}

async function photonFetch(q: string, limit: number, tags: string[]): Promise<PhotonFeature[]> {
  const tagParams = tags.map((t) => `&osm_tag=${encodeURIComponent(t)}`).join('')
  const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${limit}&bbox=${ISRAEL_BBOX}${tagParams}`
  const res = await fetch(url, { headers: { 'User-Agent': 'DuraApp/1.0' } })
  const json = await res.json()
  return (json.features ?? []) as PhotonFeature[]
}

export async function searchCities(query: string): Promise<PhotonFeature[]> {
  return photonFetch(query, 7, [
    'place:city', 'place:town', 'place:village', 'place:municipality',
  ])
}

export async function searchStreets(query: string, city: string): Promise<PhotonFeature[]> {
  const results = await photonFetch(`${query} ${city}`, 8, ['highway'])
  // keep only results that belong to the selected city
  const cityLower = city.trim().toLowerCase()
  const filtered = results.filter((f) => {
    const p = f.properties
    const resultCity = (p.city ?? p.district ?? p.county ?? '').toLowerCase()
    return resultCity.includes(cityLower) || cityLower.includes(resultCity)
  })
  return filtered.length > 0 ? filtered : results
}

export function photonLabel(f: PhotonFeature): { main: string; sub: string } {
  const p = f.properties
  let main = ''

  if (p.housenumber && p.street) {
    main = `${p.street} ${p.housenumber}`
  } else if (p.street) {
    main = p.street
  } else if (p.name) {
    main = p.name
  }

  const sub = p.city ?? p.district ?? p.county ?? ''
  return { main: main || sub, sub: main ? sub : '' }
}

export function cityLabel(f: PhotonFeature): string {
  return f.properties.name ?? f.properties.city ?? f.properties.district ?? ''
}

export function streetLabel(f: PhotonFeature): string {
  return f.properties.name ?? f.properties.street ?? ''
}
