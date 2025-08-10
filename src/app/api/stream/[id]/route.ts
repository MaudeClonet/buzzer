import {LobbyManager} from '@/server/_lobby';
import {NextRequest} from "next/server";
import {LobbyEventType} from "@/app/common/lobby-events";

// Setup SSE for streaming lobby events
export async function GET(request: NextRequest, context: { params: { id: string } }) {
    const { id: lobbyId } = await context.params;

    const id = request.nextUrl.searchParams.get("id");
    if(!id) {
        return new Response("Missing 'id' query parameter", { status: 400 });
    }

    const lobby = LobbyManager.getLobby(lobbyId);

    const stream = new ReadableStream({
        start(controller) {
            lobby.addController(id, controller);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({...lobby.getGameState(), type: LobbyEventType.GAME_STATE})}\n\n`));
            if(id === lobby.owner) {
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: LobbyEventType.IS_ADMIN })}\n\n`));
            }
        },
        cancel() {
            const player = lobby.getPlayer(id);
            if(!player) return;
            console.debug("Player left " + id)
            lobby.removePlayer(id)
            lobby.removeController(id);
            lobby.broadcast({
                type: LobbyEventType.LEAVE_GAME,
                name: player.pseudo
            })
        }
    });

    return new Response(stream, {
        headers: {
            Connection: "keep-alive",
            "Content-Encoding": "none",
            "Cache-Control": "no-cache, no-transform",
            "Content-Type": "text/event-stream; charset=utf-8",
        },
    });
}