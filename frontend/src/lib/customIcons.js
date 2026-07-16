import L from 'leaflet';

const riderIcon = L.divIcon({
  className: '',
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(34,197,94,0.5);border:2px solid white;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#292928" stroke-width="2.5">
      <circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/>
      <path d="M10 17h4l3-7-4-2-3 4h-4"/><line x1="6" y1="11" x2="10" y2="11"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const passengerIcon = L.divIcon({
  className: '',
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#F97316;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(249,115,22,0.5);border:2px solid white;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(34,197,94,0.4);border:2px solid white;">
    <svg width="16" height="16" viewBox="0 0 200 200" fill="none">
      <rect x="25" y="75" width="150" height="105" rx="3" stroke="white" stroke-width="3" fill="rgba(255,255,255,0.2)"/>
      <polygon points="100,15 15,75 185,75" stroke="white" stroke-width="3" fill="none"/>
      <rect x="88" y="130" width="24" height="50" rx="2" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.2)"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const customIcons = { riderIcon, passengerIcon, destinationIcon };
