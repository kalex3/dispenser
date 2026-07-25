/*
 * SPDX-FileCopyrightText: 2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { lruQueue } from "./app"
import { buildAnonymousAuthBundle, buildAuthBundle } from "./authBundleProvider"
import { getDeviceConfig } from "./builder/devicePropertyBuilder"

import express from "express"

const router = express.Router()

function getNextAccount() {
  if (lruQueue.length == 0) {
    throw new Error("No accounts available")
  }

  const account = lruQueue.shift() as string
  lruQueue.push(account)

  const [email, aasToken] = account.split(" ")

  return { email, aasToken }
}

async function bailOut(
  req: express.Request,
  res: express.Response,
  opts: {
    code: number
    message: string
  }
) {
  const { code = 400, message = "Something went wrong!" } = opts

  res.status(code).json({ error: message })
}

router
  .get("/api/health", (req, res) => {
    res.status(200).json({
      status: "Aurora Dispenser is alive!",
      uptime: process.uptime(),
      dateTime: new Date().toISOString()
    })
  })

  .post("/api/auth", async (req, res) => {
    try {
      const { locale = "en" } = req.query as { locale: string }
      const deviceConfig = req.body

      if (Object.keys(deviceConfig).length == 0) {
        return bailOut(req, res, {
          code: 400,
          message: "Missing device configuration"
        })
      }

      const { email, aasToken } = getNextAccount()

      const authBUndle = await buildAuthBundle({
        account: { email, aasToken },
        deviceConfig,
        locale
      })

      res.json(authBUndle)
    } catch (error: any) {
      return bailOut(req, res, {
        code: 500,
        message: error.message || error.code
      })
    }
  })

  .get("/api/auth", async (req, res) => {
    try {
      const { locale = "en" } = req.query as { locale: string }
      const { email, aasToken } = getNextAccount()

      const deviceConfig = getDeviceConfig("arm64_xxhdpi")
      const authBUndle = await buildAnonymousAuthBundle({
        account: { email, aasToken },
        deviceConfig,
        locale
      })

      res.json(authBUndle)
    } catch (error: any) {
      return bailOut(req, res, {
        code: 500,
        message: error.message || error.code
      })
    }
  })

  .all("*", (req, res) => {
    res.status(444)
  })

export default router
