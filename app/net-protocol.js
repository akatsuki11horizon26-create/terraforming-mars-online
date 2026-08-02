// Wire format between the room server and each client.
//
// The server holds the only authoritative game state. Clients receive a view
// filtered for the player they are, never the full state: a hand you can read
// off the wire is a hand your opponent can read too.

export const PROTOCOL_VERSION = 1;

// Client -> server
export const CLIENT_MESSAGES = {
  JOIN: "join",
  START: "start",
  ACTION: "action",
  CHAT: "chat",
  LEAVE: "leave"
};

// Server -> client
export const SERVER_MESSAGES = {
  ROOM: "room",
  VIEW: "view",
  ERROR: "error",
  LOG: "log"
};

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 5;

// Room codes get read aloud and typed by hand, so the alphabet omits the
// characters people confuse. Typing one anyway is forgiven by folding it onto
// the character it looks like.
const CONFUSABLE = { I: "1", L: "1", O: "0", "0": "0", "1": "1" };

export function normalizeRoomCode(code) {
  const cleaned = String(code ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  let result = "";
  for (const char of cleaned) {
    const folded = CONFUSABLE[char] ?? char;
    // Fold onto a character the alphabet actually contains.
    if (ROOM_CODE_ALPHABET.includes(folded)) result += folded;
    else if (folded === "1") result += "J";
    else if (folded === "0") result += "Q";
  }
  return result.slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code) {
  const normalized = normalizeRoomCode(code);
  return normalized.length === ROOM_CODE_LENGTH;
}

export function generateRoomCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

// Fields on a player that only that player may see. Everything else about an
// opponent — resources, production, tags played, TR — is public in this game.
const PRIVATE_PLAYER_FIELDS = ["hand", "researchCards", "corporationOptions", "preludeOptions"];

function publicPlayer(player) {
  const visible = { ...player };
  for (const field of PRIVATE_PLAYER_FIELDS) {
    // Opponents see how many cards you hold, never which.
    visible[`${field}Count`] = Array.isArray(player[field]) ? player[field].length : 0;
    delete visible[field];
  }
  return visible;
}

// Builds the state one player is allowed to see. Their own record is complete;
// everyone else is reduced to counts.
export function viewForPlayer(state, viewerId) {
  if (!state) return null;
  return {
    ...state,
    players: state.players.map(player =>
      player.id === viewerId
        ? { ...player, isSelf: true }
        : { ...publicPlayer(player), isSelf: false }
    ),
    // A pending choice belonging to someone else must not leak its options,
    // which can name cards in their hand.
    pendingChoice:
      state.pendingChoice && state.pendingChoice.ownerPlayerId !== viewerId
        ? {
            id: state.pendingChoice.id,
            kind: state.pendingChoice.kind,
            ownerPlayerId: state.pendingChoice.ownerPlayerId,
            prompt: state.pendingChoice.prompt,
            optional: state.pendingChoice.optional,
            options: [],
            continuation: { stage: state.pendingChoice.continuation?.stage ?? "" },
            hidden: true
          }
        : state.pendingChoice,
    // The deck order is a secret; its size is not.
    deck: undefined,
    deckCount: state.deck?.length ?? 0,
    discardPile: undefined,
    discardCount: state.discardPile?.length ?? 0,
    viewerId
  };
}

export function roomSummary(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    started: room.started,
    maxPlayers: room.maxPlayers,
    options: room.options,
    members: room.members.map(member => ({
      playerId: member.playerId,
      name: member.name,
      connected: member.connected,
      isHost: member.playerId === room.hostId
    }))
  };
}

export function encode(message) {
  return JSON.stringify(message);
}

export function decode(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
