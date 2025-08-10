import {Lobby, LobbyManager} from "@/server/_lobby";
import {randomUUID} from "node:crypto";

export async function POST(req: Request) {
    const formData = await req.formData();
    const ownerId = formData.get("id") as string;

    const lobbyId = randomUUID();
    LobbyManager.addLobby(new Lobby(lobbyId, ownerId))

    return new Response(null, {
        status: 303,
        headers: {
            AccessControlExposeHeaders: "Location",
            Location: `/buzzer/${lobbyId}`,
        },
    })
}