import { WebSocket } from "ws";
import { RoomManager } from "../services/RoomManager";
import { db, gameSessions, playerScores } from "@zelos/db";

const hostConnections = new Map<string, WebSocket>();
const playerConnections = new Map<string, Set<WebSocket>>();

const roomTimers = new Map<string, NodeJS.Timeout>();
const roomState = new Map<string, { isAcceptingAnswers: boolean }>();

const startQuestionTimer = (pin: string, timeLimit: number) => {
    roomState.set(pin, { isAcceptingAnswers: true });

    if (roomTimers.has(pin)) clearTimeout(roomTimers.get(pin)!);

    const timer = setTimeout(async () => {
        roomState.set(pin, { isAcceptingAnswers: false });
        console.log(`Time is up for room ${pin}! Locking answers.`);

        const leaderboard = await RoomManager.getLeaderboard(pin);
        const payload = JSON.stringify({ event: "leaderboard_updated", leaderboard });

        const hostSocket = hostConnections.get(pin);
        if (hostSocket && hostSocket.readyState === WebSocket.OPEN) {
            hostSocket.send(payload);
        }

        const playersInRoom = playerConnections.get(pin);
        if (playersInRoom) {
            playersInRoom.forEach((playerSocket) => {
                if (playerSocket.readyState === WebSocket.OPEN) {
                    playerSocket.send(payload);
                }
            });
        }
    }, timeLimit * 1000); // seconds -> milliseconds
    roomTimers.set(pin, timer);
};

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

                const firstQuestion = await RoomManager.getQuestion(pin, 0);

                if (!firstQuestion) {
                    ws.send(JSON.stringify({ event: "error", message: "Failed to load questions from cache" }));
                    break;
                }

                const timeLimit = firstQuestion.timeLimit || 30;

                const questionPayload = JSON.stringify({
                    event: "question_active",
                    questionNumber: 1,
                    questionText: firstQuestion.text,
                    timeLimit: firstQuestion.timeLimit || 30,
                    options: firstQuestion.options
                });

                ws.send(questionPayload);

                const playersInRoom = playerConnections.get(pin);
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => {
                        if (playerSocket.readyState === WebSocket.OPEN) {
                            playerSocket.send(JSON.stringify(questionPayload));
                        }
                    });
                }

                startQuestionTimer(pin, timeLimit);


                break;
            }

            case "SUBMIT_ANSWER": {
                const { pin, playerName, answerId, timeTaken, questionNumber } = message;

                if (!pin || !playerName || answerId === undefined) {
                    ws.send(JSON.stringify({ event: "error", message: "Missing answer data" }));
                    break;
                }

                const currentQ = await RoomManager.getQuestion(pin, questionNumber - 1);
                const isCorrect = currentQ && answerId === currentQ.correctOptionId;
                let points = 0;

                const state = roomState.get(pin);
                if (!state || !state.isAcceptingAnswers) {
                    ws.send(JSON.stringify({ event: "error", message: "Time is up! No points awarded." }));
                    break;
                }

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

                const nextIndex = message.questionNumber - 1;
                const nextQ = await RoomManager.getQuestion(pin, nextIndex);

                if (!nextQ) {
                    ws.send(JSON.stringify({ event: "quiz_completed" }));
                    break;
                }

                const timeLimit = nextQ.timeLimit || 30;

                const questionPayload = JSON.stringify({
                    event: "question_active",
                    questionNumber: nextQ.questionNumber,
                    questionText: nextQ.questionText,
                    timeLimit: nextQ.timeLimit || 30,
                    options: nextQ.options
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

                startQuestionTimer(pin, timeLimit);
                break;
            }

            case "END_GAME": {
                const pin = message.pin;

                if (hostConnections.get(pin) !== ws) {
                    ws.send(JSON.stringify({ event: "error", message: "Only the host can end the game" }));
                    break;
                }

                const finalLeaderboard = await RoomManager.getLeaderboard(pin);
                const quizId = await RoomManager.getQuizId(pin);
                const payload = JSON.stringify({
                    event: "game_over",
                    leaderboard: finalLeaderboard
                });

                ws.send(payload);
                const playersInRoom = playerConnections.get(pin);
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => {
                        if (playerSocket.readyState === WebSocket.OPEN) playerSocket.send(payload);
                    });
                }

                if (quizId && finalLeaderboard.length > 0) {
                    try {
                        const [session] = await db.insert(gameSessions).values({
                            quizId: quizId
                        }).returning();

                        const scoresToInsert = finalLeaderboard.map((player) => ({
                            sessionId: session!.id,
                            playerName: player.name,
                            score: player.score
                        }));

                        await db.insert(playerScores).values(scoresToInsert);
                        console.log(`Final scores saved to Postgres for session ${session!.id}`);
                    } catch (error) {
                        console.error(" Failed to save to Postgres:", error);
                    }
                }

                await RoomManager.deleteRoom(pin); // Nuke from Redis

                ws.close(1000, "Game Ended");
                if (playersInRoom) {
                    playersInRoom.forEach((playerSocket) => playerSocket.close(1000, "Game Ended"));
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
            if (roomTimers.has(pin)) {
                clearTimeout(roomTimers.get(pin)!);
                roomTimers.delete(pin);
            }

            console.log(`Cleaned up dead Host connection for room ${pin}`);
            return;
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