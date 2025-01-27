import { rateLimit } from 'express-rate-limit';
import { isEmpty } from 'lodash';
import { createStream } from 'rotating-file-stream';

import cors from "cors";
import dayjs from 'dayjs';
import express from 'express';
import figlet from 'figlet';
import fs from 'fs';
import helmet from "helmet";
import morgan from 'morgan';
import path from 'path';
import routes from "./routes";

function ascii(message: string, width: number = 80): string {
    return figlet.textSync(message, {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default",
        width: width,
        whitespaceBreak: true,
    })
}

const accessLogStream = createStream(() => {
    return dayjs().format('YYYY-MM-DD') + '.log'
}, {
    interval: '1d',
    path: path.join(__dirname, 'logs', 'access')
})

const blockedLogStream = createStream(() => {
    return dayjs().format('YYYY-MM-DD') + '.log'
}, {
    interval: '1d',
    path: path.join(__dirname, 'logs', 'blocked')
})

export const blockedIps = fs.readFileSync(path.resolve('resources/blocked_ips.txt'), 'utf8')
    .split('\n')
    .filter(Boolean);

const rateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 5, // Allowed requests per window.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    statusCode: 429,
    message: 'Too many requests, try again later.',
    skip: (req) => req.url === '/api/health',
});

async function init() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors());
    app.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        req.setTimeout(2 * 60000);
        res.setTimeout(2 * 60000);

        next();
    });

    // TODO: Improve it to avoid abuse by malicious users
    app.set('trust proxy', 1);

    // Set up rate limiter
    app.use(rateLimiter)

    // Use helmet to secure Express with various HTTP headers
    app.use(helmet());

    // Add morgan for logging
    app.use(morgan('combined'));

    // Add morgan for file logging
    app.use(morgan('combined', {
        skip: (_, res) => res.statusCode >= 400,
        stream: accessLogStream
    }));

    // Add morgan for file logging
    app.use(morgan('combined', {
        skip: (_, res) => res.statusCode == 200,
        stream: blockedLogStream
    }));

    // Block all flagged IPs
    app.use((req, res, next) => {
        const clientIp = req.ip || req.socket.remoteAddress || ""

        if (isEmpty(clientIp) || blockedIps.includes(clientIp)) {
            return res.status(403)
        }

        next();
    });

    // Add custom routes
    app.use(routes);

    app.listen(3000, "localhost", () => {
        console.log();
        console.log(ascii("Aurora Dispenser"));
        console.log("Version: 1.0.0");
        console.log("Server listening on port 3000");
        console.log("Block IPs: ", blockedIps.length);
    });

    process.on("SIGINT", () => gracefullyExit());
    process.on("SIGTERM", () => gracefullyExit());
    process.on("uncaughtException", (error) => {
        console.error("Uncaught exception:", error);
    });
}

function gracefullyExit() {
    console.log();
    console.log(ascii("Bye!", 40));
    process.exit();
}

init();