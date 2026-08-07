// Turmoil: six parties, a delegate pool, a chairman, and a three-slot global event
// queue that advances every generation. Bonuses and policies follow the reference
// implementation (src/server/turmoil).
export const DELEGATES_PER_PLAYER = 7;
export const DELEGATES_FOR_NEUTRAL = 14;
// Lobbying costs 5 M€ from the Delegate Reserve; the Lobby delegate is free.
export const DELEGATE_RESERVE_COST = 5;
export const NEUTRAL = "NEUTRAL";

export const PARTIES = [
  {
    id: "mars",
    name: "マーズ・ファースト",
    shortName: "Mars First",
    bonuses: [
      { id: "mb01", description: "建材タグ1つにつき1 MC", kind: "tag", tag: "Building", resource: "mc" },
      { id: "mb02", description: "火星上のタイル1枚につき1 MC", kind: "ownTiles", resource: "mc" }
    ],
    policies: [
      { id: "mp01", description: "タイルを配置するたびに建材1", trigger: "onTilePlaced", resource: "steel", amount: 1 },
      { id: "mp02", description: "建材タグのカードをプレイするたびに2 MC", trigger: "onCardPlayed", tag: "Building", resource: "mc", amount: 2 },
      { id: "mp03", description: "建材の価値が1 MC上昇", passive: "steelValue", amount: 1 },
      { id: "mp04", description: "4 MCで建材カードを1枚引く", action: "drawTag", tag: "Building", cost: 4 }
    ]
  },
  {
    id: "scientists",
    name: "サイエンティスト",
    shortName: "Scientists",
    bonuses: [
      { id: "sb01", description: "科学タグ1つにつき1 MC", kind: "tag", tag: "Science", resource: "mc" },
      { id: "sb02", description: "手札3枚につき1 MC", kind: "handSize", per: 3, resource: "mc" }
    ],
    policies: [
      { id: "sp01", description: "10 MCでカードを3枚引く", action: "draw", count: 3, cost: 10 },
      { id: "sp02", description: "グローバル条件が±2ステップ緩和", passive: "globalRequirementBonus", amount: 2 },
      { id: "sp03", description: "グローバルパラメータ上昇1段階ごとにカードを1枚引く", trigger: "onGlobalRaised", draw: 1 },
      { id: "sp04", description: "科学タグ条件が1つ少なくて済む", passive: "scienceRequirementRelief", amount: 1 }
    ]
  },
  {
    id: "unity",
    name: "ユニティ",
    shortName: "Unity",
    bonuses: [
      { id: "ub01", description: "金星・地球・ジョビアンタグ1つにつき1 MC", kind: "tag", tag: ["Venus", "Earth", "Jovian"], resource: "mc" },
      { id: "ub02", description: "宇宙タグ1つにつき1 MC", kind: "tag", tag: "Space", resource: "mc" }
    ],
    policies: [
      { id: "up01", description: "チタンの価値が1 MC上昇", passive: "titaniumValue", amount: 1 },
      { id: "up02", description: "4 MCでチタン2、または任意のカードにフローター2", action: "unityResource", cost: 4 },
      { id: "up03", description: "4 MCで宇宙カードを1枚引く", action: "drawTag", tag: "Space", cost: 4 },
      { id: "up04", description: "宇宙タグのカードが2 MC安くなる", passive: "spaceDiscount", amount: 2 }
    ]
  },
  {
    id: "greens",
    name: "グリーン",
    shortName: "Greens",
    bonuses: [
      { id: "gb01", description: "植物・微生物・動物タグ1つにつき1 MC", kind: "tag", tag: ["Plant", "Microbe", "Animal"], resource: "mc" },
      { id: "gb02", description: "緑地タイル1枚につき2 MC", kind: "ownTiles", tileType: "forest", each: 2, resource: "mc" }
    ],
    policies: [
      { id: "gp01", description: "緑地タイルを配置するたびに4 MC", trigger: "onTilePlaced", tileType: "forest", resource: "mc", amount: 4 },
      { id: "gp02", description: "タイルを配置するたびに植物1", trigger: "onTilePlaced", resource: "plants", amount: 1 },
      { id: "gp03", description: "動物・植物・微生物タグのカードをプレイするたびに2 MC", trigger: "onCardPlayed", tag: ["Animal", "Plant", "Microbe"], resource: "mc", amount: 2 },
      { id: "gp04", description: "5 MCで植物3、または任意のカードに微生物2", action: "greensResource", cost: 5 }
    ]
  },
  {
    id: "reds",
    name: "レッズ",
    shortName: "Reds",
    bonuses: [
      { id: "rb01", description: "TRが最も低いプレイヤーがTR +1", kind: "lowestTr", amount: 1 },
      { id: "rb02", description: "TRが最も高いプレイヤーがTR -1", kind: "highestTr", amount: -1 }
    ],
    policies: [
      { id: "rp01", description: "TRを上げるたびに1段階につき3 MC支払う", passive: "trSurcharge", amount: 3 },
      { id: "rp02", description: "タイルを配置するたびに3 MC支払う", trigger: "onTilePlaced", cost: 3 },
      { id: "rp03", description: "4 MCでグローバルパラメータを1段階下げる", action: "reduceGlobal", cost: 4 },
      { id: "rp04", description: "グローバルパラメータ上昇1段階ごとにMC生産量 -1", trigger: "onGlobalRaised", productionPenalty: { resource: "mcProd", amount: -1 } }
    ]
  },
  {
    id: "kelvinists",
    name: "ケルヴィニスト",
    shortName: "Kelvinists",
    bonuses: [
      { id: "kb01", description: "熱生産量1につき1 MC", kind: "production", production: "heatProd", resource: "mc" },
      { id: "kb02", description: "熱生産量1につき熱1", kind: "production", production: "heatProd", resource: "heat" }
    ],
    policies: [
      { id: "kp01", description: "10 MCでエネルギーと熱の生産量を1ずつ上げる", action: "kelvinistProduction", cost: 10 },
      { id: "kp02", description: "気温を上げるたびに1段階につき3 MC", trigger: "onTemperatureRaised", resource: "mc", amount: 3 },
      { id: "kp03", description: "熱6を気温1段階に変換", action: "convertHeat", heatCost: 6 },
      { id: "kp04", description: "タイルを配置するたびに熱2", trigger: "onTilePlaced", resource: "heat", amount: 2 }
    ]
  }
];

