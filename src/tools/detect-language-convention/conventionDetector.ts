/**
 * Convention detector for US vs UK English spelling
 * Uses pattern matching to identify spelling conventions without LLM calls
 */

// Common words that differ between US and UK English
const US_UK_WORD_PAIRS: Record<string, string> = {
  // -ize vs -ise endings
  // -ize vs -ise endings (and related forms)
  apologize: "apologise",
  apologized: "apologised",
  apologizing: "apologising",
  authorize: "authorise",
  authorized: "authorised",
  authorizing: "authorising",
  authorization: "authorisation",
  capitalize: "capitalise",
  capitalized: "capitalised",
  capitalizing: "capitalising",
  capitalization: "capitalisation",
  categorize: "categorise",
  categorized: "categorised",
  categorizing: "categorising",
  categorization: "categorisation",
  characterize: "characterise",
  characterized: "characterised",
  characterizing: "characterising",
  characterization: "characterisation",
  civilize: "civilise",
  civilized: "civilised",
  civilizing: "civilising",
  civilization: "civilisation",
  colonize: "colonise",
  colonized: "colonised",
  colonizing: "colonising",
  colonization: "colonisation",
  computerize: "computerise",
  computerized: "computerised",
  computerizing: "computerising",
  computerization: "computerisation",
  criticize: "criticise",
  criticized: "criticised",
  criticizing: "criticising",
  crystallize: "crystallise",
  crystallized: "crystallised",
  crystallizing: "crystallising",
  crystallization: "crystallisation",
  customize: "customise",
  customized: "customised",
  customizing: "customising",
  customization: "customisation",
  democratize: "democratise",
  democratized: "democratised",
  democratizing: "democratising",
  democratization: "democratisation",
  demonize: "demonise",
  demonized: "demonised",
  demonizing: "demonising",
  demoralize: "demoralise",
  demoralized: "demoralised",
  demoralizing: "demoralising",
  digitize: "digitise",
  digitized: "digitised",
  digitizing: "digitising",
  digitization: "digitisation",
  economize: "economise",
  economized: "economised",
  economizing: "economising",
  emphasize: "emphasise",
  emphasized: "emphasised",
  emphasizing: "emphasising",
  energize: "energise",
  energized: "energised",
  energizing: "energising",
  equalize: "equalise",
  equalized: "equalised",
  equalizing: "equalising",
  equalization: "equalisation",
  evangelize: "evangelise",
  evangelized: "evangelised",
  evangelizing: "evangelising",
  familiarize: "familiarise",
  familiarized: "familiarised",
  familiarizing: "familiarising",
  familiarization: "familiarisation",
  fantasize: "fantasise",
  fantasized: "fantasised",
  fantasizing: "fantasising",
  fertilize: "fertilise",
  fertilized: "fertilised",
  fertilizing: "fertilising",
  fertilization: "fertilisation",
  finalize: "finalise",
  finalized: "finalised",
  finalizing: "finalising",
  finalization: "finalisation",
  fossilize: "fossilise",
  fossilized: "fossilised",
  fossilizing: "fossilising",
  fossilization: "fossilisation",
  galvanize: "galvanise",
  galvanized: "galvanised",
  galvanizing: "galvanising",
  generalize: "generalise",
  generalized: "generalised",
  generalizing: "generalising",
  generalization: "generalisation",
  globalize: "globalise",
  globalized: "globalised",
  globalizing: "globalising",
  globalization: "globalisation",
  harmonize: "harmonise",
  harmonized: "harmonised",
  harmonizing: "harmonising",
  harmonization: "harmonisation",
  hospitalize: "hospitalise",
  hospitalized: "hospitalised",
  hospitalizing: "hospitalising",
  hospitalization: "hospitalisation",
  humanize: "humanise",
  humanized: "humanised",
  humanizing: "humanising",
  hybridize: "hybridise",
  hybridized: "hybridised",
  hybridizing: "hybridising",
  hypnotize: "hypnotise",
  hypnotized: "hypnotised",
  hypnotizing: "hypnotising",
  idealize: "idealise",
  idealized: "idealised",
  idealizing: "idealising",
  idealization: "idealisation",
  idolize: "idolise",
  idolized: "idolised",
  idolizing: "idolising",
  immobilize: "immobilise",
  immobilized: "immobilised",
  immobilizing: "immobilising",
  immobilization: "immobilisation",
  immunize: "immunise",
  immunized: "immunised",
  immunizing: "immunising",
  immunization: "immunisation",
  individualize: "individualise",
  individualized: "individualised",
  individualizing: "individualising",
  industrialize: "industrialise",
  industrialized: "industrialised",
  industrializing: "industrialising",
  industrialization: "industrialisation",
  internalize: "internalise",
  internalized: "internalised",
  internalizing: "internalising",
  internalization: "internalisation",
  ionize: "ionise",
  ionized: "ionised",
  ionizing: "ionising",
  ionization: "ionisation",
  itemize: "itemise",
  itemized: "itemised",
  itemizing: "itemising",
  jeopardize: "jeopardise",
  jeopardized: "jeopardised",
  jeopardizing: "jeopardising",
  legalize: "legalise",
  legalized: "legalised",
  legalizing: "legalising",
  legalization: "legalisation",
  legitimize: "legitimise",
  legitimized: "legitimised",
  legitimizing: "legitimising",
  liberalize: "liberalise",
  liberalized: "liberalised",
  liberalizing: "liberalising",
  liberalization: "liberalisation",
  localize: "localise",
  localized: "localised",
  localizing: "localising",
  localization: "localisation",
  magnetize: "magnetise",
  magnetized: "magnetised",
  magnetizing: "magnetising",
  marginalize: "marginalise",
  marginalized: "marginalised",
  marginalizing: "marginalising",
  marginalization: "marginalisation",
  materialize: "materialise",
  materialized: "materialised",
  materializing: "materialising",
  maximize: "maximise",
  maximized: "maximised",
  maximizing: "maximising",
  maximization: "maximisation",
  mechanize: "mechanise",
  mechanized: "mechanised",
  mechanizing: "mechanising",
  mechanization: "mechanisation",
  memorize: "memorise",
  memorized: "memorised",
  memorizing: "memorising",
  metabolize: "metabolise",
  metabolized: "metabolised",
  metabolizing: "metabolising",
  militarize: "militarise",
  militarized: "militarised",
  militarizing: "militarising",
  militarization: "militarisation",
  minimize: "minimise",
  minimized: "minimised",
  minimizing: "minimising",
  minimization: "minimisation",
  mobilize: "mobilise",
  mobilized: "mobilised",
  mobilizing: "mobilising",
  mobilization: "mobilisation",
  modernize: "modernise",
  modernized: "modernised",
  modernizing: "modernising",
  modernization: "modernisation",
  monetize: "monetise",
  monetized: "monetised",
  monetizing: "monetising",
  monetization: "monetisation",
  monopolize: "monopolise",
  monopolized: "monopolised",
  monopolizing: "monopolising",
  moralize: "moralise",
  moralized: "moralised",
  moralizing: "moralising",
  nationalize: "nationalise",
  nationalized: "nationalised",
  nationalizing: "nationalising",
  nationalization: "nationalisation",
  naturalize: "naturalise",
  naturalized: "naturalised",
  naturalizing: "naturalising",
  naturalization: "naturalisation",
  neutralize: "neutralise",
  neutralized: "neutralised",
  neutralizing: "neutralising",
  neutralization: "neutralisation",
  normalize: "normalise",
  normalized: "normalised",
  normalizing: "normalising",
  normalization: "normalisation",
  optimize: "optimise",
  optimized: "optimised",
  optimizing: "optimising",
  optimization: "optimisation",
  organize: "organise",
  organized: "organised",
  organizer: "organiser",
  organizers: "organisers",
  organizing: "organising",
  organization: "organisation",
  organizations: "organisations",
  organizational: "organisational",
  ostracize: "ostracise",
  ostracized: "ostracised",
  ostracizing: "ostracising",
  oxidize: "oxidise",
  oxidized: "oxidised",
  oxidizing: "oxidising",
  oxidization: "oxidisation",
  paralyze: "paralyse",
  paralyzed: "paralysed",
  paralyzing: "paralysing",
  pasteurize: "pasteurise",
  pasteurized: "pasteurised",
  pasteurizing: "pasteurising",
  pasteurization: "pasteurisation",
  patronize: "patronise",
  patronized: "patronised",
  patronizing: "patronising",
  penalize: "penalise",
  penalized: "penalised",
  penalizing: "penalising",
  personalize: "personalise",
  personalized: "personalised",
  personalizing: "personalising",
  personalization: "personalisation",
  philosophize: "philosophise",
  philosophized: "philosophised",
  philosophizing: "philosophising",
  plagiarize: "plagiarise",
  plagiarized: "plagiarised",
  plagiarizing: "plagiarising",
  polarize: "polarise",
  polarized: "polarised",
  polarizing: "polarising",
  polarization: "polarisation",
  popularize: "popularise",
  popularized: "popularised",
  popularizing: "popularising",
  popularization: "popularisation",
  pressurize: "pressurise",
  pressurized: "pressurised",
  pressurizing: "pressurising",
  pressurization: "pressurisation",
  prioritize: "prioritise",
  prioritized: "prioritised",
  prioritizing: "prioritising",
  prioritization: "prioritisation",
  privatize: "privatise",
  privatized: "privatised",
  privatizing: "privatising",
  privatization: "privatisation",
  publicize: "publicise",
  publicized: "publicised",
  publicizing: "publicising",
  pulverize: "pulverise",
  pulverized: "pulverised",
  pulverizing: "pulverising",
  radicalize: "radicalise",
  radicalized: "radicalised",
  radicalizing: "radicalising",
  radicalization: "radicalisation",
  randomize: "randomise",
  randomized: "randomised",
  randomizing: "randomising",
  randomization: "randomisation",
  rationalize: "rationalise",
  rationalized: "rationalised",
  rationalizing: "rationalising",
  rationalization: "rationalisation",
  realize: "realise",
  realized: "realised",
  realizing: "realising",
  realization: "realisation",
  recognize: "recognise",
  recognized: "recognised",
  recognizing: "recognising",
  recognition: "recognition", // same in both
  reorganize: "reorganise",
  reorganized: "reorganised",
  reorganizing: "reorganising",
  reorganization: "reorganisation",
  revolutionize: "revolutionise",
  revolutionized: "revolutionised",
  revolutionizing: "revolutionising",
  romanticize: "romanticise",
  romanticized: "romanticised",
  romanticizing: "romanticising",
  satirize: "satirise",
  satirized: "satirised",
  satirizing: "satirising",
  scandalize: "scandalise",
  scandalized: "scandalised",
  scandalizing: "scandalising",
  scrutinize: "scrutinise",
  scrutinized: "scrutinised",
  scrutinizing: "scrutinising",
  sensitize: "sensitise",
  sensitized: "sensitised",
  sensitizing: "sensitising",
  serialize: "serialise",
  serialized: "serialised",
  serializing: "serialising",
  serialization: "serialisation",
  socialize: "socialise",
  socialized: "socialised",
  socializing: "socialising",
  socialization: "socialisation",
  specialize: "specialise",
  specialized: "specialised",
  specializing: "specialising",
  specialization: "specialisation",
  stabilize: "stabilise",
  stabilized: "stabilised",
  stabilizing: "stabilising",
  stabilization: "stabilisation",
  standardize: "standardise",
  standardized: "standardised",
  standardizing: "standardising",
  standardization: "standardisation",
  sterilize: "sterilise",
  sterilized: "sterilised",
  sterilizing: "sterilising",
  sterilization: "sterilisation",
  stigmatize: "stigmatise",
  stigmatized: "stigmatised",
  stigmatizing: "stigmatising",
  stigmatization: "stigmatisation",
  subsidize: "subsidise",
  subsidized: "subsidised",
  subsidizing: "subsidising",
  summarize: "summarise",
  summarized: "summarised",
  summarizing: "summarising",
  summarization: "summarisation",
  symbolize: "symbolise",
  symbolized: "symbolised",
  symbolizing: "symbolising",
  sympathize: "sympathise",
  sympathized: "sympathised",
  sympathizing: "sympathising",
  sympathizer: "sympathiser",
  sympathizers: "sympathisers",
  synchronize: "synchronise",
  synchronized: "synchronised",
  synchronizing: "synchronising",
  synchronization: "synchronisation",
  synthesize: "synthesise",
  synthesized: "synthesised",
  synthesizing: "synthesising",
  systematize: "systematise",
  systematized: "systematised",
  systematizing: "systematising",
  systematization: "systematisation",
  terrorize: "terrorise",
  terrorized: "terrorised",
  terrorizing: "terrorising",
  theorize: "theorise",
  theorized: "theorised",
  theorizing: "theorising",
  traumatize: "traumatise",
  traumatized: "traumatised",
  traumatizing: "traumatising",
  trivialize: "trivialise",
  trivialized: "trivialised",
  trivializing: "trivialising",
  unionize: "unionise",
  unionized: "unionised",
  unionizing: "unionising",
  unionization: "unionisation",
  urbanize: "urbanise",
  urbanized: "urbanised",
  urbanizing: "urbanising",
  urbanization: "urbanisation",
  utilize: "utilise",
  utilized: "utilised",
  utilizing: "utilising",
  utilization: "utilisation",
  vandalize: "vandalise",
  vandalized: "vandalised",
  vandalizing: "vandalising",
  vaporize: "vaporise",
  vaporized: "vaporised",
  vaporizing: "vaporising",
  vaporization: "vaporisation",
  verbalize: "verbalise",
  verbalized: "verbalised",
  verbalizing: "verbalising",
  victimize: "victimise",
  victimized: "victimised",
  victimizing: "victimising",
  victimization: "victimisation",
  visualize: "visualise",
  visualized: "visualised",
  visualizing: "visualising",
  visualization: "visualisation",
  vocalize: "vocalise",
  vocalized: "vocalised",
  vocalizing: "vocalising",
  westernize: "westernise",
  westernized: "westernised",
  westernizing: "westernising",
  westernization: "westernisation",

  // -yze vs -yse endings
  analyze: "analyse",
  analyzed: "analysed",
  analyzer: "analyser",
  analyzers: "analysers",
  analyzing: "analysing",
  analysis: "analysis", // same in both
  analyses: "analyses", // same in both
  analyst: "analyst", // same in both
  analysts: "analysts", // same in both
  analytical: "analytical", // same in both
  breathalyze: "breathalyse",
  breathalyzed: "breathalysed",
  breathalyzer: "breathalyser",
  breathalyzers: "breathalysers",
  breathalyzing: "breathalysing",
  catalyze: "catalyse",
  catalyzed: "catalysed",
  catalyzing: "catalysing",
  electrolyze: "electrolyse",
  electrolyzed: "electrolysed",
  electrolyzing: "electrolysing",
  hydrolyze: "hydrolyse",
  hydrolyzed: "hydrolysed",
  hydrolyzing: "hydrolysing",
  psychoanalyze: "psychoanalyse",
  psychoanalyzed: "psychoanalysed",
  psychoanalyzing: "psychoanalysing",

  // -or vs -our endings
  armor: "armour",
  armored: "armoured",
  armoring: "armouring",
  behavior: "behaviour",
  behaviors: "behaviours",
  behavioral: "behavioural",
  candor: "candour",
  clamor: "clamour",
  clamored: "clamoured",
  clamoring: "clamouring",
  color: "colour",
  colors: "colours",
  colored: "coloured",
  coloring: "colouring",
  colorful: "colourful",
  colorless: "colourless",
  colorize: "colourise",
  colorized: "colourised",
  colorizing: "colourising",
  colorization: "colourisation",
  discolor: "discolour",
  discolored: "discoloured",
  discoloring: "discolouring",
  discoloration: "discolouration",
  endeavor: "endeavour",
  endeavors: "endeavours",
  endeavored: "endeavoured",
  endeavoring: "endeavouring",
  favor: "favour",
  favors: "favours",
  favored: "favoured",
  favoring: "favouring",
  favorable: "favourable",
  favorably: "favourably",
  favorite: "favourite",
  favorites: "favourites",
  favoritism: "favouritism",
  fervor: "fervour",
  flavor: "flavour",
  flavors: "flavours",
  flavored: "flavoured",
  flavoring: "flavouring",
  flavorful: "flavourful",
  flavorless: "flavourless",
  flavorsome: "flavoursome",
  glamor: "glamour",
  glamorous: "glamorous", // same in both
  harbor: "harbour",
  harbors: "harbours",
  harbored: "harboured",
  harboring: "harbouring",
  honor: "honour",
  honors: "honours",
  honored: "honoured",
  honoring: "honouring",
  honorable: "honourable",
  honorably: "honourably",
  honorary: "honorary", // same in both
  humor: "humour",
  humors: "humours",
  humored: "humoured",
  humoring: "humouring",
  humorous: "humorous", // same in both
  labor: "labour",
  labors: "labours",
  labored: "laboured",
  laboring: "labouring",
  laborious: "laborious", // same in both
  laboriously: "laboriously", // same in both
  laborer: "labourer",
  laborers: "labourers",
  neighbor: "neighbour",
  neighbors: "neighbours",
  neighbored: "neighboured",
  neighboring: "neighbouring",
  neighborly: "neighbourly",
  neighborhood: "neighbourhood",
  neighborhoods: "neighbourhoods",
  odor: "odour",
  odors: "odours",
  odorless: "odourless",
  odorous: "odorous", // same in both
  parlor: "parlour",
  parlors: "parlours",
  rancor: "rancour",
  rancorous: "rancorous", // same in both
  rigor: "rigour",
  rigors: "rigours",
  rigorous: "rigorous", // same in both
  rigorously: "rigorously", // same in both
  rumor: "rumour",
  rumors: "rumours",
  rumored: "rumoured",
  rumoring: "rumouring",
  savior: "saviour",
  saviors: "saviours",
  savor: "savour",
  savors: "savours",
  savored: "savoured",
  savoring: "savouring",
  savory: "savoury",
  splendor: "splendour",
  splendors: "splendours",
  tumor: "tumour",
  tumors: "tumours",
  tumorous: "tumorous", // same in both
  valor: "valour",
  valorous: "valorous", // same in both
  vapor: "vapour",
  vapors: "vapours",
  vaporous: "vaporous", // same in both
  vigor: "vigour",
  vigorous: "vigorous", // same in both
  vigorously: "vigorously", // same in both

  // -er vs -re endings
  caliber: "calibre",
  calibers: "calibres",
  center: "centre",
  centers: "centres",
  centered: "centred",
  centering: "centring",
  central: "central", // same in both
  centimeter: "centimetre",
  centimeters: "centimetres",
  epicenter: "epicentre",
  epicenters: "epicentres",
  fiber: "fibre",
  fibers: "fibres",
  fibrous: "fibrous", // same in both
  kilometer: "kilometre",
  kilometers: "kilometres",
  liter: "litre",
  liters: "litres",
  louver: "louvre",
  louvers: "louvres",
  louvered: "louvred",
  luster: "lustre",
  lusters: "lustres",
  lustrous: "lustrous", // same in both
  maneuver: "manoeuvre",
  maneuvers: "manoeuvres",
  maneuvered: "manoeuvred",
  maneuvering: "manoeuvring",
  maneuverable: "manoeuvrable",
  meager: "meagre",
  meter: "metre",
  meters: "metres",
  metric: "metric", // same in both
  micrometer: "micrometre",
  micrometers: "micrometres",
  milliliter: "millilitre",
  milliliters: "millilitres",
  millimeter: "millimetre",
  millimeters: "millimetres",
  miter: "mitre",
  miters: "mitres",
  mitered: "mitred",
  ocher: "ochre",
  parameter: "parameter", // same in both
  parameters: "parameters", // same in both
  reconnoiter: "reconnoitre",
  reconnoitered: "reconnoitred",
  reconnoitering: "reconnoitring",
  saber: "sabre",
  sabers: "sabres",
  scepter: "sceptre",
  scepters: "sceptres",
  sepulcher: "sepulchre",
  sepulchers: "sepulchres",
  somber: "sombre",
  specter: "spectre",
  specters: "spectres",
  theater: "theatre",
  theaters: "theatres",
  theatrical: "theatrical", // same in both

  // Single vs double L
  appall: "appal",
  appalls: "appals",
  appalled: "appalled", // same in both when past tense
  appalling: "appalling", // same in both
  canceled: "cancelled",
  canceling: "cancelling",
  cancellation: "cancellation", // same in both
  channeled: "channelled",
  channeling: "channelling",
  chiseled: "chiselled",
  chiseling: "chiselling",
  counseled: "counselled",
  counseling: "counselling",
  counselor: "counsellor",
  counselors: "counsellors",
  cruel: "cruel", // same in both
  crueler: "crueller",
  cruelest: "cruellest",
  cruelly: "cruelly", // same in both
  dialed: "dialled",
  dialing: "dialling",
  distill: "distil",
  distills: "distils",
  distilled: "distilled", // same in both
  distilling: "distilling", // same in both
  distiller: "distiller", // same in both
  distillery: "distillery", // same in both
  duel: "duel", // same in both
  dueled: "duelled",
  dueling: "duelling",
  duelist: "duellist",
  duelists: "duellists",
  enroll: "enrol",
  enrolls: "enrols",
  enrolled: "enrolled", // same in both
  enrolling: "enrolling", // same in both
  enrollment: "enrolment",
  enrollments: "enrolments",
  enthrall: "enthral",
  enthralls: "enthrals",
  enthralled: "enthralled", // same in both
  enthralling: "enthralling", // same in both
  equal: "equal", // same in both
  equaled: "equalled",
  equaling: "equalling",
  fuel: "fuel", // same in both
  fueled: "fuelled",
  fueling: "fuelling",
  fulfill: "fulfil",
  fulfills: "fulfils",
  fulfilled: "fulfilled", // same in both
  fulfilling: "fulfilling", // same in both
  fulfillment: "fulfilment",
  funneled: "funnelled",
  funneling: "funnelling",
  grueling: "gruelling",
  initial: "initial", // same in both
  initialed: "initialled",
  initialing: "initialling",
  install: "install", // same in both (but note: instalment vs installment)
  installs: "installs", // same in both
  installed: "installed", // same in both
  installing: "installing", // same in both
  installment: "instalment",
  installments: "instalments",
  instill: "instil",
  instills: "instils",
  instilled: "instilled", // same in both
  instilling: "instilling", // same in both
  jeweled: "jewelled",
  jeweler: "jeweller",
  jewelers: "jewellers",
  jewelry: "jewellery",
  label: "label", // same in both
  labeled: "labelled",
  labeling: "labelling",
  level: "level", // same in both
  leveled: "levelled",
  leveling: "levelling",
  leveler: "leveller",
  libeled: "libelled",
  libeling: "libelling",
  libelous: "libellous",
  marshal: "marshal", // same in both
  marshaled: "marshalled",
  marshaling: "marshalling",
  marvel: "marvel", // same in both
  marveled: "marvelled",
  marveling: "marvelling",
  marvelous: "marvellous",
  medal: "medal", // same in both
  medalist: "medallist",
  medalists: "medallists",
  metal: "metal", // same in both
  metaled: "metalled",
  metaling: "metalling",
  model: "model", // same in both
  modeled: "modelled",
  modeling: "modelling",
  modeler: "modeller",
  modelers: "modellers",
  panel: "panel", // same in both
  paneled: "panelled",
  paneling: "panelling",
  panelist: "panellist",
  panelists: "panellists",
  parallel: "parallel", // same in both
  paralleled: "parallelled",
  paralleling: "parallelling",
  pedal: "pedal", // same in both
  pedaled: "pedalled",
  pedaling: "pedalling",
  pencil: "pencil", // same in both
  penciled: "pencilled",
  penciling: "pencilling",
  peril: "peril", // same in both
  periled: "perilled",
  periling: "perilling",
  perilous: "perilous", // same in both
  petal: "petal", // same in both
  petaled: "petalled",
  pummel: "pummel", // same in both
  pummeled: "pummelled",
  pummeling: "pummelling",
  quarrel: "quarrel", // same in both
  quarreled: "quarrelled",
  quarreling: "quarrelling",
  quarrelsome: "quarrelsome", // same in both
  ravel: "ravel", // same in both
  raveled: "ravelled",
  raveling: "ravelling",
  rebel: "rebel", // same in both
  rebelled: "rebelled", // same in both
  rebelling: "rebelling", // same in both
  revel: "revel", // same in both
  reveled: "revelled",
  reveling: "revelling",
  reveler: "reveller",
  revelers: "revellers",
  rival: "rival", // same in both
  rivaled: "rivalled",
  rivaling: "rivalling",
  shovel: "shovel", // same in both
  shoveled: "shovelled",
  shoveling: "shovelling",
  shrivel: "shrivel", // same in both
  shriveled: "shrivelled",
  shriveling: "shrivelling",
  signal: "signal", // same in both
  signaled: "signalled",
  signaling: "signalling",
  signaler: "signaller",
  signalers: "signallers",
  skillful: "skilful",
  skillfully: "skilfully",
  snivel: "snivel", // same in both
  sniveled: "snivelled",
  sniveling: "snivelling",
  spiral: "spiral", // same in both
  spiraled: "spiralled",
  spiraling: "spiralling",
  stencil: "stencil", // same in both
  stenciled: "stencilled",
  stenciling: "stencilling",
  swivel: "swivel", // same in both
  swiveled: "swivelled",
  swiveling: "swivelling",
  total: "total", // same in both
  totaled: "totalled",
  totaling: "totalling",
  towel: "towel", // same in both
  toweled: "towelled",
  toweling: "towelling",
  trammel: "trammel", // same in both
  trammeled: "trammelled",
  trammeling: "trammelling",
  travel: "travel", // same in both
  traveled: "travelled",
  traveler: "traveller",
  travelers: "travellers",
  traveling: "travelling",
  tunnel: "tunnel", // same in both
  tunneled: "tunnelled",
  tunneling: "tunnelling",
  tunneler: "tunneller",
  unequal: "unequal", // same in both
  unequaled: "unequalled",
  unravel: "unravel", // same in both
  unraveled: "unravelled",
  unraveling: "unravelling",
  unrivaled: "unrivalled",
  willful: "wilful",
  willfully: "wilfully",
  willfulness: "wilfulness",
  woolen: "woollen",
  woolens: "woollens",

  // Other differences
  acknowledgment: "acknowledgement",
  acknowledgments: "acknowledgements",
  adapter: "adaptor",
  adapters: "adaptors",
  advisor: "adviser", // both spellings used in both, but adviser more common in UK
  advisors: "advisers",
  advisory: "advisory", // same in both
  airplane: "aeroplane",
  airplanes: "aeroplanes",
  aluminum: "aluminium",
  amid: "amidst", // both used, but amidst more common in UK
  among: "amongst", // both used, but amongst more common in UK
  anesthesia: "anaesthesia",
  anesthesiologist: "anaesthesiologist",
  anesthetic: "anaesthetic",
  anesthetics: "anaesthetics",
  anesthetist: "anaesthetist",
  anesthetize: "anaesthetise",
  anesthetized: "anaesthetised",
  analog: "analogue",
  analogs: "analogues",
  archeology: "archaeology",
  archeological: "archaeological",
  archeologist: "archaeologist",
  archeologists: "archaeologists",
  artifact: "artefact",
  artifacts: "artefacts",
  ax: "axe",
  axes: "axes", // same in both (plural)
  backward: "backwards", // both used, but backwards more common in UK
  bandana: "bandanna",
  bandanas: "bandannas",
  banister: "bannister",
  banisters: "bannisters",
  burned: "burnt", // both used in both, context dependent
  buses: "busses", // both spellings acceptable in both
  caldron: "cauldron",
  caldrons: "cauldrons",
  catalog: "catalogue",
  catalogs: "catalogues",
  cataloged: "catalogued",
  cataloging: "cataloguing",
  check: "cheque", // when referring to payment
  checks: "cheques",
  checkbook: "chequebook",
  checkbooks: "chequebooks",
  chili: "chilli",
  chilies: "chillies",
  cipher: "cypher",
  ciphers: "cyphers",
  cozy: "cosy",
  cozier: "cosier",
  coziest: "cosiest",
  cozily: "cosily",
  coziness: "cosiness",
  curb: "kerb", // when referring to edge of sidewalk
  curbs: "kerbs",
  curbside: "kerbside",
  czar: "tsar",
  czars: "tsars",
  defense: "defence",
  defenses: "defences",
  defenseless: "defenceless",
  defensive: "defensive", // same in both
  defensively: "defensively", // same in both
  dialog: "dialogue",
  dialogs: "dialogues",
  diarrhea: "diarrhoea",
  disk: "disc", // context dependent, but disc more common in UK
  disks: "discs",
  dispatch: "despatch", // dispatch common in both now
  dispatched: "despatched",
  dispatching: "despatching",
  donut: "doughnut",
  donuts: "doughnuts",
  draft: "draught", // when referring to air current or beer
  drafts: "draughts",
  drafty: "draughty",
  dreamed: "dreamt", // both used in both
  drier: "dryer", // context dependent
  encyclopedia: "encyclopaedia",
  encyclopedias: "encyclopaedias",
  encyclopedic: "encyclopaedic",
  ensure: "ensure", // same in both (but insure vs ensure is different)
  estrogen: "oestrogen",
  esthete: "aesthete",
  esthetes: "aesthetes",
  esthetic: "aesthetic",
  esthetics: "aesthetics",
  esthetically: "aesthetically",
  fetid: "foetid",
  fetus: "foetus",
  fetuses: "foetuses",
  fetal: "foetal",
  forward: "forwards", // both used, but forwards more common in UK
  gauge: "gauge", // same in both (gage is archaic)
  gauged: "gauged", // same in both
  gauging: "gauging", // same in both
  glycerin: "glycerine",
  goodbye: "goodbye", // same in both (but good-bye vs goodbye)
  gram: "gramme",
  grams: "grammes",
  gray: "grey",
  grayer: "greyer",
  grayest: "greyest",
  grayish: "greyish",
  grays: "greys",
  grayed: "greyed",
  graying: "greying",
  gynecology: "gynaecology",
  gynecological: "gynaecological",
  gynecologist: "gynaecologist",
  hemoglobin: "haemoglobin",
  hemophilia: "haemophilia",
  hemophiliac: "haemophiliac",
  hemorrhage: "haemorrhage",
  hemorrhaged: "haemorrhaged",
  hemorrhaging: "haemorrhaging",
  homeopathy: "homoeopathy",
  homeopathic: "homoeopathic",
  inquire: "enquire",
  inquired: "enquired",
  inquiring: "enquiring",
  inquiry: "enquiry",
  inquiries: "enquiries",
  inquisitive: "inquisitive", // same in both
  insure: "insure", // same meaning but ensure preferred in UK for "make certain"
  insured: "insured",
  insuring: "insuring",
  insurance: "insurance", // same in both
  jail: "gaol", // jail common in both now
  jails: "gaols",
  jailed: "gaoled",
  jailer: "gaoler",
  jailers: "gaolers",
  jailing: "gaoling",
  judgment: "judgement",
  judgments: "judgements",
  judgmental: "judgemental",
  ketchup: "ketchup", // same in both (tomato sauce in some regions)
  kidnapped: "kidnapped", // same in both
  kidnapping: "kidnapping", // same in both (but also kidknapping)
  kidnapper: "kidnapper", // same in both
  kidnapers: "kidnappers", // US sometimes single p
  kilogram: "kilogramme",
  kilograms: "kilogrammes",
  leaped: "leapt", // both used in both
  learned: "learnt", // both used in both, context dependent
  license: "licence", // US noun/verb, UK noun
  licenses: "licences", // noun
  licensed: "licensed", // verb same in both
  licensing: "licensing", // same in both
  licorice: "liquorice",
  lineup: "line-up",
  lineups: "line-ups",
  loath: "loth", // both spellings in both

  medieval: "mediaeval", // medieval common in both now
  mementos: "mementoes",

  molds: "moulds",
  molded: "moulded",
  molding: "moulding",
  moldy: "mouldy",
  molt: "moult",
  molts: "moults",
  molted: "moulted",
  molting: "moulting",
  mom: "mum",
  moms: "mums",
  mommy: "mummy",
  monolog: "monologue",
  monologs: "monologues",
  mustache: "moustache",
  mustaches: "moustaches",
  mustached: "moustached",
  naught: "nought",

  offense: "offence",
  offenses: "offences",
  offensive: "offensive", // same in both
  offensively: "offensively", // same in both
  omelet: "omelette",
  omelets: "omelettes",

  orthopedic: "orthopaedic",
  orthopedics: "orthopaedics",
  orthopedist: "orthopaedist",
  pajamas: "pyjamas",
  pajama: "pyjama",
  paleontology: "palaeontology",
  paleontologist: "palaeontologist",

  pediatric: "paediatric",
  pediatrics: "paediatrics",
  pediatrician: "paediatrician",
  pediatricians: "paediatricians",
  pedophile: "paedophile",
  pedophiles: "paedophiles",
  pedophilia: "paedophilia",
  peddler: "pedlar",
  peddlers: "pedlars",
  phony: "phoney",
  phonies: "phoneys",
  phonier: "phonier",
  phoniest: "phoniest",
  plow: "plough",
  plows: "ploughs",
  plowed: "ploughed",
  plowing: "ploughing",
  practice: "practise", // US noun/verb, UK verb
  practiced: "practised",
  practicing: "practising",
  pretense: "pretence",
  pretenses: "pretences",
  prolog: "prologue",
  prologs: "prologues",
  program: "programme", // except computer programs
  programs: "programmes",
  programmed: "programmed", // same in both
  programming: "programming", // same in both
  programmer: "programmer", // same in both
  racket: "racquet", // sports equipment
  rackets: "racquets",

  skeptic: "sceptic",
  skeptics: "sceptics",
  skeptical: "sceptical",
  skeptically: "sceptically",
  skepticism: "scepticism",
  siphon: "syphon",
  siphons: "syphons",
  siphoned: "syphoned",
  siphoning: "syphoning",
  sirup: "syrup", // syrup common in both
  smelled: "smelt", // both used in both
  smolder: "smoulder",
  smolders: "smoulders",
  smoldered: "smouldered",
  smoldering: "smouldering",
  snorkeling: "snorkelling",
  specialty: "speciality",
  specialties: "specialities",
  spelled: "spelt", // both used in both
  spilled: "spilt", // both used in both
  spoiled: "spoilt", // both used in both
  story: "storey", // when referring to building levels
  stories: "storeys",
  sulfur: "sulphur",
  sulfuric: "sulphuric",
  sulfurous: "sulphurous",

  swapped: "swopped", // swapped common in both
  swapping: "swopping",
  tidbit: "titbit",
  tidbits: "titbits",
  tire: "tyre", // wheel covering
  tires: "tyres",
  tired: "tyred",
  toward: "towards", // both used, but towards more common in UK
  tranquility: "tranquillity",
  tranquilize: "tranquilise",
  tranquilized: "tranquilised",
  tranquilizer: "tranquiliser",
  tranquilizers: "tranquilisers",
  tranquilizing: "tranquilising",
  travelogue: "travelogue", // same in both
  underway: "under way", // both used
  upward: "upwards", // both used, but upwards more common in UK
  vise: "vice", // tool
  vises: "vices",
  whiskey: "whisky", // US/Irish vs Scotch/Canadian
  whiskeys: "whiskies",
  worshiped: "worshipped",
  worshiper: "worshipper",
  worshipers: "worshippers",
  worshiping: "worshipping",
  yogurt: "yoghurt",
  yogurts: "yoghurts",
};

