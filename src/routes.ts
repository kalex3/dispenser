/*
 * SPDX-FileCopyrightText: 2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isEmpty } from "lodash"
import { blockedIps, lruQueue } from "./app"
import { buildAnonymousAuthBundle, buildAuthBundle } from "./authBundleProvider"
import { getDeviceConfig } from "./builder/devicePropertyBuilder"
import { buildRoot } from "./builder/fileTreeBuilder"

import dayjs from "dayjs"
import express from "express"
import _ from "lodash"

const router = express.Router()

let cachedFileTree: any = null
let cacheTimestamp: dayjs.Dayjs | null = null

function getNextAccount() {
  if (_.isEmpty(lruQueue)) {
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

  .get("/api/amiblocked/", (req, res) => {
    let { ip } = req.query as { ip: string }

    ip = ip || req.ip || ""

    const message = isEmpty(ip) || blockedIps.includes(ip) ? "Yes" : "No"

    res.json({ message })
  })

  .post("/api/auth", async (req, res) => {
    try {
      const { locale = "en" } = req.query as { locale: string }
      const deviceConfig = req.body

      if (isEmpty(deviceConfig)) {
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

  .get("/api/files", async (req, res) => {
    try {
      const path = process.env.DOWNLOAD_URL

      if (!path) {
        return bailOut(req, res, {
          code: 500,
          message: "No download path configured"
        })
      }

      const now = dayjs()
      if (!cachedFileTree || !cacheTimestamp || now.diff(cacheTimestamp, "minute") >= 15) {
        cachedFileTree = buildRoot(path, {
          maxDepth: 8,
          maxFiles: 500,
          allowedExtensions: [".apk", ".json", ".properties"]
        })
        cacheTimestamp = now
      }

      res.json(cachedFileTree)
    } catch (error: any) {
      return bailOut(req, res, {
        code: 500,
        message: error.message || error.code
      })
    }
  })

  .get("/api/wiki", async (req, res) => {
    try {
      const { url } = req.query as { url: string }

      if (!url || !url.startsWith("https://gitlab.com/AuroraOSS/aurorawiki")) {
        return bailOut(req, res, {
          code: 404,
          message: "Missing / Invalid URL"
        })
      }

      const response = await fetch(url)
      const text = await response.text()

      res.set("Content-Type", "text/markdown")
      res.send(text)
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
