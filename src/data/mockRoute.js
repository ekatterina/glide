// Route: Dam Square → Artis Royal Zoo / Artis Koninklijk Zoo
// Step notes live in src/context/LanguageContext.jsx as step_N_note keys.
// All coordinates in [lng, lat] (WGS84).

export const fullRouteCoordinates = [
  [4.8945, 52.3731], // Dam Square
  [4.8941, 52.3720],
  [4.8939, 52.3710],
  [4.8939, 52.3700], // Rokin
  [4.8942, 52.3692],
  [4.8955, 52.3683], // Muntplein
  [4.8975, 52.3683],
  [4.8995, 52.3685],
  [4.9010, 52.3687], // Waterlooplein
  [4.9025, 52.3683],
  [4.9038, 52.3679], // Mr. Visserplein
  [4.9050, 52.3672],
  [4.9065, 52.3665], // Plantage Kerklaan
  [4.9090, 52.3658],
  [4.9115, 52.3653],
  [4.9140, 52.3650], // Plantage Middenlaan
  [4.9162, 52.3648], // Artis
];

export const routeSegments = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { accessibility: 'good', color: '#2ECC71' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.8945, 52.3731],
          [4.8941, 52.3720],
          [4.8939, 52.3710],
          [4.8939, 52.3700],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { accessibility: 'good', color: '#2ECC71' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.8939, 52.3700],
          [4.8942, 52.3692],
          [4.8955, 52.3683],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { accessibility: 'moderate', color: '#F39C12' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.8955, 52.3683],
          [4.8975, 52.3683],
          [4.8995, 52.3685],
          [4.9010, 52.3687],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { accessibility: 'difficult', color: '#E74C3C' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.9010, 52.3687],
          [4.9025, 52.3683],
          [4.9038, 52.3679],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { accessibility: 'moderate', color: '#F39C12' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.9038, 52.3679],
          [4.9050, 52.3672],
          [4.9065, 52.3665],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { accessibility: 'good', color: '#2ECC71' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [4.9065, 52.3665],
          [4.9090, 52.3658],
          [4.9115, 52.3653],
          [4.9140, 52.3650],
          [4.9162, 52.3648],
        ],
      },
    },
  ],
};

export const mockRoute = {
  accessibilityScore: 87,
  estimatedTime: '23 min',
  obstaclesAvoided: 4,
  distance: '3.2 km',
  steps: [
    { id: 1, direction: 'straight', street: 'Rokin',              accessibility: 'good',     distance: '350 m', duration: '4 min' },
    { id: 2, direction: 'left',     street: 'Langebrugsteeg',     accessibility: 'moderate',  distance: '80 m',  duration: '1 min' },
    { id: 3, direction: 'right',    street: 'Grimburgwal',        accessibility: 'good',     distance: '120 m', duration: '2 min' },
    { id: 4, direction: 'straight', street: 'Waterlooplein',      accessibility: 'difficult', distance: '200 m', duration: '3 min' },
    { id: 5, direction: 'left',     street: 'Mr. Visserplein',    accessibility: 'good',     distance: '150 m', duration: '2 min' },
    { id: 6, direction: 'straight', street: 'Plantage Kerklaan',  accessibility: 'moderate',  distance: '280 m', duration: '4 min' },
    { id: 7, direction: 'right',    street: 'Plantage Middenlaan',accessibility: 'good',     distance: '600 m', duration: '7 min' },
    { id: 8, direction: 'arrive',   street: 'Artis',              accessibility: 'good',     distance: '50 m',  duration: '1 min' },
  ],
};
