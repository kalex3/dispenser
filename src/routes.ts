import { isEmpty, sample } from "lodash";
import { blockedIps } from "./app";
import { buildAnonymousAuthBundle, buildAuthBundle } from "./authBundleProvider";

import express from "express";
import fs from "fs";
import path from "path";

const accounts = fs
  .readFileSync(path.resolve(`resources/accounts.txt`), "utf-8")
  .split("\n")
  .filter(Boolean);

const router = express.Router();

function getRandomAccount() {
  const account = sample(accounts) as string;
  const [email, aasToken] = account.split(" ");

  return { email, aasToken };
}

router
  // Health
  .get("/api/health", (req, res) => {
    res
      .status(200)
      .json({
        status: "Aurora Dispenser is alive!",
        uptime: process.uptime(),
        dateTime: new Date().toISOString(),
      });
  })

  .get("/api/amiblocked/", (req, res) => {
    let { ip } = req.query as { ip: string };

    ip = ip || req.ip || ""

    const message = (isEmpty(ip) || blockedIps.includes(ip)) ? 'Yes' : 'No';

    res.json({ message });
  })

  .post("/api/auth", async (req, res) => {
    const deviceConfig = req.body;

    if (isEmpty(deviceConfig)) {
      return res
        .status(400)
        .json({
          error: "Missing device configuration",
        });
    }

    try {
      const { email, aasToken } = getRandomAccount();
      const authBUndle = await buildAuthBundle({ email, aasToken, }, deviceConfig)

      res.json(authBUndle);
    } catch (error: any) {
      res
        .status(400)
        .json(error.message || error.code);
    }
  })

  // Dispense
  .get("/api/auth", async (req, res) => {
    try {
      const { email, aasToken } = getRandomAccount();
      const authBUndle = await buildAnonymousAuthBundle({ email, aasToken, }, "arm64_xxhdpi")

      res.json(authBUndle);
    } catch (error: any) {
      res
        .status(400)
        .json(error.message || error.code);
    }
  })

  .all('*', (req, res) => {
    res.status(444);
  });

export default router;
