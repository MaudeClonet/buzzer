'use client'

import './buzzer.css'
import {use, useEffect, useState} from 'react';
import {LobbyEvent, LobbyEventType} from "@/app/common/lobby-events";

type Lobby = {
    players: string[];
    buzzedPlayers: string[];
    readyPlayers: string[];
}

export default function BuzzerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: lobbyId } = use(params);
    const [uid, setUid] = useState<string | null>();
    const [gameJoined, setGameJoined] = useState<boolean>(false);
    const [nameChanged, setNameChanged] = useState<boolean>(false);
    const [init, setInit] = useState<boolean>(false);
    const [name, setName] = useState<string | null>();
    const [lobby, setLobby] = useState<Lobby>({
        players: [],
        buzzedPlayers: [],
        readyPlayers: []
    });
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        setUid(localStorage.getItem('uid'));
        setName(localStorage.getItem('pseudo'));
        setInit(true);
    }, []);

    useEffect(() => {
        if (!uid && init) {
            const newUid = crypto.randomUUID();
            localStorage.setItem('uid', newUid);
            setUid(newUid);
        }
    }, [uid])

    useEffect(() => {
        if (init && uid && name) {
            if (!gameJoined) {
                sendEvent({
                    type: LobbyEventType.JOIN_GAME,
                    name: name
                })
                setGameJoined(true);
                return;
            } else if (nameChanged) {
                sendEvent({
                    type: LobbyEventType.NAME_CHANGED,
                    name: name
                })
            }
        }
    }, [init, uid, name]);

    useEffect(() => {
        if (!init || !uid) return;
        const eventSource = new EventSource(`/api/stream/${lobbyId}?id=${uid}`);
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data) as LobbyEvent;

            switch (data.type) {
                case LobbyEventType.GAME_STATE: {
                    setLobby(data as unknown as Lobby);
                    break;
                }

                case LobbyEventType.JOIN_GAME: {
                    const joinEvent = data as { type: LobbyEventType.JOIN_GAME, name: string };
                    setLobby(prev => ({
                        ...prev,
                        players: [...(prev?.players || []), joinEvent.name]
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.LEAVE_GAME: {
                    const joinEvent = data as { type: LobbyEventType.LEAVE_GAME, name: string };
                    setLobby(prev => ({
                        ...prev,
                        players: prev?.players.filter(p => p !== joinEvent.name) || []
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.NAME_CHANGED: {
                    const nameChangeEvent = data as { type: LobbyEventType.NAME_CHANGED, previousName?: string, name: string };
                    setLobby(prev => ({
                        ...prev,
                        players: prev?.players.map(p => p === nameChangeEvent.previousName ? nameChangeEvent.name : p) || []
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.BUZZ: {
                    const buzzEvent = data as { type: LobbyEventType.BUZZ, triggerer?: string };
                    setLobby(prev => ({
                        ...prev,
                        buzzedPlayers: [...(prev?.buzzedPlayers || []), buzzEvent.triggerer || '']
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.RELEASE_BUZZER: {
                    setLobby(prev => ({
                        ...prev,
                        readyPlayers: [],
                        buzzedPlayers: []
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.POP_FIRST_BUZZER: {
                    setLobby(prev => ({
                        ...prev,
                        buzzedPlayers: prev.buzzedPlayers.slice(1, prev.buzzedPlayers.length)
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.READY: {
                    const readyEvent = data as { type: LobbyEventType.READY, player?: string };
                    setLobby(prev => ({
                        ...prev,
                        readyPlayers: [...(prev?.readyPlayers || []), readyEvent.player || '']
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.NOT_READY: {
                    const readyEvent = data as { type: LobbyEventType.NOT_READY, player?: string };
                    setLobby(prev => ({
                        ...prev,
                        readyPlayers: prev.readyPlayers.filter(p => p !== readyEvent.player)
                    }) as unknown as Lobby);
                    break;
                }

                case LobbyEventType.IS_ADMIN: {
                    setIsAdmin(true);
                }
            }
        };
        eventSource.onerror = (err) => {
            console.error('SSE error:', err);
            eventSource.close();
        };
        return () => {
            eventSource.close();
        };
    }, [lobbyId, uid]);

    const sendEvent = (lobbyEvent: LobbyEvent) => {
        if (!init) return;

        if (!uid) {
            console.error("UID is not set, cannot send event.");
            return;
        }
        fetch(`/api/lobby/${lobbyId}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...lobbyEvent, triggerer: uid }),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error sending event: ${response.statusText}`);
                }
            })
            .catch(error => {
                console.error('Failed to send event:', error);
            });
    }

    return (
        <main className={`${lobby?.buzzedPlayers && lobby?.buzzedPlayers[0] === name ? 'first' : ''} ${lobby?.buzzedPlayers && lobby?.buzzedPlayers.includes(name ?? "") ? 'buzzed' : ''}`}>
            <div className="buzzer-top">
            {init && !name && (
                <div>
                    <h2>Pseudo</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const nameInput = form.elements.namedItem('name') as HTMLInputElement;
                        if (nameInput && nameInput.value) {
                            localStorage.setItem('pseudo', nameInput.value);
                            setName(nameInput.value);
                            setNameChanged(true);
                        }
                    }}>
                        <input type="text" name="name" placeholder="Your Name" required/>
                        <button type="submit">Set Name</button>
                    </form>
                </div>
            )}

            {init && lobby && (
                <div className="buzzer-columns-responsive">
                    <div className="background-players grid-cols-1">
                        <h2>Players</h2>
                        {lobby.players.map((player, index) => (
                            <p key={"player-name-" + index}>{player.substring(0, 25)}{lobby.readyPlayers.includes(player) ? " (ready)" : ""}</p>
                        ))}
                    </div>

                    {lobby.buzzedPlayers && lobby.buzzedPlayers.length > 0 && (
                        <div className="background-players grid-cols-1 background-offset">
                            <h2>Buzzers</h2>
                            {lobby.buzzedPlayers.map((player, index) => (
                                <p key={"player-name-" + index}>{player.substring(0, 25)}{lobby.buzzedPlayers.includes(player) ? " (ready)" : ""}</p>
                            ))}
                        </div>
                    )}

                    {isAdmin && (
                        <div className="buzzer-container buzzer-admin">
                            <button onClick={() => {
                                sendEvent({ type: LobbyEventType.POP_FIRST_BUZZER })
                            }}>Pop first buzzer
                            </button>
                            <button onClick={() => {
                                sendEvent({ type: LobbyEventType.RELEASE_BUZZER })
                            }}>Release buzzer
                            </button>
                        </div>
                    )}
                </div>
            )}
            </div>
            <div className="buzzer-bottom">
                {init && lobby && (
                    <div className="buzzer-container buzzer-buttons">
                        {!lobby.readyPlayers.includes(name ?? "") && (
                            <button className="buzzer-fill-button" onClick={() => sendEvent({ type: LobbyEventType.READY })}>READY</button>
                        )}
                        {lobby.readyPlayers.includes(name ?? "") && (
                            <>
                                <button onClick={() => sendEvent({ type: LobbyEventType.NOT_READY })}>NOT READY</button>
                                <button disabled={lobby.buzzedPlayers.length > 0 && lobby.buzzedPlayers[0] === name} className="buzzer-fill-button" onClick={() => sendEvent({ type: LobbyEventType.BUZZ })}>BUZZ</button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
