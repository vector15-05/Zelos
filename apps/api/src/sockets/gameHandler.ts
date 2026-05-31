import { WebSocket } from "ws";
import { RoomManager } from "../services/RoomManager";

const hostConnections = new Map<string, WebSocket>();

export const gameHandler = async (ws: WebSocket, rawMessage: string) => {
    try {
        const message = JSON.parse(rawMessage);

        switch (message.action) {
            case "CREATE_ROOM":
                if (!message.quizId) throw new Error("Missing quizId");

                const pin = await RoomManager.createRoom(message.quizId);

                ws.send(JSON.stringify({
                    event: "room_created",
                    pin: pin,
                    message: `Lobby opened! Players can join with PIN: ${pin}`
                }));

                hostConnections.set(pin, ws); //Websocket of da host

                break;

            case "JOIN_ROOM":
                if (!message.pin || !message.playerName) throw new Error("Missing pin or playerName");

                const success = await RoomManager.joinRoom(message.pin, message.playerName);

                if (success) {
                    ws.send(JSON.stringify({
                        event: "joined_successfully",
                        pin: message.pin,
                        playerName: message.playerName
                    }));

                    // Broadcasting to host that a new challenger approaches
                    const hostSocket = hostConnections.get(message.pin);
                    if (hostSocket && hostSocket.readyState === WebSocket.OPEN) {
                        hostSocket.send(JSON.stringify({
                            event: "player_joined",
                            playerName: message.playerName,
                            message: `${message.playerName} has entered the lobby!`
                        }));
                    } 
                }else {
                        ws.send(JSON.stringify({
                            event: "error",
                            message: "Invalid PIN or Room Expired"
                        }));
                    }
                    break;

            default:
                ws.send(JSON.stringify({
                    event: "error",
                    message: "Unknown action"
                }));

        }
    } catch (err) {
        console.error("Error handling game message in socket: ", err);
        ws.send(JSON.stringify({ type: "error", message: "An error occurred while processing your request." }));
    }
}

export const handleDisconnect = (ws: WebSocket) => {
    for (const [pin, socket] of hostConnections.entries()) {
        if (socket === ws) {
            hostConnections.delete(pin);
            console.log(`Host for room ${pin} disconnected. Room closed.`);
            break;
        }
    }
}