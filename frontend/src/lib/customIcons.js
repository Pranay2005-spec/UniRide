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

const youAreHereIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:44px;height:44px;">
    <svg viewBox="0 0 44 44" width="44" height="44" style="position:absolute;top:0;left:0;overflow:visible;">
      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(37,99,235,0.45)" stroke-width="2">
        <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#2563EB;border:3px solid white;box-shadow:0 2px 6px rgba(37,99,235,0.6);"></div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const passengerPulseIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:48px;height:48px;">
    <svg viewBox="0 0 48 48" width="48" height="48" style="position:absolute;top:0;left:0;overflow:visible;">
      <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(249,115,22,0.5)" stroke-width="2">
        <animate attributeName="r" values="16;24;16" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:#F97316;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(249,115,22,0.5);border:2px solid white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>
  </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

export const customIcons = { riderIcon, passengerIcon, destinationIcon, youAreHereIcon, passengerPulseIcon };
