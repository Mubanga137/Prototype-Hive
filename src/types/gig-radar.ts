export interface GigMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: "delivery" | "runner" | "hive";
  distance: number;
  eta: string;
  price: string;
  expiresAt: number;
}

export interface Location {
  lat: number;
  lng: number;
}
