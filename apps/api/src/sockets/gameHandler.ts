import { WebSocket } from "ws";
import { RoomManager } from "../services/RoomManager";

const hostConnections = new Map<string, WebSocket>();
const playerConnections = new Map<string, Set<WebSocket>>();

export const gameHandler = async (ws: WebSocket, rawMessage: string) => {
    try {
        const message = JSON.parse(rawMessage);

        switch (message.action) {
            case "CREATE_ROOM": {
                if (!message.quizId) throw new Error("Missing quizId");

                const pin = await RoomManager.createRoom(message.quizId);

                ws.send(JSON.stringify({
                    event: "room_created",
                    pin: pin,
                    message: `Lobby opened! Players can join with PIN: ${pin}`
                }));

                hostConnections.set(pin, ws); //Websocket of da host
                playerConnections.set(pin, new Set()); //Websockets of da players

                break;
            }
            case "JOIN_ROOM": {
                if (!message.pin || !message.playerName) throw new Error("Missing pin or playerName");

                const success = await RoomManager.joinRoom(message.pin, message.playerName);

                if (success) {

                    const room = playerConnections.get(message.pin);
                    if (room) room.add(ws);
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
                } else {
                    ws.send(JSON.stringify({
                        event: "error",
                        message: "Invalid PIN or Room Expired"
                    }));
                }

                break;
            }
            case "START_GAME": {
                const pin = message.pin;
                if (hostConnections.get(pin) !== ws) {
                    ws.send(JSON.stringify({
                        event: "error",
                        message: "Only the host can start the game"
                    }));
                    return;
                }

                const questionPayload = {
                    event: "question_active",
                    questionText: "Which F1 team has won the most Constructors' Championships?",
                    timeLimit: 30,
                    options: [
                        { id: 1, text: "Mercedes" },
                        { id: 2, text: "Red Bull" },
                        { id: 3, text: "Ferrari" },
                        { id: 4, text: "McLaren" }
                    ]
                };

                ws.send(JSON.stringify(questionPayload));
                const playersInRoom = playerConnections.get(pin);
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => {
                        if (playerSocket.readyState === WebSocket.OPEN) {
                            playerSocket.send(JSON.stringify(questionPayload));
                        }
                    });
                }


                break;
            }

            case "SUBMIT_ANSWER": {
                const { pin, playerName, answerId, timeTaken } = message;

                if (!pin || !playerName || answerId === undefined) {
                    ws.send(JSON.stringify({ event: "error", message: "Missing answer data" }));
                    break;
                }

                const isCorrect = answerId === 3;
                let points = 0;

                if (isCorrect) {
                    // Standard Kahoot-style formula: Base 500 + up to 500 more for speed (assuming 30s max)
                    const speedBonus = Math.max(0, 500 * (1 - (timeTaken / 30)));
                    points = Math.round(500 + speedBonus);
                }

                await RoomManager.submitScore(pin, playerName, points);

                ws.send(JSON.stringify({
                    event: "answer_received",
                    isCorrect,
                    pointsEarned: points
                }));

                const hostSocket = hostConnections.get(pin);
                if (hostSocket && hostSocket.readyState === WebSocket.OPEN) {
                    hostSocket.send(JSON.stringify({
                        event: "player_answered",
                        playerName: playerName
                    }));
                }

                break;
            }

            case "SHOW_LEADERBOARD": {
                const pin = message.pin;
                if (hostConnections.get(pin) !== ws) {
                    ws.send(JSON.stringify({
                        event: "error",
                        message: "Only the host can view the leaderboard"
                    }));
                    break;
                }
                const leaderboard = await RoomManager.getLeaderboard(pin);


                const payload = {
                    event: "leaderboard_update",
                    leaderboard: leaderboard
                };

                ws.send(JSON.stringify(payload));

                const playersInRoom = playerConnections.get(pin);
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => {
                        if (playerSocket.readyState === WebSocket.OPEN) {
                            playerSocket.send(JSON.stringify(payload));
                        }
                    });
                }
                break;
            }

            case "NEXT_QUESTION": {
                const pin = message.pin;

                if (hostConnections.get(pin) !== ws) {
                    ws.send(JSON.stringify({ event: "error", message: "Only the host can trigger the next question" }));
                    break;
                }

                const questionPayload = JSON.stringify({
                    event: "question_active",
                    questionNumber: message.questionNumber,
                    questionText: message.questionText,
                    timeLimit: message.timeLimit || 30,
                    options: message.options
                });

                ws.send(questionPayload);

                const playersInRoom = playerConnections.get(pin);
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => {
                        if (playerSocket.readyState === WebSocket.OPEN) {
                            playerSocket.send(questionPayload);
                        }
                    });
                }
                break;
            }
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
            hostConnections.delete(pin); // early exit
            console.log(`Host for room ${pin} disconnected. Room closed.`);
            break;
        }
    }

    for (const [pin, socketSet] of playerConnections.entries()) {
        if (socketSet.has(ws)) {
            socketSet.delete(ws);
            console.log(`Cleaned up dead Player connection from room ${pin}`);
            return;
        }
    }
}