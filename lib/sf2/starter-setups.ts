import { arcPlanToArcEntity } from './arc-author/transform'
import { applyAuthoredToCampaign } from './author/hydrate'
import { transformAuthorSetup } from './author/transform'
import { chapterPressureRuntime } from './pressure/runtime'
import type {
  AuthorChapterSetupV2,
  Sf2ArcPlan,
  Sf2State,
} from './types'

export const FORTY_THOUSAND_STARTER_SEED_ID = 'space-opera/human/operative/forty-thousand' as const

export const FORTY_THOUSAND_STARTER_ARC_PLAN: Sf2ArcPlan = {
  id: 'arc_forty_thousand_job',
  status: 'active',
  title: 'The Forty Thousand Job',
  sourceHook: {
    title: 'Forty Thousand',
    premise:
      "You owe Maren Voss forty thousand credits. Her collector is on the station, the port fees have your ship pinned, and a stranger offers exactly forty thousand credits to move one passenger and one sealed crate three jumps past the last beacon tonight.",
    objective: 'Get clear of the station without handing the crew to a worse creditor.',
    crucible:
      'The exact amount that buys freedom arrives from someone who knows the crew is desperate.',
    firstEpisode:
      'Take, reshape, or reject the exact-price job before Voss Recovery turns the debt into a station lock.',
  },
  scenarioShape: {
    mode: 'extraction',
    premise:
      'A trapped Driftrunner crew can clear a forty-thousand-credit debt only by taking an off-book passenger-and-crate run beyond the last beacon.',
    whyThisRun:
      'The job is priced to the credit, timed to the collector arrival, and tailored to the crew route that is already blocked.',
    whatThisIsNot:
      'Not a generic smuggling job, not a ship-name story, and not a clean debt payoff.',
    selectionRationale:
      'Forty Thousand works best as exit pressure: every chapter tests whether freedom is being bought or mortgaged.',
    rejectedDefaultShape:
      'Avoid the static cargo-bay tableau where the crew merely accepts a job and leaves without debt, collector, passenger, and route pressure colliding.',
  },
  arcQuestion:
    'Can the crew turn an exact-price trap into a chosen route before the debt economy owns their future?',
  coreCrucible:
    'Forty thousand credits can clear the visible debt only by creating a hidden obligation with sharper teeth.',
  invariantFacts: [
    'The PC owes Maren Voss forty thousand credits.',
    'A Voss Recovery collector is physically present on the station.',
    'The ship cannot leave cleanly until fees, liens, or route permissions clear.',
    'Juno Vale offers exactly forty thousand credits for one passenger and one sealed crate.',
    'The destination lies three jumps past the last reliable beacon.',
  ],
  variableTruthsForThisRun: [
    'Who told Juno the exact amount and why they chose this crew.',
    'What is inside the sealed crate.',
    'Why the passenger cannot travel through ordinary route channels.',
    'Whether Maren Voss is only a creditor or part of the trap.',
  ],
  durableForces: [
    {
      id: 'force_voss_recovery',
      name: 'Voss Recovery',
      agenda: 'Convert unpaid debt into control over routes, ship access, and reputation.',
      leverage: 'Liens, collector presence, dock holds, and violence priced as paperwork.',
      fear: 'Letting a debtor publicly slip makes every other route debt softer.',
      pressureStyle: 'casual exactness followed by administrative teeth',
    },
    {
      id: 'force_back_channel_brokers',
      name: 'Back-channel brokers',
      agenda: 'Move people and freight no legal route will touch.',
      leverage: 'Urgency, partial truths, route chits, and plausible deniability.',
      fear: 'A job exposed too early burns contacts across the beacon corridor.',
      pressureStyle: 'quiet offers that expire before the whole shape is visible',
    },
    {
      id: 'force_station_route_authority',
      name: 'Helix route authority',
      agenda: 'Keep order on the berth ring while selling permission as compliance.',
      leverage: 'Docking clamps, fee ledgers, customs flags, and departure windows.',
      fear: 'A public breach makes the station look like a pirate port with better lighting.',
      pressureStyle: 'safety code language over naked gatekeeping',
    },
  ],
  durableNpcSeeds: [
    {
      id: 'seed_juno_vale',
      role: 'back-channel broker',
      affiliation: 'Back-channel broker network',
      dramaticFunction: 'Offers the exact-price escape while withholding why it fits too well.',
      privatePressure: 'Needs this crew because the route window closes tonight.',
      reuseGuidance: 'Promote when the offer, passenger, or route terms need a human face.',
    },
    {
      id: 'seed_sable_ort',
      role: 'Voss collector',
      affiliation: 'Voss Recovery',
      dramaticFunction: 'Makes the debt physically present before the PC can treat it as math.',
      privatePressure: 'Must make an example of the crew if they run again.',
      reuseGuidance: 'Promote when debt pressure needs to enter the room.',
    },
    {
      id: 'seed_undisclosed_passenger',
      role: 'off-book passenger',
      affiliation: 'Unknown off-book passenger',
      dramaticFunction: 'Turns the job from payment into protection.',
      privatePressure: 'Cannot explain the crate without exposing who is hunting them.',
      reuseGuidance: 'Promote only after the crew has accepted, inspected, or confronted the job.',
    },
  ],
  pressureEngines: [
    {
      id: 'engine_debt_net',
      name: 'Debt net',
      aggregation: 'max',
      advancesWhen: 'Voss Recovery converts missed payment into route, dock, or reputation control.',
      slowsWhen: 'The PC pays, exposes, or credibly threatens the collection mechanism.',
      visibleSymptoms: 'holds, fee flags, collector sightings, and dock workers suddenly knowing the PC name',
    },
    {
      id: 'engine_hot_freight',
      name: 'Hot freight',
      aggregation: 'max',
      advancesWhen: 'The passenger or crate draws scans, pursuers, contradictions, or broker evasions.',
      slowsWhen: 'The PC learns enough to choose protection, refusal, or renegotiated custody.',
      visibleSymptoms: 'sealed-case protocols, nervous broker edits, passive sweeps, and route windows tightening',
    },
    {
      id: 'engine_crew_trust',
      name: 'Crew trust',
      aggregation: 'average',
      advancesWhen: 'The PC hides terms, risks the crew without consent, or lets debt choose for them.',
      slowsWhen: 'The PC shares risk, draws boundaries, or turns desperation into an owned plan.',
      visibleSymptoms: 'short comms, practical objections, favors withheld, and jokes getting thinner',
    },
  ],
  playerStanceAxes: [
    {
      id: 'axis_debt_vs_terms',
      axis: 'Debt relief versus contract control',
      poleA: 'Take the money fast',
      poleB: 'Interrogate or rewrite the terms',
      signalsA: ['accepts Juno quickly', 'prioritizes payment', 'avoids asking about the crate'],
      signalsB: ['asks who priced the job', 'demands inspection', 'negotiates control of handoff'],
      ifAHardens: 'The crew gains speed but inherits hidden obligations.',
      ifBHardens: 'The crew gains agency but gives Sable time to close the route.',
    },
    {
      id: 'axis_passenger_vs_crew',
      axis: 'Protect the stranger versus protect the crew first',
      poleA: 'Treat the passenger as a person under pressure',
      poleB: 'Treat the passenger as risk cargo until trust is earned',
      signalsA: ['asks about safety', 'keeps hunters away', 'refuses to hand them over'],
      signalsB: ['contains access', 'searches belongings', 'keeps the crew briefed first'],
      ifAHardens: 'The passenger may trust the PC before the crew does.',
      ifBHardens: 'The crew may stay safer while the passenger withholds more.',
    },
    {
      id: 'axis_visible_law_vs_back_channel',
      axis: 'Station rules versus back-channel escape',
      poleA: 'Use official route systems',
      poleB: 'Go around the station ledger',
      signalsA: ['works with port authority', 'clears fees openly', 'documents the job'],
      signalsB: ['uses false chits', 'spoofs sweeps', 'cuts deals in the dark'],
      ifAHardens: 'Voss gains more official surfaces to contest.',
      ifBHardens: 'The crew leaves fewer records but owes dirtier favors.',
    },
  ],
  chapterFunctionMap: [
    {
      chapter: 1,
      function: 'Force the PC to choose whether the exact-price job becomes their exit vector.',
      pressureQuestion: 'Will the crew accept, reshape, or refuse the offer before the debt closes?',
      possibleEndStates: [
        'Job accepted on Juno terms.',
        'Job accepted with inspection or renegotiated leverage.',
        'Job refused and Voss pressure becomes the main route problem.',
      ],
    },
    {
      chapter: 2,
      function: 'Make boarding the passenger and crate cost something specific.',
      pressureQuestion: 'What must the crew expose or risk to get the job aboard?',
      possibleEndStates: [
        'Passenger aboard but trust strained.',
        'Crate inspected and the job recontextualized.',
        'Collector or station authority forces a visible compromise.',
      ],
    },
    {
      chapter: 3,
      function: 'Turn the first jump beyond the beacon into pursuit or moral pressure.',
      pressureQuestion: 'What does the crew learn once no station law can protect them?',
      possibleEndStates: [
        'The cargo truth shifts the crew stance.',
        'A pursuer identifies the passenger.',
        'A route hazard turns the debt clock into survival pressure.',
      ],
    },
    {
      chapter: 4,
      function: 'Reveal who priced the job and why this crew was selected.',
      pressureQuestion: 'Is the PC still carrying a job, or carrying leverage in someone else\'s war?',
      possibleEndStates: [
        'Juno is exposed as compromised.',
        'Voss is linked to the route trap.',
        'The passenger becomes an active ally or liability.',
      ],
    },
    {
      chapter: 5,
      function: 'Resolve whether the crew exits free, indebted, or deliberately entangled.',
      pressureQuestion: 'Who owns the route after the handoff?',
      possibleEndStates: [
        'Debt cleared and a cleaner route earned.',
        'Debt cleared but a sharper obligation remains.',
        'Debt refused, burned, or converted into open conflict.',
      ],
    },
  ],
  possibleEndgames: [
    'The crew clears Voss and keeps the passenger alive, but Juno owns a future favor.',
    'The crew burns the broker network and leaves with the passenger as ally.',
    'The debt becomes open war with Voss Recovery.',
    'The PC chooses the hidden obligation because it is better than the visible one.',
  ],
}

