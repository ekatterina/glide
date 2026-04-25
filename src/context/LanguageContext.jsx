import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    // HomeScreen
    headline1: 'Your city,',
    headline2: 'your route.',
    subline: 'Accessible navigation for Amsterdam — built around you, not around cars.',
    fromLabel: 'Starting point',
    fromPlaceholder: 'From where?',
    toLabel: 'Destination',
    toPlaceholder: 'To where?',
    mobilityLabel: 'Mobility aid',
    mobilityWheelchair: 'Wheelchair',
    mobilityScooter: 'Scooter',
    mobilityWalker: 'Walker',
    avoidCyclePaths: 'Avoid busy cycle paths',
    ctaButton: 'Find accessible route',
    searching: 'Finding route…',
    errAddressNotFound: "Couldn't find that address in Amsterdam.",
    errRouting: "We couldn't plan a route between those points.",
    errNetwork: 'Network error — is the backend running?',

    // MapScreen
    backToHome: 'Back to home screen',
    demoNotice: 'Demo map — add a Mapbox token for a live map',
    legendAccessible: 'Accessible',
    legendModerate: 'Moderate',
    legendDifficult: 'Difficult',
    routeFrom: 'Dam Square',
    routeTo: 'Artis Royal Zoo',

    // RouteCard
    accessibilityStatLabel: 'Accessibility',
    accessibilityStatSuffix: '% accessible',
    accessibilityStatLiveSuffix: 'out of 100',
    timeStatLabel: 'Travel time',
    obstacleStatLabel: 'Avoided',
    obstacleStatSuffix: 'obstacles',
    warningStatLabel: 'Warnings',
    warningStatSuffix: 'on route',
    warningSingular: 'warning on route',
    warningPlural: 'warnings on route',
    layerOsm: 'OSM data',
    layerConstruction: 'Construction',
    layerReports: 'Reports',
    toggleObstructions: 'Show all obstructions',
    toggleObstructionsShort: 'Layers',
    liveRouteScorePrefix: 'Accessibility score',
    noIssuesFlagged: 'No issues flagged',
    wt_footway: 'on dedicated footway',
    wt_path: 'on path',
    wt_pedestrian: 'on pedestrian street',
    wt_street: 'on street with sidewalk',
    wt_road: 'on road shoulder',
    wt_living_street: 'on living street',
    wt_cycleway: 'on shared cycleway',
    hearRoute: 'Hear route',
    viewSteps: 'View steps',
    whyThisRouteTitle: 'Why this route?',
    whyThisRouteText:
      'This route avoids the cobblestones on Nieuwe Hoogstraat and the narrow passage near the Stopera. We chose Plantage Middenlaan for its wide, paved pavements and lowered kerbs at every crossing. The detour from the shortest route is only 4 extra minutes.',
    routeSummary:
      'Your route to Artis is 87 percent accessible. You travel via Rokin, Waterlooplein and Plantage Middenlaan. Estimated travel time: 23 minutes. 4 obstacles avoided.',
    speechLang: 'en-GB',

    // DirectionsScreen
    stepByStep: 'Step by step',
    routeFromTo: 'Dam Square → Artis Royal Zoo',
    backToMap: 'Back to map',
    nextStepAriaLabel: 'Next step',
    startNavigation: 'Start navigation',
    nextInstruction: 'Next instruction',
    arrived: 'Arrived!',
    navStartPrefix: 'Navigation started.',
    distanceLabel: 'Distance:',

    // Accessibility dot labels
    goodAccLabel: 'Well accessible',
    moderateAccLabel: 'Moderately accessible',
    difficultAccLabel: 'Difficult to navigate',

    // Step notes — keyed by step id
    step_1_note: 'Wide pavement, lowered kerb on both sides',
    step_2_note: 'Caution: narrow passage (1.2 m wide)',
    step_3_note: 'Well paved, shared cycle path available',
    step_4_note: 'Caution: cobblestones on market days (Tue–Sat)',
    step_5_note: 'Lowered kerb, wide crossing with traffic lights',
    step_6_note: 'Trees on pavement — passable but slightly narrower',
    step_7_note: 'Excellent surface, wide pavement, flat profile',
    step_8_note: 'Wheelchair-accessible entrance right of the main gate',

    // ReportScreen
    reportTitle: 'Report obstruction',
    reportPrompt: 'Take a photo of the obstruction',
    reportCaptureBtn: 'Take photo',
    reportDemoBtn: 'Skip — use demo image',
    reportAnalyzing: 'Analysing obstruction…',
    reportVerdictLabel: 'AI verdict',
    reportVerdictTitle: 'Blocked kerb cut detected',
    reportConfidenceLabel: '94% confidence',
    reportConfirm: 'Confirm & report',
    reportCancel: 'Cancel',
    reportSuccessTitle: 'Added to the map.',
    reportSuccessText: 'Thank you for making Amsterdam more accessible.',
  },

  nl: {
    // HomeScreen
    headline1: 'Jouw stad,',
    headline2: 'jouw route.',
    subline: "Toegankelijke navigatie voor Amsterdam — gebouwd om jou, niet om auto's.",
    fromLabel: 'Vertrekpunt',
    fromPlaceholder: 'Van waar?',
    toLabel: 'Bestemming',
    toPlaceholder: 'Naar waar?',
    mobilityLabel: 'Type hulpmiddel',
    mobilityWheelchair: 'Rolstoel',
    mobilityScooter: 'Scootmobiel',
    mobilityWalker: 'Loopframe',
    avoidCyclePaths: 'Vermijd drukke fietspaden',
    ctaButton: 'Zoek toegankelijke route',
    searching: 'Route zoeken…',
    errAddressNotFound: 'Adres niet gevonden in Amsterdam.',
    errRouting: 'We konden geen route plannen tussen deze punten.',
    errNetwork: 'Netwerkfout — draait de backend?',

    // MapScreen
    backToHome: 'Terug naar beginscherm',
    demoNotice: 'Demo kaart — voeg Mapbox token toe voor live kaart',
    legendAccessible: 'Toegankelijk',
    legendModerate: 'Matig',
    legendDifficult: 'Moeilijk',
    routeFrom: 'Dam Square',
    routeTo: 'Artis Koninklijk Zoo',

    // RouteCard
    accessibilityStatLabel: 'Toegankelijkheid',
    accessibilityStatSuffix: '% toegankelijk',
    accessibilityStatLiveSuffix: 'van de 100',
    timeStatLabel: 'Reistijd',
    obstacleStatLabel: 'Vermeden',
    obstacleStatSuffix: 'obstakels',
    warningStatLabel: 'Waarschuwingen',
    warningStatSuffix: 'op route',
    warningSingular: 'waarschuwing op route',
    warningPlural: 'waarschuwingen op route',
    layerOsm: 'OSM-data',
    layerConstruction: 'Werkzaamheden',
    layerReports: 'Meldingen',
    toggleObstructions: 'Toon alle obstakels',
    toggleObstructionsShort: 'Lagen',
    liveRouteScorePrefix: 'Toegankelijkheidsscore',
    noIssuesFlagged: 'Geen problemen gemeld',
    wt_footway: 'op voetpad',
    wt_path: 'op pad',
    wt_pedestrian: 'op voetgangersstraat',
    wt_street: 'op straat met stoep',
    wt_road: 'op rijbaan',
    wt_living_street: 'op woonerf',
    wt_cycleway: 'op gedeeld fietspad',
    hearRoute: 'Hoor de route',
    viewSteps: 'Bekijk stappen',
    whyThisRouteTitle: 'Waarom deze route?',
    whyThisRouteText:
      'Deze route vermijdt de keienbestrating op de Nieuwe Hoogstraat en de smalle doorgang bij de Stopera. We kozen voor de Plantage Middenlaan vanwege de brede, verharde stoepen en verlaagde stoepkanten bij elke kruising. De afwijking van de kortste route is slechts 4 minuten extra.',
    routeSummary:
      'Uw route naar Artis is 87 procent toegankelijk. U rijdt via de Rokin, Waterlooplein en Plantage Middenlaan. Verwachte reistijd: 23 minuten. Er zijn 4 obstakels vermeden.',
    speechLang: 'nl-NL',

    // DirectionsScreen
    stepByStep: 'Stap voor stap',
    routeFromTo: 'Dam Square → Artis Koninklijk Zoo',
    backToMap: 'Terug naar kaart',
    nextStepAriaLabel: 'Volgende stap',
    startNavigation: 'Start navigatie',
    nextInstruction: 'Volgende instructie',
    arrived: 'Aangekomen!',
    navStartPrefix: 'Navigatie gestart.',
    distanceLabel: 'Afstand:',

    // Accessibility dot labels
    goodAccLabel: 'Goed toegankelijk',
    moderateAccLabel: 'Matig toegankelijk',
    difficultAccLabel: 'Moeilijk toegankelijk',

    // Step notes — keyed by step id
    step_1_note: 'Brede stoep, verlaagde stoeprand aan beide zijden',
    step_2_note: 'Let op: smalle doorgang (1,2 m breed)',
    step_3_note: 'Goed verhard, fietssuggestiestrook beschikbaar',
    step_4_note: 'Let op: keienbestrating bij marktdagen (di–za)',
    step_5_note: 'Verlaagde stoeprand, brede oversteek met verkeerslichten',
    step_6_note: 'Bomen op stoep — rijdbaar maar iets smaller',
    step_7_note: 'Uitstekend verhard, brede stoep, vlak profiel',
    step_8_note: 'Rolstoeltoegankelijke ingang rechts van de hoofdpoort',

    // ReportScreen
    reportTitle: 'Obstructie melden',
    reportPrompt: 'Maak een foto van de obstructie',
    reportCaptureBtn: 'Maak foto',
    reportDemoBtn: 'Overslaan — gebruik demo-afbeelding',
    reportAnalyzing: 'Obstructie analyseren…',
    reportVerdictLabel: 'AI-oordeel',
    reportVerdictTitle: 'Afgesloten stoeprand gedetecteerd',
    reportConfidenceLabel: '94% betrouwbaar',
    reportConfirm: 'Bevestig & meld',
    reportCancel: 'Annuleer',
    reportSuccessTitle: 'Toegevoegd aan de kaart.',
    reportSuccessText: 'Bedankt voor het toegankelijker maken van Amsterdam.',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key) => translations[lang]?.[key] ?? translations.en[key] ?? key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
