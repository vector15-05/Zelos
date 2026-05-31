import { redis } from "../config/redis";

export class RoomManager {
    // Random 5 digit pin
    private static generatePIN(): string {
        return Math.floor(10000 + Math.random() * 90000).toString();
    }

    // takes the quiz ID and generates a unique PIN

    static async createRoom(quizId: string): Promise<string> {
        const pin = this.generatePIN();

        const roomKey = `room:${pin}:quiz`;
        const exists = await redis.exists(roomKey);
        if (exists) {
            return this.createRoom(quizId);
        }

        const leaderboardKey = `room:${pin}:leaderboard`;

        await redis.set(roomKey, quizId, "EX", 7200); // timelimit: 2 hrs

        return pin;
    }

    static async joinRoom(pin: string, playerName: string): Promise<boolean> {
        const roomKey = `room:${pin}:quiz`;
        const exists = await redis.exists(roomKey);
        if (!exists) {
            return false;
        }

        const playersKey = `room:${pin}:players`;
        const leaderboardKey = `room:${pin}:leaderboard`;

        // Adding player to the room's unique player set
        await redis.sadd(playersKey, playerName);

        // Initiaizing thier score to zero on the leaderboard sorted set
        await redis.zadd(leaderboardKey, 0, playerName);

        return true;
    }

    static async submitScore(pin: string, playerName: string, score: number): Promise<number> {
        const leaderboardKey = `room:${pin}:leaderboard`;

        // Incrementing the player's score by the submitted amount using ZINCRBY
        const newScore = await redis.zincrby(leaderboardKey, score, playerName);
        return parseFloat(newScore);
    }

    static async getLeaderboard(pin: string) {
        const leaderboardKey = `room:${pin}:leaderboard`;

        // Return the elements sorted in descending order using score
        const rawData = await redis.zrevrange(leaderboardKey, 0, -1, "WITHSCORES");

        const formatted: { name: string; score: number }[] = [];
        for (let i = 0; i < rawData.length; i += 2) {
            formatted.push({
                name: rawData[i]!,
                score: parseInt(rawData[i + 1]!, 10),
            });
        }
        return formatted;
    }


}