import { Redis } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, 
});

redis.on("connect", () => {
    console.log("Connected to Redis successfully YAY!");
});

redis.on("error", (err) => {
    console.error("Redis connection error found :( ", err);
});