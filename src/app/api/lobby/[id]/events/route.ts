import {LobbyManager} from "@/server/_lobby";
import {LobbyEvent} from "@/app/common/lobby-events";
import {NextRequest} from "next/server";

export async function POST(request: NextRequest, context: { params: { id: string } }) {
    const { id: lobbyId } = await context.params;

    const lobby = LobbyManager.getLobby(lobbyId);

    const body = await request.json() as LobbyEvent;
    if(!body.triggerer) {
        return new Response("Missing 'triggerer' field in request body", { status: 400 });
    }

    lobby.processEvent(body.triggerer, body)

    return new Response(null, {
        status: 204
    });
}