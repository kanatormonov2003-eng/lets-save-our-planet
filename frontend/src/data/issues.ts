/**
 * The eight issues covered by the site.
 *
 * `art` selects the generated SVG illustration in ProblemCard.tsx, `hue` drives
 * the per-card OKLCH accent. Set `photo` to a URL if you prefer a photograph:
 * ProblemCard renders it instead of the generated artwork.
 */

export type IssueArtKey =
  | "heat"
  | "air"
  | "water"
  | "plastic"
  | "forest"
  | "species"
  | "energy"
  | "ocean";

export type IssueGroup = "Climate" | "Pollution" | "Nature" | "Solutions";

export interface Issue {
  id: string;
  title: string;
  kicker: string;
  group: IssueGroup;
  hue: number;
  art: IssueArtKey;
  photo?: string;
  headline: string;
  description: string;
  metric: { value: string; label: string; source: string };
  causes: string[];
  effects: string[];
  solutions: string[];
}

export const issues: Issue[] = [
  {
    id: "climate-change",
    title: "Climate Change",
    kicker: "01",
    group: "Climate",
    hue: 38,
    art: "heat",
    headline: "The century's baseline problem",
    description:
      "Burning coal, oil and gas has pushed atmospheric CO2 from about 280 ppm before industrialisation to roughly 424 ppm in 2024. The extra heat trapped by those gases has warmed the surface by about 1.3 C since the 1850-1900 baseline, and 2024 became the first calendar year to average more than 1.5 C above it.",
    metric: { value: "+1.55 C", label: "global average in 2024 vs 1850-1900", source: "WMO, 2025" },
    causes: [
      "Fossil fuel combustion for power, industry and transport, roughly three quarters of global emissions.",
      "Methane leaks from oil and gas systems, landfills and livestock, a gas about 80x stronger than CO2 over 20 years.",
      "Land-use change: clearing forests and draining peat releases stored carbon and removes future sinks.",
      "Cement, steel and chemicals, where the chemistry itself emits CO2 alongside the fuel.",
    ],
    effects: [
      "Heatwaves that were once-in-fifty-years events now arrive several times a decade.",
      "Sea level is rising about 4.3 mm a year and accelerating as ice sheets lose mass.",
      "Wetter storms, longer droughts and a fire season that starts earlier almost everywhere.",
      "Crop yield losses and heat stress that hit the countries with the smallest emissions first.",
    ],
    solutions: [
      "Replace fossil generation with wind, solar, hydro, geothermal and nuclear; the cheapest new power in most markets is already renewable.",
      "Electrify heating and transport, then clean the grid behind them.",
      "Plug methane leaks: the fastest available brake on near-term warming.",
      "Price carbon and end fossil subsidies, which still run near 7 trillion USD a year including implicit costs.",
    ],
  },
  {
    id: "air-pollution",
    title: "Air Pollution",
    kicker: "02",
    group: "Pollution",
    hue: 300,
    art: "air",
    headline: "The risk you breathe",
    description:
      "Fine particles smaller than 2.5 microns slip past the body's defences and into the bloodstream. Around 99% of the world's population breathes air that exceeds WHO guideline levels, and outdoor plus household air pollution is linked to roughly 7 million premature deaths a year.",
    metric: { value: "7 million", label: "premature deaths a year linked to polluted air", source: "WHO" },
    causes: [
      "Coal and diesel combustion in power plants, industry and older vehicle fleets.",
      "Household burning of wood, charcoal, dung and kerosene for cooking and heating.",
      "Agricultural ammonia and crop residue burning, which form secondary particulates.",
      "Construction dust, tyre and brake wear, which continue even as tailpipes get cleaner.",
    ],
    effects: [
      "Asthma, COPD, stroke, heart disease and lung cancer; children and older adults carry most of the burden.",
      "Measurable losses in cognitive performance and school attendance in high-exposure cities.",
      "Crop damage from ground-level ozone, cutting staple yields by several percent.",
      "Haze that reduces visibility and, in the case of black carbon, accelerates glacier melt.",
    ],
    solutions: [
      "Low-emission zones and electrified buses; cities that adopted them cut NO2 sharply within two years.",
      "Clean cooking fuels and efficient stoves, the single biggest win for household air.",
      "Filters and scrubbers on industrial stacks, enforced with real monitoring.",
      "Dense public monitoring networks so residents can see and act on local data.",
    ],
  },
  {
    id: "water-pollution",
    title: "Water Pollution",
    kicker: "03",
    group: "Pollution",
    hue: 230,
    art: "water",
    headline: "Rivers as the world's drain",
    description:
      "About 80% of the world's wastewater returns to the environment without adequate treatment. Nutrient runoff, industrial discharge and untreated sewage turn rivers into delivery systems that carry the problem downstream to lakes, deltas and coastal seas.",
    metric: { value: "~2 billion", label: "people using a drinking water source contaminated with faeces", source: "WHO/UNICEF" },
    causes: [
      "Fertiliser and manure runoff loading rivers with nitrogen and phosphorus.",
      "Untreated or partially treated municipal sewage.",
      "Industrial discharge: heavy metals, solvents, textile dyes and PFAS forever chemicals.",
      "Mining tailings and acid drainage, plus pharmaceutical residues that treatment plants were never designed to remove.",
    ],
    effects: [
      "Algal blooms that strip oxygen and create dead zones; the Gulf of Mexico zone regularly exceeds 15,000 km2.",
      "Waterborne disease, still a leading cause of child mortality in low-income regions.",
      "Bioaccumulation of mercury and PFAS up the food chain into fish people eat.",
      "Collapse of freshwater fisheries and the livelihoods built on them.",
    ],
    solutions: [
      "Treat wastewater and recover nutrients instead of discharging them.",
      "Precision fertiliser application, cover crops and restored riparian buffer strips.",
      "Hard discharge limits on PFAS and heavy metals, with public monitoring data.",
      "Constructed wetlands and daylighted urban streams as low-cost natural filtration.",
    ],
  },
  {
    id: "plastic-pollution",
    title: "Plastic Pollution",
    kicker: "04",
    group: "Pollution",
    hue: 20,
    art: "plastic",
    headline: "Built to last, designed to be thrown away",
    description:
      "The world produces well over 400 million tonnes of plastic a year and only about 9% has ever been recycled. Roughly 8-11 million tonnes reach the ocean annually, where sunlight and waves break it into microplastics rather than making it disappear.",
    metric: { value: "~9%", label: "of all plastic ever made has been recycled", source: "OECD" },
    causes: [
      "Single-use packaging designed for minutes of use and centuries of persistence.",
      "Multi-layer and mixed-polymer products that are technically unrecyclable.",
      "Waste systems that cannot keep pace with consumption, especially near rivers.",
      "Microplastic sources hiding in plain sight: synthetic textiles, tyre wear, paint.",
    ],
    effects: [
      "Entanglement and ingestion across more than 900 marine species.",
      "Microplastics found in drinking water, salt, soil, placenta and human blood.",
      "Toxic additives and adsorbed pollutants moving up the food chain.",
      "Clogged drains that worsen urban flooding and breed disease vectors.",
    ],
    solutions: [
      "Redesign packaging for reuse and single-polymer recyclability, not just thinner plastic.",
      "Extended producer responsibility so the cost of disposal sits with the manufacturer.",
      "Deposit return schemes, which lift beverage container return rates above 90% where they exist.",
      "Filters on washing machines and low-shed textiles to cut microfibre release at source.",
    ],
  },
  {
    id: "deforestation",
    title: "Deforestation",
    kicker: "05",
    group: "Nature",
    hue: 130,
    art: "forest",
    headline: "Carbon sinks becoming carbon sources",
    description:
      "Tropical primary forest loss hit a record 6.7 million hectares in 2024, an area roughly the size of Panama, with fire overtaking agriculture as the leading driver for the first time. Parts of the Amazon now release more carbon than they absorb.",
    metric: { value: "6.7 Mha", label: "of tropical primary forest lost in 2024", source: "WRI / Global Forest Watch" },
    causes: [
      "Clearing for cattle pasture, soy, palm oil and cocoa.",
      "Fire, increasingly escaping into forests weakened by drought.",
      "Illegal logging and roads that open remote frontiers to further clearing.",
      "Mining concessions and infrastructure fragmenting intact forest blocks.",
    ],
    effects: [
      "Loss of a sink that absorbs roughly a third of human CO2 emissions.",
      "Disrupted rainfall: the Amazon recycles moisture that irrigates farmland thousands of kilometres away.",
      "Habitat loss for most terrestrial species, and displacement of Indigenous communities.",
      "Soil erosion, siltation of rivers and reduced flood buffering downstream.",
    ],
    solutions: [
      "Deforestation-free supply chains with satellite verification, now legally required for several EU imports.",
      "Secure land tenure for Indigenous peoples, whose territories show the lowest loss rates.",
      "Restoration that favours natural regeneration and mixed native species over monoculture plantations.",
      "Direct payments for standing forest, so a living tree is worth more than a felled one.",
    ],
  },
  {
    id: "biodiversity-loss",
    title: "Biodiversity Loss",
    kicker: "06",
    group: "Nature",
    hue: 95,
    art: "species",
    headline: "The quiet unravelling",
    description:
      "Monitored wildlife populations have declined by an average of about 73% since 1970, and more than 47,000 assessed species are threatened with extinction. This is not only a moral loss: pollination, water purification and pest control are services ecosystems provide for free.",
    metric: { value: "-73%", label: "average decline in monitored wildlife populations since 1970", source: "WWF Living Planet Index, 2024" },
    causes: [
      "Habitat conversion for agriculture, the single largest driver.",
      "Overexploitation: overfishing, unsustainable hunting and the wildlife trade.",
      "Invasive species arriving through global trade and travel.",
      "Pesticides, light and noise pollution, and a climate shifting faster than species can move.",
    ],
    effects: [
      "Pollinator decline threatening about 75% of leading food crop types.",
      "Simplified ecosystems that recover badly from drought, fire and disease.",
      "Higher spillover risk for zoonotic disease as wild habitat is fragmented.",
      "Loss of genetic diversity that plant breeding and medicine depend on.",
    ],
    solutions: [
      "Protect and effectively manage 30% of land and sea by 2030, the target 196 countries signed in Montreal.",
      "Rewild degraded land and reconnect habitat with corridors.",
      "Shift farm subsidies from volume to biodiversity outcomes; hedgerows and field margins work.",
      "Cut pesticide load and adopt integrated pest management.",
    ],
  },
  {
    id: "renewable-energy",
    title: "Renewable Energy",
    kicker: "07",
    group: "Solutions",
    hue: 70,
    art: "energy",
    headline: "The part that is going right",
    description:
      "Renewables supplied more than 30% of global electricity for the first time in 2023, and the world added a record ~585 GW of new renewable capacity in 2024. Solar costs have fallen roughly 90% since 2010, which is why the build-out keeps beating forecasts.",
    metric: { value: "~30%", label: "of global electricity now comes from renewables", source: "IEA / Ember" },
    causes: [
      "Manufacturing scale in solar PV and batteries driving costs down a learning curve.",
      "Auctions and long-term contracts that lowered the cost of capital for clean projects.",
      "Energy security concerns after the 2022 gas price shock.",
      "Corporate procurement and national industrial policy pulling demand forward.",
    ],
    effects: [
      "Cheaper marginal electricity and less exposure to fuel price swings.",
      "Cleaner urban air where coal plants close.",
      "Grid challenges: curtailment, congestion and the need for flexibility and storage.",
      "New mineral demand for lithium, copper and nickel, with its own environmental footprint.",
    ],
    solutions: [
      "Build transmission and storage as fast as generation; the grid is now the bottleneck.",
      "Reform permitting so a wind farm takes months, not a decade.",
      "Pair renewables with demand response, heat pumps and smart EV charging.",
      "Close the loop on batteries with recycling and design for disassembly.",
    ],
  },
  {
    id: "ocean-protection",
    title: "Ocean Protection",
    kicker: "08",
    group: "Nature",
    hue: 205,
    art: "ocean",
    headline: "Seventy-one percent of the planet",
    description:
      "The ocean has absorbed more than 90% of the excess heat trapped by greenhouse gases and roughly a quarter of our CO2, at the cost of warming, acidification and deoxygenation. Only about 8% of it is protected, and far less is fully or highly protected.",
    metric: { value: "~8%", label: "of the ocean is under some form of protection", source: "Protected Planet" },
    causes: [
      "Overfishing and destructive bottom trawling that levels seafloor habitat.",
      "Heat and CO2 absorption driving marine heatwaves and falling pH.",
      "Coastal development destroying mangroves, seagrass and salt marsh.",
      "Shipping noise, oil spills and nutrient runoff from land.",
    ],
    effects: [
      "Mass coral bleaching; the event that began in 2023 affected reefs across more than 80 countries.",
      "Shellfish and plankton struggling to build shells in more acidic water.",
      "Expanding low-oxygen zones squeezing fish into thinner habitat.",
      "Food security risk for the billions of people who rely on seafood for protein.",
    ],
    solutions: [
      "Ratify and implement the High Seas Treaty to make protection possible beyond national waters.",
      "Fully protected marine reserves, which raise fish biomass inside and spill catch outside.",
      "End harmful fishing subsidies and require transparent vessel tracking.",
      "Restore blue carbon habitats: mangroves store several times more carbon per hectare than tropical forest.",
    ],
  },
];

export const issueGroups: Array<IssueGroup | "All"> = [
  "All",
  "Climate",
  "Pollution",
  "Nature",
  "Solutions",
];

export const suggestedQuestions: string[] = [
  "What actually happens to the plastic I put in the recycling bin?",
  "Is a heat pump greener than a gas boiler if my grid burns coal?",
  "Why is 1.5 C treated as a threshold, and what changes past it?",
  "Which everyday change cuts the most CO2 for one person?",
];
