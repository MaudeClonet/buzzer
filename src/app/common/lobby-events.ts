export enum LobbyEventType {
    NO_EVENT,
    ASK_GAME_STATE,
    GAME_STATE,
    JOIN_GAME,
    LEAVE_GAME,
    NAME_CHANGED,
    BUZZ,
    READY,
    NOT_READY,
    RELEASE_BUZZER,
    POP_FIRST_BUZZER,
    IS_ADMIN
}

export type LobbyEvent = {} & (NoBodyPayload | GameStatePayload | JoinGamePayload | NameChangedPayload | ReadyPayload);

type BasePayload = {
    type: LobbyEventType;
    triggerer?: string;
}

export type NoBodyPayload = BasePayload & {
    type: LobbyEventType.ASK_GAME_STATE | LobbyEventType.BUZZ | LobbyEventType.RELEASE_BUZZER | LobbyEventType.IS_ADMIN | LobbyEventType.POP_FIRST_BUZZER;
};

export type LobbyState = {
    players: string[];
    buzzedPlayers: string[];
    readyPlayers: string[];
}

export type GameStatePayload = BasePayload & LobbyState & {
    type: LobbyEventType.GAME_STATE
}

export type JoinGamePayload = BasePayload & {
    type: LobbyEventType.JOIN_GAME | LobbyEventType.LEAVE_GAME,
    name: string;
}

export type NameChangedPayload = BasePayload & {
    type: LobbyEventType.NAME_CHANGED,
    previousName?: string;
    name: string;
}

export type ReadyPayload = BasePayload & {
    type: LobbyEventType.READY | LobbyEventType.NOT_READY,
    player?: string;
}