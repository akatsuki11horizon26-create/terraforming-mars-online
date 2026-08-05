/**
 * One Durable Object per room. It owns the only authoritative copy of the game
 * state; clients never send state, only intents, and never receive another
 * player's hand.
 */
import {
  getInitialState,
  applyCorporation,
  draftPick,
  applyPreludes,
  applyCardEffect,
  applyCardAction,
  resolvePendingChoice,
  handleActionSpend,
  passPlayer,
  endTurn,
  claimMilestone,
  fundAward,
  sendDelegateToParty,
  buildColonyOn,
  tradeWith,
  getCardPaymentCost,
  getCardPlayableStatus,
  ALL_CARDS,
  CORPORATIONS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import {
  CLIENT_MESSAGES,
  SERVER_MESSAGES,
  decode,
  encode,
  roomSummary,
  viewForPlayer
} from "../app/net-protocol.js";

interface Member {
  playerId: string;
  name: string;
  connected: boolean;
  socket?: WebSocket;
}

interface RoomOptions {
  turmoil: boolean;
  colonies: boolean;
  prelude: boolean;
  venus: boolean;
  promo: boolean;
  board: string;
  draft: boolean;
  maxPlayers: number;
}

const MAX_MEMBERS = 5;
const RESEARCH_CARD_COST = 3;

export class GameRoom {
  private state: DurableObjectState;
  private members: Member[] = [];
  private game: Record<string, unknown> | null = null;
  private code = "";
  private hostId: string | null = null;
  private started = false;
  private options: RoomOptions = { turmoil: false, colonies: false, prelude: false, venus: false, promo: false, board: "tharsis", draft: false, maxPlayers: 5 };
  private loaded = false;
  // member id -> the seat (engine player id) they occupy
  private seatMap = new Map<string, string | undefined>();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load() {
    if (this.loaded) return;
    const stored = await this.state.storage.get<{
      code: string;
      hostId: string | null;
      started: boolean;
      options: RoomOptions;
      members: Omit<Member, "socket">[];
      game: Record<string, unknown> | null;
      seats: [string, string][];
    }>("room");
    if (stored) {
      this.code = stored.code;
      this.hostId = stored.hostId;
      this.started = stored.started;
      this.options = stored.options;
      // Sockets do not survive hibernation; everyone reconnects.
      this.members = stored.members.map(member => ({ ...member, connected: false }));
      this.game = stored.game;
      // Without this a room evicted from memory would forget which seat each
      // member holds, and every reconnect would be rejected.
      this.seatMap = new Map(stored.seats ?? []);
    }
    this.loaded = true;
  }

  private async persist() {
    await this.state.storage.put("room", {
      code: this.code,
      hostId: this.hostId,
      started: this.started,
      options: this.options,
      members: this.members.map(({ playerId, name, connected }) => ({ playerId, name, connected })),
      game: this.game,
      seats: [...this.seatMap].filter(([, seat]) => Boolean(seat)) as [string, string][]
    });
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ws")) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      this.accept(server, url.searchParams);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.endsWith("/info")) {
      return Response.json({
        exists: this.members.length > 0 || this.started,
        started: this.started,
        players: this.members.length,
        maxPlayers: this.options.maxPlayers
      });
    }

    return new Response("Not found", { status: 404 });
  }

  private accept(socket: WebSocket, params: URLSearchParams) {
    socket.accept();

    const code = params.get("code") ?? "";
    const name = (params.get("name") ?? "").trim();
    const playerId = params.get("playerId") ?? "";

    if (!this.code) this.code = code;

    socket.addEventListener("message", event => {
      const message = decode(typeof event.data === "string" ? event.data : "");
      if (!message) return;
      this.handle(socket, message, { playerId, name });
    });

    socket.addEventListener("close", () => {
      const member = this.members.find(m => m.socket === socket);
      if (member) {
        member.connected = false;
        member.socket = undefined;
        this.broadcastRoom();
        void this.persist();
      }
    });
  }

  private send(socket: WebSocket, message: unknown) {
    try {
      socket.send(encode(message));
    } catch {
      // The socket died between checks; the close handler will clean up.
    }
  }

  private fail(socket: WebSocket, reason: string) {
    this.send(socket, { type: SERVER_MESSAGES.ERROR, reason });
  }

  private broadcastRoom() {
    const summary = roomSummary({
      code: this.code,
      hostId: this.hostId,
      started: this.started,
      maxPlayers: this.options.maxPlayers,
      options: this.options,
      members: this.members
    });
    for (const member of this.members) {
      if (member.socket) this.send(member.socket, { type: SERVER_MESSAGES.ROOM, room: summary });
    }
  }

  // Every player gets their own filtered view, so a hand never crosses to
  // another device.
  private broadcastViews() {
    if (!this.game) return;
    for (const member of this.members) {
      if (!member.socket) continue;
      // Filter by the seat this member occupies, not their device id: the
      // engine's players are identified by seat.
      const seat = this.seatOf(member.playerId);
      if (!seat) continue;
      this.send(member.socket, {
        type: SERVER_MESSAGES.VIEW,
        view: viewForPlayer(this.game, seat)
      });
    }
  }

  private handle(socket: WebSocket, message: Record<string, unknown>, identity: { playerId: string; name: string }) {
    switch (message.type) {
      case CLIENT_MESSAGES.JOIN:
        return this.onJoin(socket, identity);
      case CLIENT_MESSAGES.START:
        return this.onStart(socket, identity.playerId, message);
      case CLIENT_MESSAGES.ACTION:
        return this.onAction(socket, identity.playerId, message);
      case CLIENT_MESSAGES.LEAVE:
        return this.onLeave(identity.playerId);
      default:
        return this.fail(socket, "不明なメッセージです。");
    }
  }

  private onJoin(socket: WebSocket, identity: { playerId: string; name: string }) {
    const existing = this.members.find(m => m.playerId === identity.playerId);

    if (existing) {
      // Reconnect: the same player returning to their seat.
      existing.socket = socket;
      existing.connected = true;
      if (identity.name) existing.name = identity.name;
    } else {
      if (this.started) return this.fail(socket, "このゲームは既に開始しています。");
      if (this.members.length >= MAX_MEMBERS) return this.fail(socket, "この部屋は満員です。");
      this.members.push({
        playerId: identity.playerId,
        name: identity.name || `プレイヤー${this.members.length + 1}`,
        connected: true,
        socket
      });
      if (!this.hostId) this.hostId = identity.playerId;
    }

    this.broadcastRoom();
    if (this.game) this.broadcastViews();
    void this.persist();
  }

  private onStart(socket: WebSocket, playerId: string, message: Record<string, unknown>) {
    if (playerId !== this.hostId) return this.fail(socket, "ゲームを開始できるのは部屋の作成者だけです。");
    if (this.started) return this.fail(socket, "既に開始しています。");
    if (this.members.length < 2) return this.fail(socket, "2人以上必要です。");

    const options = (message.options ?? {}) as Partial<RoomOptions>;
    this.options = {
      turmoil: Boolean(options.turmoil),
      colonies: Boolean(options.colonies),
      prelude: Boolean(options.prelude),
      venus: Boolean(options.venus),
      promo: Boolean(options.promo),
      board: typeof options.board === "string" ? options.board : "tharsis",
      draft: Boolean(options.draft),
      maxPlayers: this.members.length
    };

    const created = getInitialState({
      playerCount: this.members.length,
      playerNames: this.members.map(m => m.name),
      turmoil: this.options.turmoil,
      colonies: this.options.colonies,
      prelude: this.options.prelude,
      venus: this.options.venus,
      promo: this.options.promo,
      board: this.options.board,
      draft: this.options.draft
    }) as Record<string, unknown>;

    // Bind each member to the seat they occupy, so a device can only ever act as
    // its own player no matter what it sends.
    const players = created.players as { id: string }[];
    this.seatMap = new Map(this.members.map((member, index) => [member.playerId, players[index]?.id]));

    this.game = created;
    this.started = true;
    this.broadcastRoom();
    this.broadcastViews();
    void this.persist();
  }

  private seatOf(playerId: string): string | undefined {
    return this.seatMap.get(playerId);
  }

  private onAction(socket: WebSocket, playerId: string, message: Record<string, unknown>) {
    if (!this.game) return this.fail(socket, "ゲームが開始していません。");
    const seat = this.seatOf(playerId);
    if (!seat) return this.fail(socket, "あなたはこのゲームの参加者ではありません。");

    const state = this.game as Record<string, unknown>;
    const action = String(message.action ?? "");
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    // Everything except resolving your own pending choice requires it to be
    // your turn. The server decides this, not the client.
    const isOwnPendingChoice =
      action === "resolveChoice" &&
      (state.pendingChoice as { ownerPlayerId?: string } | null)?.ownerPlayerId === seat;
    if (!isOwnPendingChoice && state.currentPlayerId !== seat) {
      return this.fail(socket, "あなたの手番ではありません。");
    }
    if (state.pendingChoice && !isOwnPendingChoice) {
      return this.fail(socket, "先に選択を解決してください。");
    }
    // A pass is final for the generation, whatever the client sends.
    const seatPlayer = (state.players as { id: string; passed?: boolean }[]).find(p => p.id === seat);
    if (seatPlayer?.passed) {
      return this.fail(socket, "パス済みのため、この世代は行動できません。");
    }

    try {
      const next = this.applyAction(state, seat, action, payload);
      if (!next) return this.fail(socket, "不正な操作です。");
      this.game = next;
    } catch (error) {
      return this.fail(socket, `処理に失敗しました: ${(error as Error).message}`);
    }

    this.broadcastViews();
    void this.persist();
  }

  // Actions the shared command layer owns. Routing them through it is what
  // stops the server, the offline UI and the bot each enforcing their own
  // version of a rule: the seat check, the possession check and spending an
  // action now happen in exactly one place.
  private static readonly COMMAND_MAP: Record<string, string> = {
    playCard: COMMAND.PLAY_CARD,
    cardAction: COMMAND.USE_CARD_ACTION,
    claimMilestone: COMMAND.CLAIM_MILESTONE,
    fundAward: COMMAND.FUND_AWARD,
    sendDelegate: COMMAND.SEND_DELEGATE,
    buildColony: COMMAND.BUILD_COLONY,
    trade: COMMAND.TRADE,
    pass: COMMAND.PASS,
    endTurn: COMMAND.END_TURN,
    resolveChoice: COMMAND.RESOLVE_PENDING,
    chooseCorporation: COMMAND.SELECT_CORPORATION,
    choosePreludes: COMMAND.SELECT_PRELUDES,
    draftPick: COMMAND.DRAFT_PICK,
    buyResearch: COMMAND.BUY_RESEARCH,
    standardProject: COMMAND.STANDARD_PROJECT
  };

  private applyAction(
    state: Record<string, unknown>,
    seat: string,
    action: string,
    payload: Record<string, unknown>
  ): Record<string, unknown> | null {
    const logs = state.logs as unknown[];
    const asState = state as never;

    const commandType = GameRoom.COMMAND_MAP[action];
    if (commandType) {
      // playerId comes from the authenticated seat, never from the payload.
      const result = executeGameCommand(asState, {
        ...payload,
        type: commandType,
        playerId: seat,
        optionId: payload.optionId ?? payload.choiceId,
        cardIds: payload.cardIds,
        projectId: payload.projectId
      } as never) as { ok: boolean; state: unknown };
      return result.ok ? (result.state as Record<string, unknown>) : null;
    }

    // Milestones, awards, delegates, colonies and trades each cost an action.
    // A refused attempt must not spend one.
    const spendOnSuccess = (result: {
      state?: unknown;
      logs?: unknown;
      claimed?: boolean;
      funded?: boolean;
      sent?: boolean;
      built?: boolean;
      traded?: boolean;
    }): Record<string, unknown> | null => {
      if (!result?.state) return null;
      const succeeded = result.claimed || result.funded || result.sent || result.built || result.traded;
      if (!succeeded) return result.state as Record<string, unknown>;
      const spent = handleActionSpend(result.state as never, (result.logs ?? logs) as never);
      return spent as unknown as Record<string, unknown>;
    };

    switch (action) {
      case "chooseCorporation":
        return applyCorporation(asState, String(payload.corporationId), seat) as never;

      case "draftPick":
        return draftPick(asState, String(payload.cardId), seat) as never;

      case "choosePreludes":
        return applyPreludes(asState, payload.preludeIds as string[], seat) as never;

      case "buyResearch": {
        const ids = (payload.cardIds as string[]) ?? [];
        const player = (state.players as { id: string; researchCards: string[]; mc: number; hand: string[] }[])
          .find(p => p.id === seat);
        if (!player) return null;
        // includes() alone accepts ["A","A","A"] against a single offered A,
        // which duplicated the card into the hand.
        if (new Set(ids).size !== ids.length) return null;
        if (!ids.every(id => player.researchCards.includes(id))) return null;
        const cost = ids.length * RESEARCH_CARD_COST;
        if (player.mc < cost) return null;

        const next = { ...state } as Record<string, unknown>;
        next.players = (state.players as Record<string, unknown>[]).map(p =>
          p.id === seat
            ? {
                ...p,
                mc: (p.mc as number) - cost,
                hand: [...(p.hand as string[]), ...ids],
                researchCards: []
              }
            : p
        );
        next.discardPile = [
          ...(state.discardPile as string[]),
          ...player.researchCards.filter(id => !ids.includes(id))
        ];
        return next;
      }

      case "playCard": {
        const card = ALL_CARDS.find((c: { id: string }) => c.id === String(payload.cardId));
        if (!card) return null;
        // A client can send any card id. Without this it could play a card it
        // never drew, since the engine only checks whether the card is legal.
        const actor = (state.players as { id: string; hand: string[] }[]).find(p => p.id === seat);
        if (!actor?.hand.includes(card.id)) return null;
        const status = getCardPlayableStatus(card, asState, 0, 0) as { playable: boolean };
        if (!status.playable) return null;
        const cost = getCardPaymentCost(card, asState, 0, 0) as number;

        // Helion may pay with heat. getCardPlayableStatus counts it towards the
        // cost, so spending only megacredits drove MC negative.
        const corporation = CORPORATIONS.find(
          (item: { id: string }) => item.id === (actor as unknown as { corporationId?: string }).corporationId
        ) as { effects?: { heatAsMoney?: boolean } } | undefined;
        const wallet = actor as unknown as { mc: number; heat: number };
        const heatPaid = corporation?.effects?.heatAsMoney
          ? Math.max(0, Math.min(wallet.heat ?? 0, cost - (wallet.mc ?? 0)))
          : 0;

        let next = { ...state } as Record<string, unknown>;
        next.players = (state.players as Record<string, unknown>[]).map(p =>
          p.id === seat
            ? {
                ...p,
                mc: (p.mc as number) - (cost - heatPaid),
                heat: (p.heat as number) - heatPaid,
                hand: (p.hand as string[]).filter(id => id !== card.id),
                playedProjects: [...(p.playedProjects as string[]), card.id]
              }
            : p
        );
        const result = applyCardEffect(next as never, card, logs) as { state: never };
        next = result.state as never;
        return handleActionSpend(next as never, (next as { logs: unknown[] }).logs) as never;
      }

      case "cardAction": {
        const card = ALL_CARDS.find((c: { id: string; type: string }) => c.id === String(payload.cardId));
        if (!card) return null;
        // Only a blue card the sender has actually played carries an action.
        const owner = (state.players as { id: string; playedProjects: string[] }[]).find(p => p.id === seat);
        if (!owner?.playedProjects.includes(card.id)) return null;
        if (card.type !== "active") return null;
        const result = applyCardAction(asState, card, logs) as { state: never; playable: boolean };
        if (!result.playable) return null;
        return handleActionSpend(result.state, (result.state as { logs: unknown[] }).logs) as never;
      }

      case "resolveChoice": {
        const result = resolvePendingChoice(
          asState,
          String(payload.optionId),
          logs,
          seat
        ) as { state: never };
        return result.state as never;
      }

      // Each of these is one action, and only a successful attempt spends it.
      case "claimMilestone":
        return spendOnSuccess(claimMilestone(asState, String(payload.milestoneId), logs, seat));

      case "fundAward":
        return spendOnSuccess(fundAward(asState, String(payload.awardId), logs, seat));

      case "sendDelegate":
        return spendOnSuccess(sendDelegateToParty(asState, String(payload.partyId), logs, seat));

      case "buildColony":
        return spendOnSuccess(buildColonyOn(asState, String(payload.tileId), logs, seat));

      case "trade":
        return spendOnSuccess(tradeWith(asState, String(payload.tileId), logs, seat));

      case "pass":
        // Only ends the generation once every player has passed. After acting,
        // this ends the turn instead of leaving the generation.
        return (passPlayer(asState, logs, seat) as { state: never }).state as never;

      case "endTurn":
        return (endTurn(asState, logs, seat) as { state: never }).state as never;

      default:
        return null;
    }
  }

  private onLeave(playerId: string) {
    const member = this.members.find(m => m.playerId === playerId);
    if (!member) return;
    member.connected = false;
    member.socket = undefined;
    // Before the game starts a leaver frees their seat; afterwards the seat is
    // kept so they can reconnect.
    if (!this.started) {
      this.members = this.members.filter(m => m.playerId !== playerId);
      if (this.hostId === playerId) this.hostId = this.members[0]?.playerId ?? null;
    }
    this.broadcastRoom();
    void this.persist();
  }
}
