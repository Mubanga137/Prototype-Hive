import L from "leaflet";

export const createAccuracyCircle = (
  lat: number,
  lng: number,
  accuracyMeters: number,
  map: L.Map
): L.Circle => {
  const circle = L.circle([lat, lng], {
    radius: accuracyMeters,
    color: "#B37C1C",
    fillColor: "#B37C1C",
    fillOpacity: 0.08,
    weight: 1.5,
    opacity: 0.4,
    dashArray: "4, 4",
  }).addTo(map);

  return circle;
};

export const updateAccuracyCircle = (
  circle: L.Circle | null,
  lat: number,
  lng: number,
  accuracyMeters: number,
  map: L.Map
): L.Circle => {
  if (!circle) {
    return createAccuracyCircle(lat, lng, accuracyMeters, map);
  }

  circle.setLatLng([lat, lng]);
  circle.setRadius(Math.max(10, accuracyMeters));

  return circle;
};

export const removeAccuracyCircle = (circle: L.Circle | null) => {
  if (circle) {
    circle.remove();
  }
};
