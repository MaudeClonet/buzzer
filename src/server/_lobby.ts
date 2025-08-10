import {LobbyEvent, LobbyEventType, LobbyState} from "@/app/common/lobby-events";

export type Player = {
    id: string;
    pseudo: string;
}

export class Lobby {
    constructor(
        public readonly id: string,
        public readonly owner: string,
        public players: Player[] = [],
        public buzzedPlayers: Player[] = [],
        public readyPlayers: Player[] = []
    ) {
    }

    private controllers: Map<string, ReadableStreamDefaultController> = new Map();

    addPlayer(id: string, pseudo: string): Player {
        const player = { id, pseudo };
        this.players.push(player);
        return player;
    }

    removePlayer(id: string) {
        this.players = this.players.filter(player => player.id !== id);
    }

    getPlayer(id: string): Player | undefined {
        return this.players.find(player => player.id === id);
    }

    addController(id: string, controller: ReadableStreamDefaultController) {
        this.controllers.set(id, controller);
    }

    removeController(id: string) {
        this.controllers.delete(id);
    }

    getGameState(): LobbyState {
        return {
            players: this.players.map(p => p.pseudo),
            buzzedPlayers: this.buzzedPlayers.map(p => p.pseudo),
            readyPlayers: this.readyPlayers.map(p => p.pseudo)
        }
    }

    processEvent(id: string, event: LobbyEvent) {
        console.log(`Processing ${id} event: ${JSON.stringify(event)}`);

        const player = this.getPlayer(id);
        if (!player && event.type === LobbyEventType.JOIN_GAME) {
            const newPlayer = this.addPlayer(id, event.name);
            this.broadcast({
                type: LobbyEventType.JOIN_GAME,
                name: newPlayer.pseudo,
            })
            return;
        } else if (player && event.type === LobbyEventType.JOIN_GAME) {
            const previousPseudo = player.pseudo;
            player.pseudo = event.name;
            this.broadcast({
                type: LobbyEventType.NAME_CHANGED,
                previousName: previousPseudo,
                name: player.pseudo,
            });
            return;
        }

        if (!player) {
            throw new Error(`Player with id ${id} not found in lobby ${this.id}.`);
        }

        switch (event.type) {
            case LobbyEventType.ASK_GAME_STATE:
                this.dispatch(id, {
                    ...this.getGameState(),
                    type: LobbyEventType.GAME_STATE
                })
                return;

            case LobbyEventType.NAME_CHANGED:
                const previousName = player.pseudo;
                player.pseudo = event.name;
                this.broadcast({
                    type: LobbyEventType.NAME_CHANGED,
                    previousName: previousName,
                    name: player.pseudo,
                })
                return;

            case LobbyEventType.BUZZ:
                if(this.buzzedPlayers.includes(player)) return;
                this.buzzedPlayers.push(player);
                this.broadcast({
                    type: LobbyEventType.BUZZ,
                    triggerer: player.pseudo
                });
                return;

            case LobbyEventType.READY:
                if(this.readyPlayers.includes(player)) return;
                this.readyPlayers.push(player);
                this.broadcast({
                    type: LobbyEventType.READY,
                    player: player.pseudo
                })
                return;

            case LobbyEventType.NOT_READY:
                if(!this.readyPlayers.includes(player)) return;
                this.readyPlayers = this.readyPlayers.filter(p => p !== player);
                this.broadcast({
                    type: LobbyEventType.NOT_READY,
                    player: player.pseudo
                })
                return;

            case LobbyEventType.RELEASE_BUZZER:
                this.buzzedPlayers = [];
                this.readyPlayers = [];
                this.broadcast({
                    type: LobbyEventType.RELEASE_BUZZER,
                })
                return;

            case LobbyEventType.POP_FIRST_BUZZER:
                if(this.buzzedPlayers.length <= 0) return;
                this.buzzedPlayers = this.buzzedPlayers.slice(1, this.buzzedPlayers.length);
                this.broadcast({
                    type: LobbyEventType.POP_FIRST_BUZZER,
                })
                return;

            default:
                throw new Error(`Unknown event type: ${event.type}`);
        }
    }

    dispatch(id: string, event: LobbyEvent) {
        const textEncoder = new TextEncoder();
        this.controllers.get(id)?.enqueue(textEncoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }

    broadcast(event: LobbyEvent) {
        const textEncoder = new TextEncoder();
        for (const controller of this.controllers.values()) {
            controller.enqueue(textEncoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
    }
}

class LobbyManagerClass {
    constructor(
        private lobbies: Map<string, Lobby> = new Map()
    ) {
    }

    addLobby(lobby: Lobby) {
        if (this.lobbies.has(lobby.id)) {
            throw new Error(`Lobby with id ${lobby.id} already exists.`);
        }
        console.debug(`Adding lobby with id ${lobby.id}`);
        this.lobbies.set(lobby.id, lobby);
    }

    getLobby(lobbyId: string): Lobby {
        if (!this.lobbies.has(lobbyId)) {
            throw new Error(`Lobby with id ${lobbyId} not found.`);
        }
        return this.lobbies.get(lobbyId) as Lobby;
    }
}

let globalLobbyManager: LobbyManagerClass | undefined = (global as any)._lobbyManager;
if (!globalLobbyManager) {
    globalLobbyManager = new LobbyManagerClass();
    (global as any)._lobbyManager = globalLobbyManager;
}
export const LobbyManager = globalLobbyManager;
