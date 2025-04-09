import { isEmpty } from "lodash"
import { blockedIps, lruQueue } from "./app"
import { buildAnonymousAuthBundle, buildAuthBundle } from "./authBundleProvider"
import { getDeviceConfig } from "./builder/devicePropertyBuilder"
import { buildRoot } from "./builder/fileTreeBuilder"

import express from "express"
import _ from "lodash"

const router = express.Router()

function getNextAccount() {
  if (_.isEmpty(lruQueue)) {
    throw new Error("No accounts available")
  }

  const account = lruQueue.shift() as string
  lruQueue.push(account)

  const [email, aasToken] = account.split(" ")

  return { email, aasToken }
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
        return res.status(400).json({
          error: "Missing device configuration"
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
      res.status(400).json(error.message || error.code)
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
      res.status(400).json(error.message || error.code)
    }
  })

  .get("/api/files", async (req, res) => {
    try {
      const path = process.env.DOWNLOAD_URL

      if (!path) {
        return res.status(400).json({
          error: "Missing download directory URL"
        })
      }

      const fileTree = buildRoot(path, {
        maxDepth: 8,
        maxFiles: 500,
        allowedExtensions: [".apk", ".json"]
      })

      res.json(fileTree)
    } catch (error: any) {
      res.status(400).json(error.message || error.code)
    }
  })

  .all("*", (req, res) => {
    res.status(444)
  })

export default router