export function getParty(id) {
  return PARTIES.find(party => party.id === id);
}

// Card requirements name parties as the reference does ("Mars First", "Reds"...).
export function normalizePartyId(name) {
  if (!name) return name;
  const normalized = String(name).toLowerCase().replace(/[^a-z]/g, "");
  const aliases = {
    mars: "mars",
    marsfirst: "mars",
    scientists: "scientists",
    unity: "unity",
    greens: "greens",
    reds: "reds",
    kelvinists: "kelvinists"
  };
  return aliases[normalized] ?? normalized;
}

export function createTurmoilState(playerIds, globalEventIds) {
  const delegateReserve = { [NEUTRAL]: DELEGATES_FOR_NEUTRAL - 1 };
  for (const id of playerIds) delegateReserve[id] = DELEGATES_PER_PLAYER;

  const parties = {};
  for (const party of PARTIES) parties[party.id] = { delegates: [], leader: null };
  // The game opens with a neutral chairman and the Greens dominant.
  parties.greens.delegates.push(NEUTRAL);
  parties.greens.leader = NEUTRAL;

  const queue = [...globalEventIds];
  return {
    chairman: NEUTRAL,
    dominantParty: "greens",
    rulingParty: "greens",
    rulingPolicyId: PARTIES.find(p => p.id === "greens").policies[0].id,
    parties,
    delegateReserve,
    lobby: [...playerIds],
    // distant -> coming -> current, advanced each generation.
    distantEvent: queue.shift() ?? null,
    comingEvent: queue.shift() ?? null,
    currentEvent: queue.shift() ?? null,
    eventDeck: queue,
    playersInfluenceBonus: {}
  };
}

export function countDelegates(turmoil, partyId, delegate) {
  const party = turmoil.parties[partyId];
  if (!party) return 0;
  return party.delegates.filter(entry => entry === delegate).length;
}

export function totalDelegates(turmoil, partyId) {
  return turmoil.parties[partyId]?.delegates.length ?? 0;
}

export function sendDelegate(turmoil, delegate, partyId, { fromLobby = false } = {}) {
  const next = cloneTurmoil(turmoil);
  if (fromLobby) {
    const index = next.lobby.indexOf(delegate);
    if (index < 0) return { turmoil, sent: false, reason: "ロビーに代表者がいません。" };
    next.lobby.splice(index, 1);
  } else {
    if ((next.delegateReserve[delegate] ?? 0) <= 0) {
      return { turmoil, sent: false, reason: "予備の代表者がいません。" };
    }
    next.delegateReserve[delegate] -= 1;
  }

  const party = next.parties[partyId];
  if (!party) return { turmoil, sent: false, reason: "政党が見つかりません。" };
  party.delegates.push(delegate);

  // The first delegate in a party becomes its leader; afterwards the player with
  // the most delegates takes over.
  party.leader = computePartyLeader(party);
  next.dominantParty = computeDominantParty(next);
  return { turmoil: next, sent: true };
}

// Turmoil rules: a challenger takes the Party Leader seat only by having *more*
// delegates than the current leader. The incumbent has to be passed in, or a tie
// silently hands the seat to whoever sits earliest in the delegates array.
function computePartyLeader(party, incumbent = party.leader ?? null) {
  const counts = new Map();
  for (const delegate of party.delegates) {
    counts.set(delegate, (counts.get(delegate) ?? 0) + 1);
  }

  const incumbentCount = incumbent ? (counts.get(incumbent) ?? 0) : 0;
  let leader = incumbentCount > 0 ? incumbent : null;
  let best = incumbentCount;
  for (const delegate of party.delegates) {
    const count = counts.get(delegate);
    if (count > best) {
      best = count;
      leader = delegate;
    }
  }
  return leader;
}

