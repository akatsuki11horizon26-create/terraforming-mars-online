// Colonies: a set of colony tiles in play, each with a trade track, up to three
// colonies per tile, and one trade fleet per player to start. Follows the
// reference implementation (src/server/colonies).
import { COLONY_TILES, getColonyTile } from "./colony-tiles.js";

export const MAX_COLONY_TRACK_POSITION = 6;
export const MAX_COLONIES_PER_TILE = 3;
export const STARTING_FLEET_SIZE = 1;
export const MAX_FLEET_SIZE = 5;
// Two-player and solo games use fewer tiles than the full set.
export const TILES_IN_PLAY = { 1: 5, 2: 5, 3: 5, 4: 6, 5: 7 };

export { COLONY_TILES, getColonyTile };

export function createColoniesState(playerIds, shuffledTileIds) {
  const count = TILES_IN_PLAY[playerIds.length] ?? 5;
  const inPlay = shuffledTileIds.slice(0, count);

  const tiles = {};
  for (const id of inPlay) {
    tiles[id] = { id, trackPosition: 1, colonies: [] };
  }

  const fleets = {};
  const usedFleets = {};
  for (const playerId of playerIds) {
    fleets[playerId] = STARTING_FLEET_SIZE;
    usedFleets[playerId] = 0;
  }

  return { tilesInPlay: inPlay, tiles, fleets, usedFleets };
}

export function getTile(colonies, tileId) {
  return colonies?.tiles?.[tileId];
}

export function availableFleets(colonies, playerId) {
  return (colonies.fleets[playerId] ?? 0) - (colonies.usedFleets[playerId] ?? 0);
}

export function canBuildColony(colonies, tileId, playerId) {
  const tile = getTile(colonies, tileId);
  if (!tile) return { ok: false, reason: "その植民地は場にありません。" };
  if (tile.colonies.length >= MAX_COLONIES_PER_TILE) {
    return { ok: false, reason: "この植民地は満杯です。" };
  }
  if (tile.colonies.includes(playerId)) {
    return { ok: false, reason: "すでにこの植民地に入植しています。" };
  }
  return { ok: true, reason: "" };
}

// Building a colony pays the tile's build bonus and pushes the track marker up to
// the number of colonies present, so a crowded tile never trades below its size.
export function buildColony(colonies, tileId, playerId) {
  const check = canBuildColony(colonies, tileId, playerId);
  if (!check.ok) return { colonies, built: false, reason: check.reason, bonus: null };

  const next = cloneColonies(colonies);
  const tile = next.tiles[tileId];
  const definition = getColonyTile(tileId);
  const colonyIndex = tile.colonies.length;

  tile.colonies.push(playerId);
  if (tile.trackPosition < tile.colonies.length) {
    tile.trackPosition = tile.colonies.length;
  }

  return {
    colonies: next,
    built: true,
    reason: "",
    bonus: resolveBuildBonus(definition, colonyIndex)
  };
}

function resolveBuildBonus(definition, colonyIndex) {
  const build = definition?.build;
  if (!build) return null;
  const quantity = Array.isArray(build.quantity)
    ? build.quantity[Math.min(colonyIndex, build.quantity.length - 1)]
    : build.quantity;
  return { ...build, amount: quantity ?? 1 };
}

export function canTrade(colonies, tileId, playerId) {
  const tile = getTile(colonies, tileId);
  if (!tile) return { ok: false, reason: "その植民地は場にありません。" };
  if (availableFleets(colonies, playerId) <= 0) {
    return { ok: false, reason: "使用可能な交易船がありません。" };
  }
  if (tile.tradedThisGeneration) {
    return { ok: false, reason: "この植民地は今世代すでに交易されています。" };
  }
  return { ok: true, reason: "" };
}

// Trading pays the trader the benefit at the current track step, pays every
// colony owner on the tile their colony bonus, then resets the track to the
// number of colonies present.
export function trade(colonies, tileId, playerId) {
  const check = canTrade(colonies, tileId, playerId);
  if (!check.ok) return { colonies, traded: false, reason: check.reason };

  const next = cloneColonies(colonies);
  const tile = next.tiles[tileId];
  const definition = getColonyTile(tileId);
  const step = Math.min(tile.trackPosition, MAX_COLONY_TRACK_POSITION);

  const tradeBenefit = resolveTradeBenefit(definition, step);
  const colonyBonus = definition?.colony ?? null;
  const colonyOwners = [...tile.colonies];

  next.usedFleets[playerId] = (next.usedFleets[playerId] ?? 0) + 1;
  tile.tradedThisGeneration = true;
  tile.trackPosition = Math.max(tile.colonies.length, 0);

  return {
    colonies: next,
    traded: true,
    reason: "",
    tradeBenefit,
    colonyBonus,
    colonyOwners
  };
}

function resolveTradeBenefit(definition, step) {
  const tradeSpec = definition?.trade;
  if (!tradeSpec) return null;
  if (Array.isArray(tradeSpec.resourceTrack)) {
    // Europa: the track names a production type rather than an amount.
    return {
      ...tradeSpec,
      resource: tradeSpec.resourceTrack[Math.min(step, tradeSpec.resourceTrack.length - 1)],
      amount: 1
    };
  }
  const quantity = Array.isArray(tradeSpec.quantity)
    ? tradeSpec.quantity[Math.min(step, tradeSpec.quantity.length - 1)]
    : tradeSpec.quantity;
  return { ...tradeSpec, amount: quantity ?? 0 };
}

export function increaseTrack(colonies, tileId, steps = 1) {
  const next = cloneColonies(colonies);
  const tile = next.tiles[tileId];
  if (!tile) return colonies;
  tile.trackPosition = Math.min(tile.trackPosition + steps, MAX_COLONY_TRACK_POSITION);
  return next;
}

export function addFleet(colonies, playerId, amount = 1) {
  const next = cloneColonies(colonies);
  next.fleets[playerId] = Math.min((next.fleets[playerId] ?? 0) + amount, MAX_FLEET_SIZE);
  return next;
}

// Trade fleets return at the end of every generation.
export function resetFleets(colonies) {
  const next = cloneColonies(colonies);
  for (const playerId of Object.keys(next.usedFleets)) next.usedFleets[playerId] = 0;
  for (const tile of Object.values(next.tiles)) tile.tradedThisGeneration = false;
  return next;
}

export function countColonies(colonies, playerId) {
  return Object.values(colonies?.tiles ?? {}).reduce(
    (sum, tile) => sum + tile.colonies.filter(owner => owner === playerId).length,
    0
  );
}

export function cloneColonies(colonies) {
  return {
    ...colonies,
    tilesInPlay: [...colonies.tilesInPlay],
    tiles: Object.fromEntries(
      Object.entries(colonies.tiles).map(([id, tile]) => [
        id,
        { ...tile, colonies: [...tile.colonies] }
      ])
    ),
    fleets: { ...colonies.fleets },
    usedFleets: { ...colonies.usedFleets }
  };
}
