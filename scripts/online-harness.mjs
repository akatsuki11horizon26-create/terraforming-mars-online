import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode
} from "../app/net-protocol.js";

const issuedRoomCodes = new Set();

function getOnlineRoomCode(candidate, random) {
  const code = candidate === undefined ? generateRoomCode(random) : candidate;
  const normalized = normalizeRoomCode(code);

  if (!isValidRoomCode(code) || normalized !== code) {
    throw new Error(
      `room code ${code} is not kept verbatim as a five-character room code ` +
        `(server normalisation: ${normalized})`
    );
  }
  if (issuedRoomCodes.has(code)) {
    throw new Error(
      `room code ${code} was already issued in this process; independent trials need distinct rooms`
    );
  }

  issuedRoomCodes.add(code);
  return code;
}

export function createOnlineRun({
  code,
  base = process.env.TM_WS ?? "ws://localhost:3000",
  random = Math.random
} = {}) {
  const roomCode = getOnlineRoomCode(code, random);

  return Object.freeze({
    code: roomCode,
    base,
    webSocketUrl(playerId, name) {
      const url = new URL(`/api/room/${roomCode}/ws`, base);
      url.searchParams.set("playerId", playerId);
      url.searchParams.set("name", name);
      return url.toString();
    }
  });
}
