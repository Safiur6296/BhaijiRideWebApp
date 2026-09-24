/**
 * Komoot Photon Geocoding & OSRM Routing Client
 * Exactly matches PhotonApiClient & OsrmApiClient in the Android app.
 */

const PHOTON_BASE_URL = 'https://photon.komoot.io';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Search places by query with optional bias coordinates
 */
export async function searchPlaces(query, biasLat = null, biasLng = null, limit = 6) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    let url = `${PHOTON_BASE_URL}/api/?q=${encodeURIComponent(trimmed)}&limit=${limit}&lang=en`;
    if (biasLat && biasLng) {
      url += `&lat=${biasLat}&lon=${biasLng}`;
    }

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return parsePhotonFeatures(data);
  } catch (err) {
    console.error('Photon search failed:', err);
    return [];
  }
}

/**
 * Reverse geocode GPS coordinate into readable place name
 */
export async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const url = `${PHOTON_BASE_URL}/reverse?lat=${lat}&lon=${lng}&lang=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const places = parsePhotonFeatures(data);
    return places.length > 0 ? places[0] : null;
  } catch (err) {
    console.warn('Reverse geocode error:', err);
    return {
      name: 'Current Location',
      locality: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      fullDisplayName: 'Current Location',
      lat,
      lng
    };
  }
}

function parsePhotonFeatures(root) {
  if (!root || !Array.isArray(root.features)) return [];
  const results = [];

  for (const feat of root.features) {
    if (!feat.geometry || !feat.geometry.coordinates || feat.geometry.coordinates.length < 2) continue;
    const [lng, lat] = feat.geometry.coordinates;
    const props = feat.properties || {};

    let name = props.name || '';
    if (!name) {
      const street = props.street || '';
      const housenumber = props.housenumber || '';
      if (street) {
        name = housenumber ? `${street} ${housenumber}` : street;
      } else {
        name = props.city || props.state || '';
      }
    }
    if (!name) continue;

    const localityParts = [
      props.district,
      props.city,
      props.state,
      props.country
    ].filter(Boolean).filter(part => part !== name);

    const locality = [...new Set(localityParts)].join(', ');
    const fullDisplayName = locality ? `${name}, ${locality}` : name;

    results.push({
      name,
      locality,
      fullDisplayName,
      lat,
      lng,
      osmKey: props.osm_key,
      osmValue: props.osm_value
    });
  }

  return results;
}

/**
 * Calculate driving route using OSRM
 */
export async function getRoute(startLat, startLng, destLat, destLng) {
  if (!startLat || !startLng || !destLat || !destLng) {
    throw new Error('Valid start and destination coordinates required.');
  }

  const coordinates = `${startLng.toFixed(6)},${startLat.toFixed(6)};${destLng.toFixed(6)},${destLat.toFixed(6)}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=full&geometries=polyline`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Route service busy. Please try again in a moment.');
    }
    throw new Error(`Failed to calculate route (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(data.message || 'No driving route found between these locations.');
  }

  const route = data.routes[0];
  const distanceMeters = route.distance || 0;
  const durationSeconds = route.duration || 0;
  const encodedPolyline = typeof route.geometry === 'string' ? route.geometry : '';
  const decodedPoints = decodePolyline(encodedPolyline);

  let summary = '';
  if (route.legs && route.legs.length > 0 && route.legs[0].summary) {
    summary = route.legs[0].summary;
  }

  return {
    distanceMeters,
    durationSeconds,
    distanceKm: (distanceMeters / 1000).toFixed(1),
    durationMin: Math.round(durationSeconds / 60),
    encodedPolyline,
    points: decodedPoints,
    summary
  };
}

/**
 * Decode Google Encoded Polyline algorithm (precision 5) into [[lat, lng], ...]
 */
export function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      if (index >= len) break;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      if (index >= len) break;
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Haversine formula: calculate distance in kilometers between two GPS coords
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in meters to string (e.g. "850 m" or "14.2 km")
 */
export function formatDistance(meters) {
  if (!meters || meters <= 0) return '0 km';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * Format duration in seconds to string (e.g. "45 min" or "1 hr 15 min")
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0 min';
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 60) return `${totalMins} min`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

/**
 * Calculates initial bearing in degrees (0..360) from (lat1, lon1) to (lat2, lon2)
 * Matches Android LocationUtils.calculateBearing
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/**
 * Determines whether target rider is ahead or behind current rider.
 * Matches Android LocationUtils.isRiderAhead
 */
export function isRiderAhead(myLat, myLng, myHeading, targetLat, targetLng) {
  const bearingToTarget = calculateBearing(myLat, myLng, targetLat, targetLng);
  if (myHeading !== null && myHeading !== undefined && myHeading >= 0) {
    const diff = Math.abs(((bearingToTarget - myHeading + 180) % 360) - 180);
    return diff <= 90;
  } else {
    // If user has no travel heading yet, check bearing relative to North (0-90 or 270-360)
    return (bearingToTarget >= 0 && bearingToTarget <= 90) || (bearingToTarget >= 270 && bearingToTarget <= 360);
  }
}

/**
 * Formats distance cleanly matching Android LocationUtils.formatCleanDistance:
 * e.g. "10 KM", "5 KM", "350 M"
 */
export function formatCleanDistance(meters) {
  if (!meters || meters <= 0) return '0 M';
  if (meters < 1000) {
    return `${Math.round(meters)} M`;
  } else {
    const km = meters / 1000;
    if (km >= 10 || Math.round(km * 10) % 10 === 0) {
      return `${Math.round(km)} KM`;
    } else {
      return `${km.toFixed(1)} KM`;
    }
  }
}

/**
 * Builds the exact display string requested by the user:
 * e.g., "Rahul is 10 KM ahead of You" or "Sahil is 5 KM behind you"
 * Matches Android LocationUtils.getRelativePositionDescription
 */
export function getRelativePositionDescription(riderName, distanceMeters, isAhead) {
  const cleanName = (riderName || '').trim() || 'Rider';
  const distStr = formatCleanDistance(distanceMeters);
  const dirStr = isAhead ? 'ahead of You' : 'behind you';
  return `${cleanName} is ${distStr} ${dirStr}`;
}