// Create reverse mapping for UK to US
const UK_US_WORD_PAIRS: Record<string, string> = {};
for (const [us, uk] of Object.entries(US_UK_WORD_PAIRS)) {
  UK_US_WORD_PAIRS[uk] = us;
}

// Weight multipliers for different types of differences
const PATTERN_WEIGHTS = {
  "ize/ise": 1.5, // Very strong indicator
  "or/our": 1.5, // Very strong indicator
  "er/re": 1.3, // Strong indicator
  "single/double-l": 1.2, // Good indicator
  other: 1.0, // Standard weight
};

// Word frequency multipliers (more common words count more)
const WORD_FREQUENCY_WEIGHTS: Record<string, number> = {
  // Very common words (2.0x weight)
  organize: 2.0,
  organized: 2.0,
  organizing: 2.0,
  organization: 2.0,
  organise: 2.0,
  organised: 2.0,
  organising: 2.0,
  organisation: 2.0,
  color: 2.0,
  colors: 2.0,
  colored: 2.0,
  colour: 2.0,
  colours: 2.0,
  coloured: 2.0,
  center: 1.8,
  centers: 1.8,
  centered: 1.8,
  centre: 1.8,
  centres: 1.8,
  centred: 1.8,
  realize: 1.8,
  realized: 1.8,
  realizing: 1.8,
  realise: 1.8,
  realised: 1.8,
  realising: 1.8,
  recognize: 1.6,
  recognized: 1.6,
  recognizing: 1.6,
  recognise: 1.6,
  recognised: 1.6,
  recognising: 1.6,
  analyze: 1.6,
  analyzed: 1.6,
  analyzing: 1.6,
  analysis: 1.6,
  analyse: 1.6,
  analysed: 1.6,
  analysing: 1.6,
  behavior: 1.4,
  behaviors: 1.4,
  behaviour: 1.4,
  behaviours: 1.4,
  favorite: 1.4,
  favorites: 1.4,
  favourite: 1.4,
  favourites: 1.4,
  neighbor: 1.3,
  neighbors: 1.3,
  neighborhood: 1.3,
  neighbour: 1.3,
  neighbours: 1.3,
  neighbourhood: 1.3,
  // Medium frequency (1.0-1.2x weight) - default
  // Low frequency (0.8x weight)
  harbour: 0.8,
  harbours: 0.8,
  harbor: 0.8,
  harbors: 0.8,
  plough: 0.8,
  ploughs: 0.8,
  plow: 0.8,
  plows: 0.8,
  aluminium: 0.8,
  aluminum: 0.8,
  aeroplane: 0.8,
  aeroplanes: 0.8,
  airplane: 0.8,
  airplanes: 0.8,
};