export const FORTY_THOUSAND_STARTER_CHAPTER: AuthorChapterSetupV2 = {
  chapterFrame: {
    title: 'The Exact Price',
    premise:
      'The crew is pinned on Helix Station by a forty-thousand-credit debt, and Juno Vale offers the exact amount for a passenger-and-crate run that must leave tonight.',
    activePressure:
      'Sable Ort is close enough to turn the unpaid debt into a route lock while Juno waits for an answer.',
    centralTension:
      'Freedom is available at the exact price of accepting a job shaped by someone else\'s leverage.',
    objective:
      'Take, reshape, or refuse Juno\'s exact-price job before Voss Recovery can pin the crew on Helix Station.',
    crucible:
      'The amount that clears the debt is also proof that someone knows exactly how desperate the crew is.',
    outcomeSpectrum: {
      clean: 'The crew leaves Helix with Juno contained, Sable stalled, and the passenger terms chosen by the PC.',
      costly: 'The crew gets a departure window, but Juno or Sable keeps leverage over the next route.',
      failure: 'Sable turns the debt into control of the ship, the route, or the crew reputation.',
      catastrophic: 'The passenger is exposed, the crate changes hands, and the crew loses trust in the PC.',
    },
  },
  antagonistField: {
    sourceFactionLabel: 'Helix Station route-and-debt economy',
    corePressure:
      'Debts, dock permissions, and off-book routes let other people decide whether the crew can leave.',
    defaultFace: {
      name: 'Sable Ort',
      role: 'Voss Recovery collector',
      pressureStyle: 'friendly until the ledger becomes a threat',
    },
    possibleFaces: [
      {
        id: 'face_sable_ort',
        name: 'Sable Ort',
        role: 'Voss Recovery collector',
        becomesPrimaryWhen: 'The PC delays, refuses payment, or tries to run without clearing the hold.',
        pressureStyle: 'friendly until the ledger becomes a threat',
      },
      {
        id: 'face_juno_vale',
        name: 'Juno Vale',
        role: 'back-channel broker',
        becomesPrimaryWhen: 'The PC accepts the offer or presses on who priced it.',
        pressureStyle: 'soft voice, hard deadline, no spare explanations',
      },
      {
        id: 'face_route_authority',
        name: 'Helix route authority',
        role: 'station permissions office',
        becomesPrimaryWhen: 'The PC tries to solve the debt through official departure systems.',
        pressureStyle: 'safety-code politeness over rented coercion',
      },
    ],
    escalationLogic:
      'If the PC stalls, Sable converts social pressure into station leverage; if the PC accepts, Juno moves pressure toward hidden cargo and route risk.',
  },
  startingNPCs: [
    {
      id: 'npc_juno_vale',
      name: 'Juno Vale',
      affiliation: 'Back-channel broker network',
      role: 'back-channel broker',
      voiceRegister: 'low, practical, and allergic to complete explanations',
      voiceNote: 'smiles after the dangerous part',
      dramaticFunction: 'Offers the exact-price escape and hides why it fits.',
      hiddenPressure: 'Her route window closes tonight and she cannot move this job through ordinary channels.',
      retrievalCue: 'Juno Vale, exact-price broker for the passenger-and-crate run.',
      initialDisposition: 'neutral',
      dispositionReason: 'She needs the crew but is withholding terms.',
    },
    {
      id: 'npc_sable_ort',
      name: 'Sable Ort',
      affiliation: 'Voss Recovery',
      role: 'collector',
      voiceRegister: 'relaxed, precise, and amused by overdue people',
      voiceNote: 'calls threats courtesy notices',
      dramaticFunction: 'Makes the forty-thousand-credit debt physically present.',
      hiddenPressure: 'He must make the PC an example if the crew runs again.',
      retrievalCue: 'Sable Ort, Maren Voss collector closing the station debt.',
      initialDisposition: 'hostile',
      dispositionReason: 'He is collecting a live debt with public leverage.',
    },
    {
      id: 'npc_undisclosed_passenger',
      name: 'Undisclosed passenger',
      affiliation: 'Unknown off-book passenger',
      role: 'off-book passenger',
      voiceRegister: 'controlled, tired, and careful with every identifying detail',
      voiceNote: 'answers around names, not questions',
      dramaticFunction: 'Turns the job from payment into protection.',
      hiddenPressure: 'They know the sealed crate matters more than the broker admitted.',
      retrievalCue: 'The unnamed passenger tied to Juno\'s sealed crate and last-beacon route.',
      initialDisposition: 'wary',
      dispositionReason: 'They are not aboard yet and trust no broker.',
    },
  ],
  activeThreads: [
    {
      id: 'thread_clear_forty_thousand',
      title: 'Clear the forty-thousand leverage',
      question: 'Can the PC turn the exact-price offer into a chosen exit instead of a debt trap?',
      ownerHint: 'Voss Recovery',
      tension: 7,
      initialTension: 6,
      resolutionCriteria:
        'The PC commits to, rewrites, or rejects the offer and makes the immediate station-exit pressure actionable.',
      resolutionGates: [
        {
          id: 'gate_offer_position',
          label: 'Offer position chosen',
          condition: 'The PC clearly accepts, refuses, stalls, or renegotiates Juno\'s offer.',
          required: true,
          status: 'open',
        },
        {
          id: 'gate_debt_surface_named',
          label: 'Debt surface named',
          condition: 'The route hold, fee ledger, collector threat, or payment path becomes explicit.',
          required: true,
          status: 'open',
        },
      ],
      failureMode:
        'Sable uses the unpaid debt to seize the crew\'s route, ship access, or reputation before departure.',
      retrievalCue:
        'Forty-thousand-credit debt, exact-price offer, and station-exit leverage.',
    },
    {
      id: 'thread_move_sealed_job',
      title: 'Move the sealed passenger-and-crate job',
      question: 'What is the crew actually agreeing to carry past the last beacon?',
      ownerHint: 'Back-channel broker network',
      tension: 6,
      initialTension: 5,
      resolutionCriteria:
        'The passenger-and-crate terms are accepted, inspected, renegotiated, or refused with clear consequences.',
      resolutionGates: [
        {
          id: 'gate_job_terms_exposed',
          label: 'Job terms exposed',
          condition: 'The PC learns or forces at least one concrete term beyond payment and destination.',
          required: true,
          status: 'open',
        },
      ],
      failureMode:
        'Juno binds the crew to cargo, passenger, or route terms they do not understand.',
      retrievalCue:
        'Juno\'s sealed passenger-and-crate run, hidden terms, and last-beacon destination.',
    },
    {
      id: 'thread_keep_crew_whole',
      title: 'Keep the crew whole',
      question: 'Can the PC make a desperate choice without making the crew feel sold?',
      ownerHint: 'independent ship crew',
      tension: 5,
      initialTension: 4,
      resolutionCriteria:
        'The crew understands the risk enough to follow the PC\'s decision without a trust break.',
      failureMode:
        'The crew reads the job as another secret debt and starts withholding trust, help, or options.',
      retrievalCue:
        'Shipboard trust under debt pressure, hidden job terms, and the cost of deciding alone.',
    },
  ],
  pressureLadder: [
    {
      id: 'ladder_sable_names_ship',
      pressure:
        'Sable names the PC\'s ship and departure lane aloud, making the debt public enough that dock workers start listening.',
      triggerCondition:
        'Sable sees the PC stall, evade, or move toward departure without a payment path.',
      narrativeEffect:
        'Voss Recovery gains social leverage; the crew risks reputation before the ship even undocks.',
      severity: 'standard',
    },
    {
      id: 'ladder_juno_cuts_window',
      pressure:
        'Juno shortens the route window and admits the passenger cannot survive ordinary customs.',
      triggerCondition:
        'The PC presses for terms, asks to inspect the crate, or delays past Juno\'s first deadline.',
      narrativeEffect:
        'The broker gains urgency leverage while the passenger\'s safety becomes the price of caution.',
      severity: 'standard',
    },
    {
      id: 'ladder_route_hold_hard',
      pressure:
        'Helix route authority flags the ship for a safety hold that Sable can clear only if the debt is handled his way.',
      triggerCondition:
        'The PC tries to leave, spoof clearance, or split the crew without resolving the debt surface.',
      narrativeEffect:
        'The crew loses clean departure access, and Sable can trade permission for obedience.',
      severity: 'hard',
    },
  ],
  humanStakes: [
    {
      whoPays: 'the PC',
      costSurface: 'freedom',
      whatIsLost: 'The PC stops choosing routes and starts reacting to whoever controls the debt.',
      triggeringPressure: 'thread_clear_forty_thousand',
    },
    {
      whoPays: 'npc_undisclosed_passenger',
      costSurface: 'safety',
      whatIsLost: 'The passenger becomes a bargaining chip before the crew even knows their name.',
      triggeringPressure: 'thread_move_sealed_job',
    },
    {
      whoPays: 'npc_juno_vale',
      costSurface: 'reputation',
      whatIsLost: 'Juno burns a broker channel if the job collapses in public.',
      triggeringPressure: 'thread_keep_crew_whole',
    },
  ],
  tensionScore: [
    {
      id: 'score_exit_offer',
      role: 'foreground_objective',
      sourceEntityId: 'npc_sable_ort',
      sourceThreadId: 'thread_clear_forty_thousand',
      pressure: 'The exact-price offer must become a chosen exit, a rejected trap, or a collector win.',
      proseSurface: 'Juno waits for the answer while Sable closes distance through the station.',
      advancesWhen: 'The PC takes a position on the offer and exposes how the debt blocks departure.',
      resolvesOrReframesWhen: 'The crew has a concrete path off-station or a clear reason they are pinned.',
    },
    {
      id: 'score_broker_terms',
      role: 'shadow_faction_pressure',
      sourceEntityId: 'npc_juno_vale',
      sourceThreadId: 'thread_move_sealed_job',
      pressure: 'Juno knows too much and says too little.',
      proseSurface: 'The offer is exact, urgent, and missing the parts that would make it ordinary.',
      advancesWhen: 'The PC asks who priced the job, inspects the crate, or demands route details.',
      resolvesOrReframesWhen: 'The hidden terms become enough for a real yes or no.',
    },
    {
      id: 'score_crew_trust',
      role: 'relational_social_pressure',
      sourceThreadId: 'thread_keep_crew_whole',
      pressure: 'The crew has to live with the bargain the PC makes under debt pressure.',
      proseSurface: 'Ship comms, crew warnings, and practical objections keep the choice social.',
      advancesWhen: 'The PC shares terms, asks for crew input, or hides risk to move faster.',
      resolvesOrReframesWhen: 'The crew either backs the plan or registers the first real trust break.',
    },
  ],
  possibleRevelations: [
    {
      id: 'reveal_exact_price_source',
      statement:
        'Juno did not learn the forty-thousand amount from rumor; someone inside the debt network priced the job to force this crew specifically.',
      heldBy: 'npc_juno_vale',
      emergenceCondition:
        'The PC questions why the offer matches the debt, pressures Juno, or compares timing with Sable\'s arrival.',
      recontextualizes:
        'The job is not lucky timing; the crew was selected because the debt made them movable.',
      hintPhrases: ['exact to the credit', 'not a public number', 'too neat for rumor'],
      hintsRequired: 2,
      validRevealContexts: ['private_pressure', 'forced_disclosure', 'confession'],
    },
    {
      id: 'reveal_crate_is_leverage',
      statement:
        'The sealed crate is not simple freight; it is leverage over whoever is hunting the passenger.',
      heldBy: 'npc_undisclosed_passenger',
      emergenceCondition:
        'The PC inspects the crate, protects the passenger, or forces Juno to explain why customs would be fatal.',
      recontextualizes:
        'The crew is not only transporting contraband; they are carrying bargaining power.',
      hintPhrases: ['do not scan it', 'they need it intact', 'not cargo, collateral'],
      hintsRequired: 2,
      validRevealContexts: ['documentary_surface', 'forced_disclosure', 'inadvertent'],
    },
  ],
  moralFaultLines: [
    {
      id: 'fault_freedom_or_leash',
      tension: 'Debt relief versus a cleaner kind of ownership',
      sideA: 'Take the money and leave tonight.',
      sideB: 'Slow down enough to know who owns the offer.',
      whyItHurts: 'Caution gives Sable time; speed gives Juno control.',
    },
    {
      id: 'fault_person_or_package',
      tension: 'Passenger safety versus crew consent',
      sideA: 'Protect the passenger before understanding the job.',
      sideB: 'Keep the crew fully informed before accepting risk.',
      whyItHurts: 'Either choice asks someone vulnerable to trust before they have reason.',
    },
  ],
  escalationOptions: [
    {
      id: 'escalation_sable_sits',
      type: 'social',
      condition: 'The PC delays in the cantina while Sable reaches the booth.',
      consequence:
        'The debt conversation becomes public and Juno has to decide whether to be seen with the crew.',
    },
    {
      id: 'escalation_customs_ping',
      type: 'institutional',
      condition: 'The PC asks for official clearance or tries to pay through the station ledger.',
      consequence:
        'The route authority finds the Voss hold and creates a paper trail the crew cannot ignore.',
    },
    {
      id: 'escalation_hunter_sweep',
      type: 'physical',
      condition: 'The PC probes the passenger or crate loudly enough for surveillance to notice.',
      consequence:
        'A passive sweep crosses the berth ring and forces the passenger problem into the open.',
    },
  ],
  editorializedLore: [
    {
      item: 'On Helix Station, departure permission is sold as safety compliance.',
      relevanceNow: 'The debt matters because it can become a dock hold, not because credits are abstract.',
      deliveryMethod: 'Show workers reacting to Sable\'s ledger language and route codes.',
    },
    {
      item: 'Past the last beacon, reputation travels faster than law.',
      relevanceNow: 'The job destination makes every station-side decision follow the crew into dark space.',
      deliveryMethod: 'Let Juno price silence, route chits, and names as survival tools.',
    },
  ],
  openingSceneSpec: {
    location: 'Helix Station cantina, berth-ring edge',
    atmosphericCondition:
      'Late cycle; fryer steam, fuel tang, and arrival-board static under a tired orange departure clock.',
    initialState:
      'The PC is in a corner booth with Juno Vale across the table, Sable Ort visible near the customs arch, and the ship still pinned by unpaid station fees.',
    firstPlayerFacing:
      'Juno has just offered exactly forty thousand credits for one passenger and one sealed crate, leaving tonight.',
    dramaticSituation:
      'A perfect-price escape offer lands while the collector who can close the exit walks into view.',
    firstVisiblePressure:
      'The exact number, the unpaid hold, and Sable\'s arrival make the offer feel designed rather than lucky.',
    firstHumanOrInstitutionalMove:
      'Juno slides the route chit halfway across the table and does not let go.',
    noStartingCombat: true,
    noExpositionDump: true,
    visibleNpcIds: ['npc_juno_vale', 'npc_sable_ort'],
    withheldPremiseFacts: [
      'Who told Juno the exact debt amount.',
      'The passenger\'s identity and why ordinary customs would expose them.',
      'What the sealed crate contains or proves.',
      'Whether Maren Voss knows about the back-channel offer.',
    ],
  },
  arcLink: {
    arcId: 'arc_forty_thousand_job',
    chapterFunction:
      'Force the PC to choose whether the exact-price job becomes their exit vector.',
    playerStanceRead:
      'Read whether the PC grabs speed, demands terms, protects the passenger, or protects crew consent first.',
    pressureEngineIds: ['engine_debt_net', 'engine_hot_freight', 'engine_crew_trust'],
  },
  pacingContract: {
    targetTurns: { min: 12, max: 18 },
    chapterQuestion:
      'Will the crew accept, reshape, or refuse the exact-price offer before the debt closes?',
    acceptableResolutions: [
      'The PC accepts the job with enough terms to leave.',
      'The PC rejects the job and defines another way to handle Voss.',
      'The PC stalls or renegotiates until Sable, Juno, or route authority changes the pressure.',
    ],
    earlyPressure:
      'Make the exact number and Sable\'s visible approach impossible to treat as coincidence.',
    middlePressure:
      'Force one concrete term, route risk, or debt mechanism into the open.',
    latePressure:
      'Convert delay into a station hold, broker deadline, or passenger safety risk.',
    closeWhenAny: [
      'The PC has chosen a concrete path for the offer and debt surface.',
      'The station-exit pressure changes from negotiation to action.',
      'Sable or Juno forces a consequence that reframes the next chapter.',
    ],
    avoidExtendingFor: [
      'Extra haggling after the PC has taken a clear position.',
      'More anonymous station color once the route pressure is established.',
      'Re-explaining the debt instead of changing who has leverage.',
    ],
  },
}

