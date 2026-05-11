import { useState, useEffect, useCallback, useRef } from "react";
import type { GigMarker, Location } from "@/types/gig-radar";

const GIG_TYPES = ["delivery", "runner", "hive"] as const;
const GIG_TITLES = [
  "Package delivery",
  "Food pickup",
  "Document drop",
  "Express run",
  "Warehouse task",
  "Quick errand",
];

// Generate random location within radius (km) of center
function generateRandomLocation(center: Location, radiusKm: number): Location {
  const earthRadiusKm = 6371;
  const radiusRad = radiusKm / earthRadiusKm;
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusRad;

  const lat =
    Math.asin(
      Math.sin((center.lat * Math.PI) / 180) * Math.cos(distance) +
        Math.cos((center.lat * Math.PI) / 180) *
          Math.sin(distance) *
          Math.cos(angle)
    ) *
    (180 / Math.PI);

  const lng =
    ((center.lng * Math.PI) / 180 +
      Math.atan2(
        Math.sin(angle) * Math.sin(distance) * Math.cos((center.lat * Math.PI) / 180),
        Math.cos(distance) -
          Math.sin((center.lat * Math.PI) / 180) * Math.sin((lat * Math.PI) / 180)
      )) *
    (180 / Math.PI);

  return { lat, lng };
}

// Calculate distance between two points (Haversine formula)
function getDistance(p1: Location, p2: Location): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const useGigSimulation = (location: Location | null, isOnline: boolean) => {
  const [gigs, setGigs] = useState<GigMarker[]>([]);
  const gigsRef = useRef<Map<string, GigMarker>>(new Map());
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const expiryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Spawn new gigs
  const spawnGig = useCallback(() => {
    if (!location || !isOnline) return;

    // 15% chance gig is already taken (reduced from 30% for better visibility)
    if (Math.random() < 0.15) return;

    const newGig: GigMarker = {
      id: Math.random().toString(36).substr(2, 9),
      ...generateRandomLocation(location, 1 + Math.random() * 2),
      title: GIG_TITLES[Math.floor(Math.random() * GIG_TITLES.length)],
      type: GIG_TYPES[Math.floor(Math.random() * GIG_TYPES.length)],
      distance: 0,
      eta: "",
      price: `K${(20 + Math.random() * 45).toFixed(2)}`,
      expiresAt: Date.now() + (35000 + Math.random() * 55000), // 35-90 seconds (increased from 25-70)
    };

    // Calculate distance
    newGig.distance = getDistance(location, newGig);

    // Calculate ETA (5 min base + 1 min per km)
    const minutes = Math.ceil(5 + newGig.distance);
    newGig.eta = `${minutes}m`;

    gigsRef.current.set(newGig.id, newGig);
  }, [location, isOnline]);

  // Remove expired gigs
  const cleanupExpiredGigs = useCallback(() => {
    const now = Date.now();
    const toDelete: string[] = [];

    gigsRef.current.forEach((gig, id) => {
      if (now > gig.expiresAt) {
        toDelete.push(id);
      }
    });

    toDelete.forEach((id) => gigsRef.current.delete(id));

    if (toDelete.length > 0) {
      setGigs(Array.from(gigsRef.current.values()));
    }
  }, []);

  // Spawn gigs periodically
  useEffect(() => {
    if (!isOnline || !location) {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
      return;
    }

    spawnIntervalRef.current = setInterval(() => {
      spawnGig();
      setGigs(Array.from(gigsRef.current.values()));
    }, 1500); // Spawn every 1.5 seconds (more frequent)

    return () => {
      if (spawnIntervalRef.current) clearInterval(spawnIntervalRef.current);
    };
  }, [isOnline, location, spawnGig]);

  // Clean up expired gigs periodically
  useEffect(() => {
    expiryIntervalRef.current = setInterval(() => {
      cleanupExpiredGigs();
    }, 1000);

    return () => {
      if (expiryIntervalRef.current) clearInterval(expiryIntervalRef.current);
    };
  }, [cleanupExpiredGigs]);

  // Clear all gigs when going offline
  useEffect(() => {
    if (!isOnline) {
      gigsRef.current.clear();
      setGigs([]);
    }
  }, [isOnline]);

  const acceptGig = useCallback((gigId: string) => {
    const gig = gigsRef.current.get(gigId);
    if (gig) {
      console.log("Accepted gig:", gig);
      gigsRef.current.delete(gigId);
      setGigs(Array.from(gigsRef.current.values()));
    }
  }, []);

  return { gigs, acceptGig };
};
