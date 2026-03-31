// Paste this entire script into the browser console on the Vercel Storyforge URL.
// It loads the Rix / Stars & Sovereignty campaign (end of Ch.2, ready for Ch.3)
// into Save Slot 1 and sets it as the active game state.

const gameState = {
  meta: {
    version: "1.0",
    createdAt: "2026-03-29T00:00:00.000Z",
    lastSaved: "2026-03-29T00:00:00.000Z",
    chapterNumber: 3,
    chapterTitle: "Chapter 3: Into Pinnacle",
    genre: "space-opera",
    sessionCount: 1
  },
  character: {
    name: "Rix",
    species: "Vrynn",
    class: "Driftrunner",
    gender: "he",
    level: 4,
    hp: { current: 24, max: 24 },
    ac: 16,
    credits: 24210,
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 12, CHA: 14 },
    proficiencies: ["Stealth", "Sleight of Hand", "Piloting", "Hacking", "Deception"],
    proficiencyBonus: 2,
    inventory: [
      { id: "pulse_pistol",     name: "Pulse Pistol",             description: "Standard sidearm",                                    quantity: 1,  damage: "1d8" },
      { id: "pulse_ammo",       name: "Pulse Pistol Ammo",        description: "30 rounds",                                           quantity: 30 },
      { id: "compact_pulse",    name: "Compact Pulse Pistol",     description: "CQB loadout",                                         quantity: 1,  damage: "1d6" },
      { id: "vibro_knife",      name: "Vibro-knife",              description: "Close-quarters blade",                                 quantity: 1,  damage: "1d4+DEX" },
      { id: "stun_pistol",      name: "Stun Pistol",              description: "Range 15ft — CON save DC 12 or incapacitated 1 min",  quantity: 1 },
      { id: "holo_cloak",       name: "Holo-cloak",               description: "Advantage on Stealth, 1/day — needs recharge",        quantity: 1,  effect: "Advantage on Stealth", charges: 0, maxCharges: 1 },
      { id: "lockbreaker",      name: "Lockbreaker Kit",          description: "Electronic lock bypass tools",                         quantity: 1 },
      { id: "emp_grenade",      name: "EMP Grenade",              description: "Disables electronics in area",                         quantity: 1 },
      { id: "medpatch",         name: "Medpatch",                 description: "Heal 1d6+2, bonus action",                             quantity: 3,  effect: "Heal 1d6+2", charges: 3, maxCharges: 3 },
      { id: "void_patch",       name: "Void Suit Patch Kit",      description: "Emergency hull/suit breach repair",                    quantity: 1 },
      { id: "signal_scrambler", name: "Signal Scrambler",         description: "Blocks tracking, 1hr, rechargeable",                  quantity: 1 },
      { id: "mag_cuffs",        name: "Mag-cuffs",                description: "Magnetic restraints",                                  quantity: 2 },
      { id: "breacher_charge",  name: "Breacher Charge",          description: "Explosive door breach — one used at waystation",       quantity: 1 },
      { id: "tactical_vest",    name: "Tactical Vest",            description: "AC +1 (included in AC 16)",                            quantity: 1 },
      { id: "wrist_comm",       name: "Wrist Comm Unit",          description: "Encrypted short-range comms",                          quantity: 1 },
      { id: "pirate_jacket",    name: "Scarred Ballistic Jacket", description: "[Stowed] Rim pirate disguise — AC equiv. tac vest",   quantity: 1 },
      { id: "slug_thrower",     name: "Battered Slug-thrower",    description: "[Stowed] Rim pirate disguise piece — functional",      quantity: 1 },
      { id: "plasma_cutter",    name: "Modified Plasma Cutter",   description: "[Stowed] Rim pirate disguise — dangerous, do not fire",quantity: 1 }
    ],
    tempModifiers: [],
    traits: [
      { name: "Darkvision",     description: "See in darkness up to 60ft",                          usesPerDay: 0, usesRemaining: 0 },
      { name: "Compound Eyes",  description: "Cannot be flanked — 360-degree threat awareness",     usesPerDay: 0, usesRemaining: 0 }
    ],
    skillPoints: {
      available: 0,
      log: ["Ch.2: Deception proficiency (waystation pirate act + two-track strategic planning)"]
    }
  },
  world: {
    shipName: "The Last Meridian",
    currentLocation: {
      name: "ARS Resolute, Bay Seven",
      description: "Accord Remnant warship, Vallant Reach system. Meridian docked. Pinnacle infiltration ~8 days out — Carren contracts at Deval Point."
    },
    factions: [
      { name: "Accord Remnant",         stance: "Allied. Kessrin commands 12 ships from Vallant Reach. Rix holds provisional Captain rank as Special Operations Unit Meridian." },
      { name: "Helix Syndicate",        stance: "Hostile. Relay captured, three delegates exposed, sector architecture 97% compromised. Believes the relay hit was isolated; unaware of Accord's full penetration." },
      { name: "The Architect's Faction",stance: "Unknown. Pre-Fracture military capability. Directs Vos's Helix sector. True agenda and identity unknown." }
    ],
    npcs: [
      {
        name: "Torr", role: "crew", disposition: "trusted",
        description: "Korath engineer. Peak loyalty. Executes flawlessly — leech plant at waystation in 10 seconds, built the burst-coast protocol. Rix's partner for the Pinnacle supply crew insertion.",
        lastSeen: "ARS Resolute, Bay Seven",
        vulnerability: "Being sidelined from tactical planning — thrives when consulted, loses morale when kept out"
      },
      {
        name: "Sable", role: "crew", disposition: "trusted",
        description: "Human ex-Helix cryptographic specialist. Predicted beacon cipher rotation. Recorded Architect meeting. Will run overwatch from the Meridian during Pinnacle. Professional backbone.",
        lastSeen: "ARS Resolute",
        vulnerability: "Being treated as a tool rather than crew — using her intel without including her in decisions"
      },
      {
        name: "Laine", role: "crew", disposition: "favorable",
        description: "Ex-Helix field operative, Officer Maren Laine. CI-cleared. Delivered comprehensive Pinnacle infiltration plan. Trust rebuilt after compartment setback. Oshi's kid promise still live.",
        lastSeen: "ARS Resolute",
        vulnerability: "Verath Station promise — one more deferral without concrete action breaks trust permanently"
      },
      {
        name: "Admiral Kessrin", role: "contact", disposition: "trusted",
        description: "Admiral Tova Kessrin, Accord Remnant commander. Full trust in Rix's judgment. Authorized Verath Station operation post-infiltration. Shifted priority to Pinnacle archives over capturing Vos.",
        lastSeen: "ARS Resolute"
      },
      {
        name: "Captain Dray", role: "contact", disposition: "favorable",
        description: "Captain Rolen Dray, corvette Ironclad. Not yet briefed on Pinnacle or the Architect. Professional respect earned Ch.2 Part 1 — shared whiskey, acknowledged he was wrong.",
        lastSeen: "ARS Resolute"
      },
      {
        name: "Commander Renn", role: "contact", disposition: "favorable",
        description: "Commander Asha Renn, senior intelligence officer. Cleared Laine via CI debrief. Running Architect meeting decryption. Turned Meck/Solitaire. Efficient, thorough, trusted.",
        lastSeen: "ARS Resolute"
      },
      {
        name: "Lieutenant Arak", role: "contact", disposition: "favorable",
        description: "Intelligence analyst. Identified Carren via relay data. Improved cipher model. Contributing to infiltration planning. Developing into a key operational partner.",
        lastSeen: "ARS Resolute"
      },
      {
        name: "Doss", role: "contact", disposition: "favorable",
        description: "Quartermaster Doss, prosthetic left hand. Provided Solitaire leads and Rim pirate disguise gear. Observant, reliable. Treats Rix as a professional, not a vending machine.",
        lastSeen: "ARS Resolute, Armory"
      },
      {
        name: "Patel", role: "contact", disposition: "favorable",
        description: "Chief Engineer Patel, ARS Resolute Bay Seven. Executed cloak diagnostic. Rix owes her one bottle of Kaelish Gold (one delivered, one pending).",
        lastSeen: "ARS Resolute, Bay Seven"
      },
      {
        name: "Meck", role: "contact", disposition: "wary",
        description: "Ensign Taro Meck, former Solitaire — now doubled agent. Shuttle pilot. Coerced by Helix via sister Aven Meck on Verath Station. Cooperative out of fear, not loyalty. Grateful but doesn't know Rix personally.",
        lastSeen: "ARS Resolute"
      },
      {
        name: "Commander Vasek", role: "npc", disposition: "hostile",
        description: "Commander Dren Vasek, Helix Syndicate, interceptor Pale Digit. Lost operatives and Laine at Athex-7. Patient, professional, motivated. Knows the Meridian's transponder. Location unknown — overdue for a move.",
        lastSeen: "Unknown"
      },
      {
        name: "Director Vos", role: "npc", disposition: "hostile",
        description: "Director Sera Vos, Helix sector commander, Pinnacle Station. Met the Architect in the Tessaran Margin. Issued elevated-urgency all-hands orders to garrison post-meeting. Something changed.",
        lastSeen: "Pinnacle Station"
      },
      {
        name: "The Architect", role: "npc", disposition: "hostile",
        description: "Unknown entity commanding a pre-Fracture Accord heavy cruiser with advanced masking. Uses pre-Fracture military encryption. Directs Helix operations at sector level. Identity, location, and agenda completely unknown.",
        lastSeen: "Tessaran Margin (deep space)"
      },
      {
        name: "Carren", role: "npc", disposition: "neutral",
        description: "Carren / Maren Dyce, Helix logistics handler. Contracts independent freight crews at Deval Point for Pinnacle supply runs. Human, female, late forties, prosthetic right eye. Contracting next crew in ~8 days. Under observation only.",
        lastSeen: "Deval Point (en route)"
      },
      {
        name: "Grezzo", role: "contact", disposition: "favorable",
        description: "Four-armed Human-splice bartender, Station Orja-9. Long-time contact. Dormant — no interaction since before Chapter 1. Disposition assumed from history.",
        lastSeen: "Station Orja-9"
      }
    ],
    threads: [
      { id: "pinnacle_infiltration", title: "Pinnacle Infiltration",       status: "Next supply cycle in ~8 days. Rix + Torr inserted via Carren's freight crew at Deval Point. Comprehensive plan from Laine. Highest priority.", deteriorating: false },
      { id: "the_architect",         title: "The Architect",               status: "Unknown entity with pre-Fracture military resources directing Helix. Identity unknown. Decryption of meeting comms is critical path.",           deteriorating: true },
      { id: "vos_post_meeting",       title: "Vos's Post-Meeting Orders",  status: "Elevated urgency at Pinnacle after Architect meeting. Something changed — garrison may be reconfigured or reinforced.",                         deteriorating: true },
      { id: "carren_cover",           title: "Carren / Deval Point Cover", status: "Observe only. Rix and Torr building cover identities from real Rim freight records to be hired as supply crew.",                                deteriorating: false },
      { id: "assembly_vote",          title: "Coalition Assembly Vote",    status: "Delayed 10-14 days. Compromised delegates Torven, Pell, and Ogun removed. Window still open.",                                                  deteriorating: false },
      { id: "architect_decrypt",      title: "Architect Decryption",       status: "Renn's team decrypting Architect meeting comms. Preliminary results in 48hrs, full decrypt up to a week.",                                      deteriorating: false },
      { id: "meck_doubled",           title: "Meck (Doubled Agent)",       status: "Feeding controlled information to Helix via Renn. Sister Aven on Verath Station. Stable but fragile if Helix discovers the turn.",             deteriorating: false },
      { id: "vasek_pale_digit",       title: "Vasek and the Pale Digit",   status: "Location unknown. No activity in Chapter 2. Overdue for a move. Knows the Meridian's transponder.",                                            deteriorating: true },
      { id: "verath_op",              title: "Verath Station Operation",   status: "Authorized by Kessrin post-infiltration. Oshi's kid (Laine's promise), Aven Meck (Solitaire leverage), Helix footprint assessment.",          deteriorating: false },
      { id: "experiment_16",          title: "Experiment 16 / Bioweapons", status: "Three weapons labs in relay data. Connection to Athex-7 organisms. Unaddressed since Chapter 1. Worsening by inattention.",                   deteriorating: true },
      { id: "dray_briefing",          title: "Dray's Briefing",            status: "Needs to be read in on Pinnacle and the Architect before the infiltration. Reaction to scope expansion will matter.",                          deteriorating: false }
    ],
    promises: [
      { id: "laine_oshi",     to: "Laine",  what: "Find Oshi's child on Verath Station. Kessrin committed to post-Pinnacle operation. One more deferral without action pushes to Strained — Laine's tolerance nearly exhausted.", status: "open" },
      { id: "patel_whiskey",  to: "Patel",  what: "One bottle of Kaelish Gold still owed. One delivered Day 6. Patel notices who remembers.", status: "open" },
      { id: "sable_backend",  to: "Sable",  what: "7.5% backend on the data core's assessed strategic value. Not yet assessed by Kessrin. Sable hasn't pressed the issue.", status: "open" }
    ],
    antagonist: {
      name: "The Architect",
      description: "Unknown entity commanding a pre-Fracture Accord heavy cruiser with advanced signature masking technology. Uses pre-Fracture military encryption. Operates through Director Vos at Helix.",
      agenda: "Advance an unknown pre-Fracture agenda through Helix. Issued new orders to Vos post-meeting — something at Pinnacle changed. True goals and identity completely unknown.",
      movedThisChapter: false,
      moves: [
        {
          chapterNumber: 2,
          description: "Met Director Vos in person at Tessaran Margin. Heavy encrypted data transfer. Issued elevated-urgency all-hands orders to Pinnacle garrison — something changed after the meeting.",
          timestamp: "2026-03-29T00:00:00.000Z"
        }
      ]
    },
    crewCohesion: {
      score: 5,
      log: [
        { chapterNumber: 2, companionName: "Laine",  change: -1, reason: "Failed CHA check delivering compartment news — Laine felt excluded rather than protected", timestamp: "2026-03-29T00:00:00.000Z" },
        { chapterNumber: 2, companionName: "crew",   change:  1, reason: "Midnight return: gave Laine the infiltration lead, acknowledged contributions, committed to fighting for full restoration", timestamp: "2026-03-29T00:00:00.000Z" },
        { chapterNumber: 2, companionName: "Laine",  change:  1, reason: "Credited Laine's contributions in person and formally through the chain of command after recon success", timestamp: "2026-03-29T00:00:00.000Z" }
      ]
    },
    ship: {
      hullCondition: 95,
      systems: [
        { id: "engines",       name: "Engines",       level: 2, description: "Fully overhauled. 30% fuel efficiency increase. Quick-restart (0 to full thrust in 8s). Burst-coast protocol installed — advantage on Stealth during pursuit." },
        { id: "weapons",       name: "Weapons",       level: 1, description: "Original nose cannon with upgraded power coupling. Twin pulse array upgrade still pending." },
        { id: "shields",       name: "Shields",       level: 1, description: "Light military deflector. Standard protection. No damage reduction." },
        { id: "sensors",       name: "Sensors",       level: 2, description: "Military-grade with mineral-density filter (40% EM noise reduction). EW suite active/passive. Corvette and courier drive profiles loaded. Extreme-range passive optical array." },
        { id: "crew_quarters", name: "Crew Quarters", level: 2, description: "Full life support replacement. Operational. No cohesion bonus yet." }
      ],
      combatOptions: [
        "Burst-coast protocol (advantage on ship Stealth during pursuit/shadowing operations)",
        "Active cloaking (12min 40sec invisible — no weapons or shields while active, 6hr recharge)",
        "False transponder (sub-2s switch: Meridian ID ↔ Dust Kicker scavenger signal)",
        "EW active mode (electronic warfare — jamming, spoofing)"
      ],
      upgradeLog: [
        "Full refit at ARS Resolute — engines, weapons, shields, sensors, life support all overhauled",
        "Mineral-density sensor filter installed by Patel — 40% EM noise reduction in asteroid fields",
        "Burst-coast protocol developed by Torr during Tessaran Margin shadow mission",
        "Nav-ghost module installed — +5 ship Stealth, masks drive signature"
      ]
    },
    tensionClocks: [
      { id: "vasek_hunt",       name: "Vasek's Hunt",          maxSegments: 6, filled: 2, status: "active",  triggerEffect: "Vasek makes a direct move against Rix or the Meridian — ambush, boarding, or exposure to Helix" },
      { id: "architect_agenda", name: "The Architect's Agenda", maxSegments: 6, filled: 1, status: "active",  triggerEffect: "The Architect's post-meeting plans advance to a stage that directly impacts the Accord or Rix's operations" },
      { id: "experiment_16",    name: "Experiment 16",          maxSegments: 4, filled: 2, status: "active",  triggerEffect: "The bioweapons program produces a result or incident that forces immediate attention — the labs have been running uncontrolled since Athex-7" }
    ]
  },
  combat: {
    active: false,
    round: 0,
    enemies: [],
    log: []
  },
  history: {
    messages: [],
    chapters: [
      {
        number: 1,
        title: "Chapter 1: The Athex-7 Extraction",
        status: "complete",
        summary: "Rix and crew infiltrated Athex-7, a derelict Accord black-site, to retrieve a data core containing Helix bioweapons evidence. They drifted cold through the automated defense grid, extracted the core, turned the grid against a Helix boarding team from the Pale Digit, and captured Officer Maren Laine. Laine was turned into a willing witness during the 24-hour transit. Delivery to Admiral Kessrin at Vallant Reach earned 20,000 credits and a long-term independent operations contract.",
        keyEvents: [
          "Cold-drift infiltration through Athex-7's automated defense grid",
          "Data core extracted — Helix bioweapons research evidence secured",
          "Defense grid reprogrammed against Helix boarding team from the Pale Digit (Commander Vasek)",
          "Officer Maren Laine captured and turned into a willing witness during 24-hour transit",
          "Delivered core and testimony to Admiral Kessrin — earned provisional Captain rank and Special Operations contract"
        ],
        debrief: null
      },
      {
        number: 2,
        title: "Chapter 2: The Narrowing Dark",
        status: "complete",
        summary: "Rix captured a Helix command relay in the Soren Narrows, extracting 97% of sector operational architecture and unmasking Director Vos at Pinnacle Station. A nine-day shadow campaign followed: cluster recon, waystation leech planted, and a hidden secondary docking port identified. The leech intercepted Vos departing to meet a mysterious figure — the Architect — operating a pre-Fracture military cruiser. Rix shadowed the meeting at the Tessaran Margin and recorded everything. Meck was unmasked as the Solitaire mole and doubled. Laine delivered a comprehensive Pinnacle infiltration plan. Crew cohesion reached 5.",
        keyEvents: [
          "Helix relay command node captured in Soren Narrows — 97% of sector architecture extracted",
          "Director Vos identified as Helix sector commander at Pinnacle Station",
          "Pinnacle cluster recon: waystation leech planted, secondary docking port discovered, corvette patrol mapped",
          "Shadowed Vos to Tessaran Margin — observed and recorded the Architect meeting (pre-Fracture heavy cruiser, unidentified entity)",
          "Ensign Meck unmasked as Solitaire and doubled by Commander Renn — sister Aven on Verath Station used as Helix leverage",
          "Promoted to Captain (provisional) — Special Operations Unit Meridian designated"
        ],
        debrief: null
      },
      {
        number: 3,
        title: "Chapter 3: Into Pinnacle",
        status: "in-progress",
        summary: "",
        keyEvents: []
      }
    ],
    rollLog: []
  }
};

const saveSlotData = {
  slot: 1,
  savedAt: new Date().toISOString(),
  characterName: gameState.character.name,
  characterClass: gameState.character.class,
  genre: gameState.meta.genre,
  chapterNumber: gameState.meta.chapterNumber,
  chapterTitle: gameState.meta.chapterTitle,
  gameState: gameState
};

localStorage.setItem('storyforge_save_1', JSON.stringify(saveSlotData));
localStorage.setItem('storyforge_gamestate', JSON.stringify(gameState));
console.log('✓ Rix — Chapter 3: Into Pinnacle loaded into Save Slot 1 and active state.');
