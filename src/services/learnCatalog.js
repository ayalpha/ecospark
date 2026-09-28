// src/services/learnCatalog.js
// Curated course catalog for the Learn Hub. Static, AAA-quality content —
// the catalog is the ground truth the AI agent recommends from (it is never
// allowed to invent courses that aren't here).

export const COURSES = [
  {
    id: 'climate-basics',
    title: 'Climate Change: The Defining Challenge',
    tagline: 'Understand the greenhouse effect, carbon budgets and why every tenth of a degree matters.',
    level: 'Beginner',
    minutes: 18,
    accent: '#22D3EE',
    icon: 'climate',
    lessons: [
      {
        id: 'cl-1',
        title: 'The Greenhouse Effect, Explained',
        minutes: 5,
        sections: [
          { h: 'A blanket made of gas', p: 'Earth receives energy from the sun as visible light and re-emits it as infrared heat. Greenhouse gases — carbon dioxide, methane, nitrous oxide and water vapour — absorb part of that outgoing heat and re-radiate it back down. Without this natural effect the planet would average about −18°C instead of +15°C. The blanket itself is not the problem; the problem is thickness. Since the industrial revolution we have thickened it by burning fossil fuels, cutting forests and industrialising agriculture.' },
          { h: 'Why CO₂ is the thermostat', p: 'CO₂ is long-lived: about 20–40% of any tonne emitted today stays in the atmosphere for centuries. Concentration has risen from ~280 ppm pre-industrial to over 420 ppm today — higher than any point in at least 800,000 years of ice-core records. Every tonne matters because the atmosphere mixes globally: a tonne saved in Delhi has the same effect as a tonne saved in Detroit.' },
          { h: 'Feedback loops', p: 'Warming triggers amplifiers. Melting sea ice exposes darker ocean that absorbs more sunlight. Thawing permafrost releases methane. Warmer air holds more water vapour — itself a greenhouse gas. These feedbacks are why scientists emphasise rapid early cuts: they reduce the chance of triggering loops we cannot switch off.' },
        ],
        keyFacts: [
          'Without greenhouse gases Earth would average about −18°C.',
          'Atmospheric CO₂ is now above 420 ppm — the highest in 800,000+ years.',
          '20–40% of emitted CO₂ remains airborne for centuries.',
        ],
      },
      {
        id: 'cl-2',
        title: 'Carbon Budgets and the 1.5°C Line',
        minutes: 6,
        sections: [
          { h: 'A bank account of emissions', p: 'For every level of warming there is a finite carbon budget — the total CO₂ humanity can still emit while keeping warming under that level. At current emission rates, the budget for 1.5°C is measured in single-digit years of global emissions. Budgets work like a bank account: deposits (emissions) must eventually reach zero (net zero), not merely slow down.' },
          { h: 'Why 0.1°C matters', p: 'Impacts scale roughly with every additional tenth of a degree. The difference between 1.5°C and 2°C is projected to include: twice as many people exposed to severe heatwaves, near-total loss of the world\'s coral reefs versus ~70–90%, and significantly larger agricultural yield losses in the tropics. Tipping elements — ice sheets, permafrost, ocean currents — become progressively riskier.' },
          { h: 'Net zero is not zero emissions', p: 'Net zero means remaining emissions are balanced by removals — forests, soils, and eventually engineered capture. Individual and household action matters in two ways: it cuts the front of the pipeline directly, and it shifts the social and economic norms that decide what 8 billion people consider normal.' },
        ],
        keyFacts: [
          'The 1.5°C carbon budget at current rates is measured in single-digit years.',
          '1.5°C vs 2°C roughly doubles heatwave exposure for many regions.',
          'Net zero = remaining emissions balanced by removals, not zero activity.',
        ],
      },
      {
        id: 'cl-3',
        title: 'Where India Stands',
        minutes: 5,
        sections: [
          { h: 'High stakes, high ambition', p: 'India is among the most climate-vulnerable large economies — Himalayan glacial melt, monsoon disruption, coastal sea-level rise threatening Mumbai, Chennai and Kolkata. It is also the world\'s third-largest emitter in total, though per-capita emissions remain far below the global average.' },
          { h: 'The 2070 pledge', p: 'India has committed to net zero by 2070, with 500 GW of non-fossil capacity by 2030, 50% of energy from renewables, and a 45% emissions-intensity reduction from 2005 levels. Solar capacity has grown more than twenty-fold since 2015 — among the fastest transitions anywhere.' },
          { h: 'What it means for you', p: 'Grid decarbonisation means every unit of electricity you save gets cleaner over time. Transport, cooling and food are the three biggest personal levers in an Indian context — and all three are covered in the other courses.' },
        ],
        keyFacts: [
          'India targets 500 GW non-fossil capacity by 2030.',
          'India\'s solar capacity has grown 20×+ since 2015.',
          'Per-capita emissions in India remain well below the world average.',
        ],
      },
    ],
    quiz: [
      { q: 'Without any greenhouse effect, Earth\'s average temperature would be closest to…', options: ['−18°C', '0°C', '+5°C', '+15°C'], answer: 0, explain: 'The natural greenhouse effect warms the surface from about −18°C to +15°C.' },
      { q: 'What fraction of a tonne of emitted CO₂ typically stays airborne for centuries?', options: ['About 2%', 'About 20–40%', 'About 60%', '100%'], answer: 1, explain: 'Roughly a fifth to two-fifths persists for centuries — which is why cumulative emissions set the warming.' },
      { q: 'Net zero means…', options: ['No energy use', 'Emissions balanced by removals', 'Only solar power', 'Stopping all transport'], answer: 1, explain: 'Residual emissions are balanced by removals from forests, soils and eventually engineered capture.' },
      { q: 'India\'s renewable energy pledge for 2030 is…', options: ['100 GW non-fossil', '250 GW non-fossil', '500 GW non-fossil', '1000 GW non-fossil'], answer: 2, explain: 'The 2030 target is 500 GW of non-fossil capacity alongside a 45% emissions-intensity cut from 2005.' },
    ],
  },
  {
    id: 'waste-smart',
    title: 'Waste: The Circular Fix',
    tagline: 'The 7 R\'s, what actually gets recycled, and how to cut your bin by half.',
    level: 'Beginner',
    minutes: 16,
    accent: '#FBBF24',
    icon: 'waste',
    lessons: [
      {
        id: 'wa-1',
        title: 'The 7 R\'s in Order of Impact',
        minutes: 5,
        sections: [
          { h: 'Refuse, reduce, then recycle', p: 'Recycling gets the publicity but sits third. Refusing single-use items and reducing consumption at the source avoids the energy, water and emissions of production entirely. Reuse comes next — rehoming items extends their life at zero cost. Repair keeps products working. Rot (composting) returns nutrients. Then, finally, recycle — and only as a last resort, reject.' },
          { h: 'What the recycling symbol does NOT tell you', p: 'The triangle with a number is a resin identification code, not a recycling guarantee. Whether an item is actually recycled depends on your local facility. In much of India, the informal sector recovers plastics with real market value (PET, HDPE), while multi-layer laminates — chip packets, tetra packs — are almost never economically recyclable. Reducing those laminates is worth more than any bin discipline.' },
          { h: 'The composting superpower', p: 'Organic waste is roughly half of Indian municipal waste by weight. In landfills it generates methane, a greenhouse gas ~80× more potent than CO₂ over 20 years. Composting even a portion of kitchen waste — a balcony bin works — eliminates those emissions and produces free soil.' },
        ],
        keyFacts: [
          'Refusing and reducing beat recycling — they avoid production emissions entirely.',
          'Multi-layer plastic laminates are effectively non-recyclable.',
          'Organic waste in landfills produces methane, ~80× stronger than CO₂ over 20 years.',
        ],
      },
      {
        id: 'wa-2',
        title: 'E-Waste: The Fastest-Growing Stream',
        minutes: 5,
        sections: [
          { h: 'A tonne of gold in your drawer', p: 'E-waste is the world\'s fastest-growing waste stream, and India is among its top generators. A tonne of discarded phones contains more gold than a tonne of gold ore. Old chargers, cables, batteries and dead earphones contain copper, lithium and rare earths worth recovering — and toxins like lead and mercury worth keeping out of soil.' },
          { h: 'The right way to dispose', p: 'Never bin batteries — they cause landfill fires. Use authorised e-waste recyclers or brand take-back programmes; CPCB-registered recyclers are listed online. Extend life first: a case, a battery replacement and a factory reset before reselling can double a device\'s working years.' },
        ],
        keyFacts: [
          'E-waste is the fastest-growing waste stream globally.',
          'A tonne of phones holds more gold than a tonne of gold ore.',
          'Batteries in general waste are a leading cause of landfill fires.',
        ],
      },
    ],
    quiz: [
      { q: 'Which action has the biggest impact on waste?', options: ['Recycling more', 'Refusing and reducing at the source', 'Composting', 'Buying biodegradable plastic'], answer: 1, explain: 'Avoiding production in the first place beats any downstream recovery.' },
      { q: 'The number inside the recycling triangle tells you…', options: ['It is definitely recyclable', 'How toxic it is', 'The plastic resin type', 'How many times it can be recycled'], answer: 2, explain: 'It identifies the resin; actual recyclability depends on local facilities.' },
      { q: 'Organic waste in landfills mainly produces…', options: ['CO₂', 'Methane', 'Ozone', 'Nitrogen'], answer: 1, explain: 'Anaerobic breakdown releases methane, ~80× stronger than CO₂ over 20 years.' },
      { q: 'The best first step for an old phone is…', options: ['Bin it', 'Extend its life, then use authorised e-waste recycling', 'Burn it', 'Bury it'], answer: 1, explain: 'Life extension first; then CPCB-registered recyclers recover metals safely.' },
    ],
  },
  {
    id: 'water-wise',
    title: 'Water: Every Drop Counts',
    tagline: 'Virtual water, the leaking city, and how 20 litres a day adds up.',
    level: 'Beginner',
    minutes: 15,
    accent: '#38BDF8',
    icon: 'water',
    lessons: [
      {
        id: 'wt-1',
        title: 'Virtual Water: The Hidden Number',
        minutes: 5,
        sections: [
          { h: 'Your biggest water footprint is invisible', p: 'A 5-minute shower uses ~50 litres — but the real story is virtual water: the water embedded in products. One cotton t-shirt: ~2,500 litres. One kilogram of rice: ~2,500–5,000 litres. One kilogram of beef: ~15,000 litres. Dietary and purchase choices dwarf plumbing fixes, though both matter.' },
          { h: 'India\'s water stress', p: 'India holds ~4% of the world\'s freshwater but ~18% of its population. Groundwater — which supplies the majority of irrigation and urban use — is being extracted faster than it recharges across large parts of the northwest. NITI Aayog has warned that 21 major cities could run out of groundwater by 2030 without intervention.' },
          { h: 'Fix the leaks first', p: 'A single tap dripping once per second wastes ~11,000 litres per year. A running hose while washing a car uses ~200 litres versus ~20 with a bucket. These are one-hour fixes with year-long payoffs.' },
        ],
        keyFacts: [
          'One cotton t-shirt embodies ~2,500 litres of virtual water.',
          'India holds 4% of global freshwater for 18% of the population.',
          'A dripping tap can waste ~11,000 litres a year.',
        ],
      },
    ],
    quiz: [
      { q: 'The largest share of a person\'s water footprint usually comes from…', options: ['Showers', 'Food and products (virtual water)', 'Drinking water', 'Car washing'], answer: 1, explain: 'Virtual water embedded in food and goods dwarfs direct household use.' },
      { q: 'India holds roughly what share of global freshwater?', options: ['4%', '12%', '18%', '25%'], answer: 0, explain: 'About 4% of freshwater serving 18% of the world\'s population.' },
      { q: 'A tap dripping once per second wastes roughly…', options: ['110 litres/year', '1,100 litres/year', '11,000 litres/year', '110,000 litres/year'], answer: 2, explain: 'About 11,000 litres a year from a single slow drip.' },
    ],
  },
  {
    id: 'energy-switch',
    title: 'Energy: Powering the Switch',
    tagline: 'Where your electricity comes from, and the five upgrades that pay for themselves.',
    level: 'Intermediate',
    minutes: 17,
    accent: '#FBBF24',
    icon: 'energy',
    lessons: [
      {
        id: 'en-1',
        title: 'Your Outlet Is a Climate Decision',
        minutes: 6,
        sections: [
          { h: 'The grid mix matters', p: 'India\'s grid is roughly 70% fossil today and falling. Every kilowatt-hour you avoid is roughly 0.7–0.8 kg of CO₂ avoided at current mix — and that factor improves every year as solar and wind grow, making efficiency a compounding investment.' },
          { h: 'Standby power: the silent 10%', p: 'Devices on standby — TVs, set-top boxes, chargers, microwaves with clocks — can draw 5–10% of household electricity, 24/7. Switching off at the socket, or using smart strips, is the single cheapest kilowatt-hour you will ever save.' },
          { h: 'The five upgrades that pay', p: '1) LED bulbs: 80–90% less than incandescent, payback in months. 2) 5-star inverter appliances at replacement time. 3) Fans first, AC second — and set AC to 26°C: each degree lower adds ~6% to consumption. 4) Rooftop solar where feasible — India\'s subsidy schemes shorten payback to 3–5 years. 5) Heat-pump water heaters where budget allows.' },
        ],
        keyFacts: [
          'Each avoided kWh currently avoids ~0.7–0.8 kg of CO₂.',
          'Standby power can be 5–10% of household consumption.',
          'Every degree of AC setpoint below 26°C adds ~6% to its load.',
        ],
      },
    ],
    quiz: [
      { q: 'One avoided kilowatt-hour on today\'s Indian grid avoids roughly…', options: ['0.08 kg CO₂', '0.8 kg CO₂', '8 kg CO₂', '80 kg CO₂'], answer: 1, explain: 'The grid emission factor is about 0.7–0.8 kg CO₂ per kWh and falls as renewables grow.' },
      { q: 'Standby ("vampire") power is typically what share of home electricity?', options: ['Under 1%', '5–10%', '25%', '50%'], answer: 1, explain: 'Always-on electronics quietly draw 5–10%, around the clock.' },
      { q: 'Each degree you set your AC below 26°C adds roughly…', options: ['1% to consumption', '6% to consumption', '20% to consumption', 'nothing'], answer: 1, explain: 'About 6% per degree — set it to 26°C and use a fan to circulate air.' },
    ],
  },
  {
    id: 'biodiversity-now',
    title: 'Biodiversity: The Web That Holds',
    tagline: 'Pollinators, forests, and why the sixth extinction is the quiet one.',
    level: 'Intermediate',
    minutes: 16,
    accent: '#34D399',
    icon: 'nature',
    lessons: [
      {
        id: 'bd-1',
        title: 'The Pollination Economy',
        minutes: 5,
        sections: [
          { h: 'One in three bites', p: 'About 75% of food crops depend at least partly on pollinators — bees, butterflies, birds, bats. Pollinator decline, driven by pesticides, habitat loss and monocultures, is a direct threat to food security, not just to nature documentaries.' },
          { h: 'Your balcony is habitat', p: 'Native flowering plants, a shallow water dish, and avoiding chemical pesticides turn even a small balcony into a pollinator pit-stop. Native species matter: exotic ornamentals often provide no nectar at the right season.' },
          { h: 'Forests as infrastructure', p: 'Forests are not just carbon stores; they regulate rainfall, hold soil, and host 80% of terrestrial biodiversity. India\'s Forest Survey reports forest and tree cover at about a quarter of geographic area — and monoculture plantations count in that number while supporting far less life than natural forests. Planting native species is what restores ecosystems.' },
        ],
        keyFacts: [
          '75% of food crops depend at least partly on pollinators.',
          'Forests host 80% of terrestrial biodiversity.',
          'Native plants support pollinators; exotic ornamentals often do not.',
        ],
      },
    ],
    quiz: [
      { q: 'Roughly what share of food crops depends on pollinators?', options: ['15%', '35%', '75%', '95%'], answer: 2, explain: 'About three-quarters of leading food crops rely at least partly on animal pollination.' },
      { q: 'The best trees to plant for biodiversity are…', options: ['Fastest growing', 'Native species', 'Always fruit trees', 'Evergreens'], answer: 1, explain: 'Native species support local food webs; exotics often function as green deserts.' },
      { q: 'What share of terrestrial biodiversity do forests host?', options: ['20%', '40%', '60%', '80%'], answer: 3, explain: 'Around 80% of terrestrial species live in forests.' },
    ],
  },
  {
    id: 'sustainable-life',
    title: 'Sustainable Living: The 30-Day Rewire',
    tagline: 'Food, fashion, transport and spending — the four levers of a lighter life.',
    level: 'Intermediate',
    minutes: 18,
    accent: '#A78BFA',
    icon: 'leaf',
    lessons: [
      {
        id: 'sl-1',
        title: 'Food: The Plate Is the Pivot',
        minutes: 6,
        sections: [
          { h: 'The most powerful daily choice', p: 'Food is typically 25–30% of a household footprint. You do not need to become vegetarian: shifting from beef/lamb to poultry cuts that meal\'s footprint ~5×; shifting even one or two meat days per week to plant-based cuts a household food footprint meaningfully. Wasted food is the multiplier nobody talks about — if food waste were a country it would be the third-largest emitter.' },
          { h: 'Eat local, eat seasonal', p: 'Transport is a small slice of food emissions; production method is the big one. But out-of-season produce often arrives via energy-hungry greenhouses or cold chains, and seasonal Indian produce is cheaper and fresher anyway. The Millets revival adds a nutrition angle — millets need a fraction of the water rice does.' },
        ],
        keyFacts: [
          'Food is typically 25–30% of a household footprint.',
          'If food waste were a country it would be the third-largest emitter.',
          'Millets need a fraction of the water that rice requires.',
        ],
      },
      {
        id: 'sl-2',
        title: 'Fashion and Stuff',
        minutes: 6,
        sections: [
          { h: 'The second-hand superpower', p: 'Fashion is responsible for up to 10% of global emissions — more than international flights and shipping combined. The single most sustainable garment is the one already in existence. Buying even a quarter of your clothes second-hand or swapping cuts fashion impact dramatically, at a fraction of the price.' },
          { h: 'Quality as a strategy', p: 'A ₹2,000 shirt worn 100 times costs ₹20 per wear; a ₹600 fast-fashion shirt worn 5 times costs ₹120 per wear — and generates 6× the waste. Buy fewer, better things, repair them, and let them go to other people rather than bins when done.' },
        ],
        keyFacts: [
          'Fashion accounts for up to 10% of global emissions.',
          'Cost-per-wear beats sticker price — for wallet and planet.',
          'The most sustainable garment is the one that already exists.',
        ],
      },
    ],
    quiz: [
      { q: 'If food waste were a country, its emissions would rank…', options: ['10th', '3rd', '25th', '50th'], answer: 1, explain: 'Behind only China and the US — roughly a third of all food produced is lost or wasted.' },
      { q: 'Fashion is responsible for up to what share of global emissions?', options: ['1%', '10%', '30%', '50%'], answer: 1, explain: 'Up to 10% — more than international flights and maritime shipping combined.' },
      { q: 'Millets are a sustainability win because they…', options: ['Need little water', 'Grow without soil', 'Are genetically modified', 'Never spoil'], answer: 0, explain: 'Millets are water-efficient, hardy, and nutritionally dense — a traditional crop for a hot future.' },
      { q: 'The most sustainable garment is the one that is…', options: ['Made of organic cotton', 'Already in existence', 'Biodegradable', 'Locally sewn'], answer: 1, explain: 'Reusing anything beats producing even a "sustainable" replacement.' },
    ],
  },
];

export const COURSE_MAP = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export const LESSON_MAP = (() => {
  const map = {};
  for (const c of COURSES) {
    for (const l of c.lessons) {
      map[`${c.id}/${l.id}`] = { ...l, courseId: c.id, courseTitle: c.title, accent: c.accent };
    }
  }
  return map;
})();

export function courseProgress(lessonsDone = {}) {
  const done = Object.keys(lessonsDone).filter((k) => lessonsDone[k]);
  return { done: done.length, total: COURSES.reduce((s, c) => s + c.lessons.length, 0) };
}