export function applyPreauthoredStarterSetup(state: Sf2State): boolean {
  if (
    state.meta.seedId !== FORTY_THOUSAND_STARTER_SEED_ID ||
    state.meta.experimentMode !== 'sf2b-hook' ||
    state.chapter.title.length > 0
  ) {
    return false
  }

  const arcPlan = clone(FORTY_THOUSAND_STARTER_ARC_PLAN)
  const authored = clone(FORTY_THOUSAND_STARTER_CHAPTER)
  const transformed = transformAuthorSetup(authored, 1)
  const arcEntity = arcPlanToArcEntity(arcPlan)

  state.campaign.arcPlan = arcPlan
  state.campaign.arcs[arcEntity.id] = arcEntity
  state.meta.currentChapter = transformed.chapter
  state.meta.currentSceneId = `scene_${transformed.chapter}_1`
  state.chapter = {
    number: transformed.chapter,
    title: transformed.runtimeState.title,
    setup: transformed.runtimeState,
    scaffolding: transformed.scaffolding,
    artifacts: { opening: transformed.openingSeed },
    sceneSummaries: [],
    currentSceneId: `scene_${transformed.chapter}_1`,
  }

  applyAuthoredToCampaign(
    state,
    authored,
    transformed.chapter,
    transformed.runtimeState.loadBearingThreadIds
  )
  state.chapter.setup = chapterPressureRuntime.prepareChapterOpen(state, state.chapter.setup, [])

  state.world.currentLocation = {
    id: 'loc_opening',
    name: transformed.runtimeState.openingSceneSpec.location,
    description: transformed.runtimeState.openingSceneSpec.initialState,
    atmosphericConditions: [transformed.runtimeState.openingSceneSpec.atmosphericCondition],
    chapterCreated: transformed.chapter,
  }
  state.campaign.locations[state.world.currentLocation.id] = state.world.currentLocation
  state.world.sceneSnapshot = {
    sceneId: `scene_${transformed.chapter}_1`,
    location: state.world.currentLocation,
    presentNpcIds: transformed.openingSeed.visibleNpcIds.filter((id) => Boolean(state.campaign.npcs[id])),
    timeLabel: '',
    established: [transformed.runtimeState.openingSceneSpec.initialState],
    firstTurnIndex: state.history.turns.length,
  }
  state.meta.updatedAt = new Date().toISOString()
  return true
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
