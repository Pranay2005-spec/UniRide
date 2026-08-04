export function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calcDistanceKm(lat1, lng1, lat2, lng2) {
  return calcDistance(lat1, lng1, lat2, lng2) / 1000;
}

export function calcBikeFare(lat1, lng1, lat2, lng2) {
  return Math.round(calcDistanceKm(lat1, lng1, lat2, lng2) * 4 + 10);
}

export function calcRideFare(pickup, college) {
  if (!pickup?.position || college?.lat == null || college?.lng == null) return null;
  const [lat1, lng1] = pickup.position;
  return calcBikeFare(lat1, lng1, college.lat, college.lng);
}
