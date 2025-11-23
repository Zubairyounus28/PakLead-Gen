export interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: string;
  website: string;
  description: string;
  mapLink?: string; // Derived from grounding metadata if available, or generated
}

export interface SearchState {
  query: string;
  location: string;
  isCustomLocation: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}