// Ties are broken by clockwise order starting after the current dominant party,
// not by keeping the incumbent (reference Turmoil.setNextPartyAsDominant).
function computeDominantParty(turmoil) {
  const counts = PARTIES.map(party => totalDelegates(turmoil, party.id));
  const max = Math.max(...counts);
  if (totalDelegates(turmoil, turmoil.dominantParty) === max) return turmoil.dominantParty;

  const currentIndex = PARTIES.findIndex(party => party.id === turmoil.dominantParty);
  let toCheck;
  if (currentIndex === 0) {
    toCheck = PARTIES.slice(1);
  } else if (currentIndex === PARTIES.length - 1) {
    toCheck = PARTIES.slice(0, currentIndex);
  } else {
    toCheck = [...PARTIES.slice(currentIndex + 1), ...PARTIES.slice(0, currentIndex)];
  }

  const ordered = [...toCheck].reverse();
  const winner = ordered.find(party => totalDelegates(turmoil, party.id) === max);
  return winner?.id ?? turmoil.dominantParty;
}

// Chairman +1; party leader of the dominant party +1 (and +1 more with another
// delegate there); otherwise +1 for having any delegate in the dominant party.
export function getInfluence(turmoil, playerId) {
  let influence = 0;
  if (turmoil.chairman === playerId) influence += 1;

  const dominant = turmoil.parties[turmoil.dominantParty];
  if (dominant) {
    const count = countDelegates(turmoil, turmoil.dominantParty, playerId);
    if (dominant.leader === playerId) {
      influence += 1;
      if (count > 1) influence += 1;
    } else if (count > 0) {
      influence += 1;
    }
  }
  influence += turmoil.playersInfluenceBonus?.[playerId] ?? 0;
  return influence;
}

// End of generation: the dominant party takes power, its bonus pays out, the
// chairman gains 1 TR, and the event queue advances.
export function advanceTurmoil(turmoil) {
  const next = cloneTurmoil(turmoil);
  const newRuling = next.dominantParty;
  const rulingParty = getParty(newRuling);

  const outgoingChairman = next.chairman;
  const dominant = next.parties[newRuling];
  const newChairman = dominant?.leader ?? NEUTRAL;

  // The outgoing chairman returns to their reserve; the new chairman leaves the party.
  if (outgoingChairman) {
    next.delegateReserve[outgoingChairman] = (next.delegateReserve[outgoingChairman] ?? 0) + 1;
  }
  if (dominant && newChairman) {
    const index = dominant.delegates.indexOf(newChairman);
    if (index >= 0) dominant.delegates.splice(index, 1);
    dominant.leader = computePartyLeader(dominant);
  }

  next.chairman = newChairman;
  next.rulingParty = newRuling;
  next.rulingPolicyId = rulingParty?.policies[0]?.id ?? null;

  const resolvedEvent = next.currentEvent;
  next.currentEvent = next.comingEvent;
  next.comingEvent = next.distantEvent;
  next.distantEvent = next.eventDeck.shift() ?? null;

  next.dominantParty = computeDominantParty(next);
  return { turmoil: next, resolvedEvent, newChairman, rulingParty: newRuling };
}

// Everyone gets one delegate back from the reserve into the lobby each generation.
export function refillLobby(turmoil, playerIds) {
  const next = cloneTurmoil(turmoil);
  next.lobby = [];
  for (const id of playerIds) {
    if ((next.delegateReserve[id] ?? 0) > 0) {
      next.delegateReserve[id] -= 1;
      next.lobby.push(id);
    }
  }
  return next;
}

export function getRulingPolicy(turmoil) {
  const party = getParty(turmoil?.rulingParty);
  if (!party) return null;
  return party.policies.find(policy => policy.id === turmoil.rulingPolicyId) ?? party.policies[0];
}

export function hasPolicy(turmoil, passiveName) {
  const policy = getRulingPolicy(turmoil);
  return policy?.passive === passiveName ? policy : null;
}

function cloneTurmoil(turmoil) {
  return {
    ...turmoil,
    parties: Object.fromEntries(
      Object.entries(turmoil.parties).map(([id, party]) => [
        id,
        { delegates: [...party.delegates], leader: party.leader }
      ])
    ),
    delegateReserve: { ...turmoil.delegateReserve },
    lobby: [...turmoil.lobby],
    eventDeck: [...turmoil.eventDeck],
    playersInfluenceBonus: { ...(turmoil.playersInfluenceBonus ?? {}) }
  };
}

export { cloneTurmoil };
