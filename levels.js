/* levels.js ─ Level definitions, difficulty routes, terrain configs, fun facts */

const LEVELS = [
  {
    id: 0,
    name: 'LAX → SFO',
    from: { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles, CA' },
    to:   { code: 'SFO', name: 'San Francisco', city: 'San Francisco, CA' },
    totalLength: 7000,
    timeOfDay: 0.25,       // midday
    scrollSpeed: 155,
    fuelDrainRate: 3.2,
    obstacleTypes: ['birds', 'fog'],
    terrain: 'coastal',
    bgMusic: 'chill',
    funFact: 'SFO Airport was built on landfill in San Francisco Bay — it first opened in 1927!'
  },
  {
    id: 1,
    name: 'SEA → LAX',
    from: { code: 'SEA', name: 'Seattle', city: 'Seattle, WA' },
    to:   { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles, CA' },
    totalLength: 9500,
    timeOfDay: 0.12,       // early morning
    scrollSpeed: 170,
    fuelDrainRate: 3.8,
    obstacleTypes: ['birds', 'storm', 'fog'],
    terrain: 'northwest',
    bgMusic: 'chill',
    funFact: 'Seattle-Tacoma Airport (Sea-Tac) is named after the two cities it sits between!'
  },
  {
    id: 2,
    name: 'ORD → ATL',
    from: { code: 'ORD', name: 'Chicago O\'Hare', city: 'Chicago, IL' },
    to:   { code: 'ATL', name: 'Atlanta', city: 'Atlanta, GA' },
    totalLength: 11000,
    timeOfDay: 0.5,        // afternoon
    scrollSpeed: 190,
    fuelDrainRate: 4.5,
    obstacleTypes: ['birds', 'storm', 'wind', 'otherplane'],
    terrain: 'plains',
    bgMusic: 'upbeat',
    funFact: 'ATL is the world\'s busiest airport — over 100 million passengers pass through every year!'
  },
  {
    id: 3,
    name: 'ATL → JFK',
    from: { code: 'ATL', name: 'Atlanta', city: 'Atlanta, GA' },
    to:   { code: 'JFK', name: 'New York JFK', city: 'New York, NY' },
    totalLength: 13500,
    timeOfDay: 0.72,       // dusk
    scrollSpeed: 210,
    fuelDrainRate: 5.2,
    obstacleTypes: ['birds', 'storm', 'wind', 'otherplane', 'fog'],
    terrain: 'appalachian',
    bgMusic: 'upbeat',
    funFact: 'JFK Airport was originally called Idlewild Airport — it was renamed in 1963!'
  },
  {
    id: 4,
    name: 'SFO → HNL',
    from: { code: 'SFO', name: 'San Francisco', city: 'San Francisco, CA' },
    to:   { code: 'HNL', name: 'Honolulu', city: 'Honolulu, HI' },
    totalLength: 17000,
    timeOfDay: 0.88,       // dusk into night
    scrollSpeed: 230,
    fuelDrainRate: 6.0,
    obstacleTypes: ['storm', 'wind', 'otherplane', 'fog', 'birds'],
    terrain: 'ocean',
    bgMusic: 'upbeat',
    funFact: 'The flight from San Francisco to Honolulu crosses over 2,300 miles of open Pacific Ocean!'
  },
  {
    id: 5,
    name: 'JFK → LAX',
    from: { code: 'JFK', name: 'New York JFK', city: 'New York, NY' },
    to:   { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles, CA' },
    totalLength: 20000,
    timeOfDay: 1.0,        // night
    scrollSpeed: 255,
    fuelDrainRate: 7.0,
    obstacleTypes: ['birds', 'storm', 'wind', 'otherplane', 'fog'],
    terrain: 'cross',
    bgMusic: 'upbeat',
    funFact: 'A coast-to-coast flight from New York to LA takes about 5.5 hours — pilots call it "going West"!'
  }
];

// Which level indices to play for each difficulty
const ROUTES = {
  easy:   [0, 1],
  medium: [1, 2, 3],
  hard:   [2, 3, 4, 5]
};

// Terrain visual configs
const TERRAIN_CONFIGS = {
  coastal: {
    bgMtnColor:  ['#8fa8c8', '#6b8aad'],
    mgMtnColor:  ['#7a9b72', '#5e7f5c'],
    groundColor: '#c8a87a',
    groundColor2:'#b89060',
    hasOcean: true,
    oceanColor1: '#1565C0',
    oceanColor2: '#1976D2',
    hasFarmFields: false
  },
  northwest: {
    bgMtnColor:  ['#6b8a6b', '#4a6b4a'],
    mgMtnColor:  ['#3d5e3d', '#2d4a2d'],
    groundColor: '#5a7a50',
    groundColor2:'#4a6a42',
    hasSnow: true,
    hasOcean: false,
    hasFarmFields: false
  },
  plains: {
    bgMtnColor:  ['#a0a870', '#888c5a'],
    mgMtnColor:  ['#8a9060', '#707848'],
    groundColor: '#c8b468',
    groundColor2:'#b8a050',
    hasOcean: false,
    hasFarmFields: true,
    fieldColors: ['#a8c870', '#d4b84a', '#88b858', '#c8a040']
  },
  appalachian: {
    bgMtnColor:  ['#7a8a8a', '#5a6a72'],
    mgMtnColor:  ['#5a7860', '#485e50'],
    groundColor: '#8a9a70',
    groundColor2:'#788860',
    hasOcean: false,
    hasFarmFields: false
  },
  ocean: {
    bgMtnColor:  ['#1a3a6a', '#0d2850'],
    mgMtnColor:  ['#0f3060', '#0a2248'],
    groundColor: '#1565C0',
    groundColor2:'#1976D2',
    hasOcean: true,
    isDeepOcean: true,
    oceanColor1: '#0d47a1',
    oceanColor2: '#1565C0'
  },
  cross: {
    bgMtnColor:  ['#3a3a5a', '#282840'],
    mgMtnColor:  ['#2a2a48', '#1e1e38'],
    groundColor: '#1a1a2e',
    groundColor2:'#16213e',
    hasOcean: false,
    isNight: true,
    hasCityLights: true
  }
};

// Fun facts shown on cutscene screens
const FUN_FACTS = [
  { text: 'Airplanes fly because of "lift" — the curved wing shape makes air go faster on top, pulling the plane up!', icon: '✈' },
  { text: 'The world\'s longest non-stop flight is 19 hours from Singapore to New York City!', icon: '🌍' },
  { text: 'A Boeing 747 has over 6 million individual parts — that\'s a lot of puzzle pieces!', icon: '🔩' },
  { text: 'Pilots eat different meals so if one feels sick, the other is still okay to fly the plane!', icon: '🍽' },
  { text: 'The "black box" is actually orange — bright orange so rescuers can find it easily!', icon: '📦' },
  { text: 'Airplane wings can bend up to 26 feet during turbulence — they\'re designed to flex, not break!', icon: '💪' },
  { text: 'At cruising altitude you\'re flying at 35,000 feet — nearly 7 miles above the ground!', icon: '☁' },
  { text: 'The jet stream is a fast river of wind in the sky that can make east-to-west flights slower!', icon: '💨' },
  { text: 'Airplane windows are oval-shaped to prevent cracks — square corners break under pressure!', icon: '🪟' },
  { text: 'Southwest Airlines has over 700 airplanes — that\'s a whole lot of blue, red, and yellow!', icon: '💛' }
];
