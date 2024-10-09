import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app:Express = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser())

// import  routes
import  healthCheckRouter  from "./routes/healthcheck.route.ts";
import userRouter from "./routes/user.router.ts";

// routes
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/user", userRouter);

export { app };


// "dev": "nodemon -r dotenv/config --experimental-json-modules src/index.js",
    // "build": "npx tsc",
    // "start": "node dist/index.js",