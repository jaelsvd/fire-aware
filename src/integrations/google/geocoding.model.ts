export interface GeocodingLocation {
  lat: number | string;
  lng: number | string;
}

export interface Geometry {
  location?: GeocodingLocation;
}

export interface GeocodingResult {
  geometry?: Geometry;
}

export interface GeocodingResponse {
  results?: GeocodingResult[];
  status?: string;
  [key: string]: unknown;
}
