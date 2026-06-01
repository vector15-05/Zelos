import { Redis } from "ioredis"

const host = process.env.REDIS_HOST || "127.0.0.1";
const port = parseInt(process.env.REDIS_PORT || "6379", 10);

export const redis = new Redis(port, host, {
    maxRetriesPerRequest: null, 
});

redis.on("connect", () => {
    console.log("Connected to Redis successfully YAY!");
});

redis.on("error", (err) => {
    console.error("Redis connection error found :( ", err);
});