export interface ConventionDetectionResult {
  convention: "US" | "UK";
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: "US" | "UK";
    count: number;
  }>;
}

export interface DocumentTypeResult {
  type: "academic" | "technical" | "blog" | "casual" | "unknown";
  confidence: number;
}

function getPatternType(usWord: string, ukWord: string): string {
  if (usWord.includes("ize") && ukWord.includes("ise")) return "ize/ise";
  if (usWord.endsWith("or") && ukWord.endsWith("our")) return "or/our";
  if (usWord.endsWith("er") && ukWord.endsWith("re")) return "er/re";
  if (usWord.match(/l+ed|l+ing|l+er/) && ukWord.match(/ll+ed|ll+ing|ll+er/))
    return "single/double-l";
  return "other";
}

export function detectLanguageConvention(
  text: string
): ConventionDetectionResult {
  // Normalize text to lowercase for matching
  const normalizedText = text.toLowerCase();
  const words = normalizedText.match(/\b[\w']+\b/g) || [];

  const usMatches = new Map<string, number>();
  const ukMatches = new Map<string, number>();

  // Check each word against our dictionaries
  for (const word of words) {
    if (US_UK_WORD_PAIRS[word]) {
      // This is a US spelling
      usMatches.set(word, (usMatches.get(word) || 0) + 1);
    } else if (UK_US_WORD_PAIRS[word]) {
      // This is a UK spelling
      ukMatches.set(word, (ukMatches.get(word) || 0) + 1);
    }
  }

  // Calculate weighted scores
  let usScore = 0;
  let ukScore = 0;

  for (const [word, count] of usMatches) {
    const ukEquivalent = US_UK_WORD_PAIRS[word];
    const patternType = getPatternType(word, ukEquivalent);
    const patternWeight =
      PATTERN_WEIGHTS[patternType as keyof typeof PATTERN_WEIGHTS] || 1;
    const frequencyWeight = WORD_FREQUENCY_WEIGHTS[word] || 1.0;
    usScore += count * patternWeight * frequencyWeight;
  }

  for (const [word, count] of ukMatches) {
    const usEquivalent = UK_US_WORD_PAIRS[word];
    const patternType = getPatternType(usEquivalent, word);
    const patternWeight =
      PATTERN_WEIGHTS[patternType as keyof typeof PATTERN_WEIGHTS] || 1;
    const frequencyWeight = WORD_FREQUENCY_WEIGHTS[word] || 1.0;
    ukScore += count * patternWeight * frequencyWeight;
  }

  // Prepare evidence array
  const evidence: ConventionDetectionResult["evidence"] = [];

  // Add US evidence
  for (const [word, count] of usMatches) {
    evidence.push({ word, convention: "US", count });
  }

  // Add UK evidence
  for (const [word, count] of ukMatches) {
    evidence.push({ word, convention: "UK", count });
  }

  // Sort evidence by count (descending)
  evidence.sort((a, b) => b.count - a.count);

  // Calculate results
  const totalScore = usScore + ukScore;
  const totalEvidenceCount =
    Array.from(usMatches.values()).reduce((a, b) => a + b, 0) +
    Array.from(ukMatches.values()).reduce((a, b) => a + b, 0);

  let convention: "US" | "UK";
  let confidence = 0;
  let consistency = 1; // Default to fully consistent

  if (totalEvidenceCount < 3) {
    // Insufficient evidence, default to US with 0 confidence
    convention = "US";
    confidence = 0;
    consistency = 1; // No inconsistency when there's no evidence
  } else {
    // Calculate dominance
    const dominance =
      totalScore > 0 ? Math.max(usScore, ukScore) / totalScore : 0;

    if (dominance > 0.8) {
      // 80%+ one way
      convention = usScore > ukScore ? "US" : "UK";
      confidence = dominance;
      consistency = dominance; // How "pure" the usage is
    } else {
      // Mixed but we still pick the dominant one
      convention = usScore >= ukScore ? "US" : "UK";
      confidence = dominance;
      consistency = dominance; // Lower consistency for mixed usage
    }

    // Scale confidence based on amount of evidence
    // More evidence = more confident in our assessment
    const evidenceFactor = Math.min(1, totalEvidenceCount / 10);
    confidence = confidence * 0.7 + evidenceFactor * 0.3;
  }

  return {
    convention,
    confidence,
    consistency,
    evidence: evidence.slice(0, 10), // Return top 10 pieces of evidence
  };
}

export function detectDocumentType(text: string): DocumentTypeResult {
  const patterns = {
    academic: {
      indicators: [
        /\babstract\s*:/i,
        /\bintroduction\s*:/i,
        /\bmethodology\s*:/i,
        /\bliterature review\b/i,
        /\bconclusion\s*:/i,
        /\breferences\s*:/i,
        /\bfigure \d+/i,
        /\btable \d+/i,
        /\bet al\.?/i,
        /\b\(\d{4}\)/, // Year citations
        /\bthesis\b/i,
        /\bdissertation\b/i,
        /\bpeer[- ]reviewed?\b/i,
        /\bjournal\b/i,
        /\bempirical\b/i,
        /\btheoretical framework\b/i,
        /\bhypothes[ie]s\b/i,
        /\bfindings suggest\b/i,
        /\bstatistically significant\b/i,
      ],
      weight: 1.5,
    },
    technical: {
      indicators: [
        /\bAPI\b/,
        /\bSDK\b/,
        /\bdocumentation\b/i,
        /\binstallation\b/i,
        /\bconfiguration\b/i,
        /\bparameters?\b/i,
        /\bfunction\s*\(/,
        /\bclass\s+\w+/,
        /\bimport\s+/,
        /\brequire\s*\(/,
        /\bREADME\b/i,
        /\b(GET|POST|PUT|DELETE)\s+\//,
        /\bversion\s+\d+\.\d+/i,
        /\b```[\w]*\n/, // Code blocks
        /\bgit\s+(clone|pull|push|commit)\b/i,
        /\bnpm\s+(install|run)\b/i,
        /\blocalhost:\d+/,
        /\bdebugging?\b/i,
        /\bframework\b/i,
        /\blibrary\b/i,
      ],
      weight: 1.3,
    },
    blog: {
      indicators: [
        /\b(I|I've|I'm|we|we've|we're)\b/i,
        /\btoday\s+(I|we)/i,
        /\blet's\s+/i,
        /\byou'll\s+/i,
        /\bhave you ever\b/i,
        /\bcheck out\b/i,
        /\bstay tuned\b/i,
        /\btips?\s+and\s+tricks?\b/i,
        /\bhow to\b/i,
        /\btop \d+\b/i,
        /\bultimate guide\b/i,
        /\bcomments? below\b/i,
        /\bsubscribe\b/i,
        /\bshare this\b/i,
        /\bmy experience\b/i,
        /\bpersonal(ly)?\b/i,
      ],
      weight: 1.0,
    },
    casual: {
      indicators: [
        /\b(lol|omg|btw|fyi|imho|imo)\b/i,
        /\b(gonna|wanna|gotta|kinda|sorta)\b/i,
        /!{2,}/, // Multiple exclamation marks
        /\?{2,}/, // Multiple question marks
        /\.\.\./, // Ellipsis
        /\bemoji/i,
        /\b(hey|hi|hello)\s+guys\b/i,
        /\b(awesome|amazing|cool|great)\b/i,
        /\b(yeah|yep|nope|ok|okay)\b/i,
        /\bthx|thanks\b/i,
        /\bpls|please\b/i,
      ],
      weight: 0.8,
    },
  };

  const scores: Record<string, number> = {
    academic: 0,
    technical: 0,
    blog: 0,
    casual: 0,
  };

  // Calculate scores for each type
  for (const [type, config] of Object.entries(patterns)) {
    for (const pattern of config.indicators) {
      const matches = text.match(pattern);
      if (matches) {
        scores[type] += matches.length * config.weight;
      }
    }
  }

  // Find the highest scoring type
  let maxScore = 0;
  let detectedType: DocumentTypeResult["type"] = "unknown";

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as DocumentTypeResult["type"];
    }
  }

  // Calculate confidence based on score strength
  const confidence = maxScore > 0 ? Math.min(1, maxScore / 20) : 0;

  return {
    type: detectedType,
    confidence,
  };
}

export function getConventionExamples(convention: string): string[] {
  switch (convention) {
    case "US":
      return [
        "Uses -ize endings (organize, realize)",
        "Uses -or endings (color, honor)",
        "Uses -er endings (center, theater)",
        "Single L in past tense (traveled, modeled)",
      ];
    case "UK":
      return [
        "Uses -ise endings (organise, realise)",
        "Uses -our endings (colour, honour)",
        "Uses -re endings (centre, theatre)",
        "Double L in past tense (travelled, modelled)",
      ];
    default:
      return [];
  }
}
