/*
 * SPDX-FileCopyrightText: 2024-2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createStream } from "rotating-file-stream"

import cors from "cors"
import dayjs from "dayjs"
import dotenv from "dotenv"
import express from "express"
import fs from "fs"
import helmet from "helmet"
import morgan from "morgan"
import path from "path"
import pkg from "../package.json"
import routes from "./routes"

dotenv.config()

export const accounts = fs
  .readFileSync(path.resolve(`resources/accounts.txt`), "utf-8")
  .split("\n")
  .filter(Boolean)

export const lruQueue = [...accounts]

const accessLogStream = createStream(() => dayjs().format("YYYY-MM-DD") + ".log", {
  interval: "1d",
  path: path.join(__dirname, "..", "logs", "access")
})

const blockedLogStream = createStream(() => dayjs().format("YYYY-MM-DD") + ".log", {
  interval: "1d",
  path: path.join(__dirname, "..", "logs", "blocked")
})

async function init() {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cors())
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
    res.setHeader("Pragma", "no-cache")
    res.setHeader("Expires", "0")

    req.setTimeout(2 * 60000)
    res.setTimeout(2 * 60000)

    next()
  })

  // TODO: Improve it to avoid abuse by malicious users
  app.set("trust proxy", 1)

  // Use helmet to secure Express with various HTTP headers
  app.use(helmet())

  // Add morgan for logging
  app.use(morgan("combined"))

  // Add morgan for file logging
  app.use(
    morgan("combined", {
      skip: (_, res) => res.statusCode >= 400,
      stream: accessLogStream
    })
  )

  // Add morgan for file logging
  app.use(
    morgan("combined", {
      skip: (_, res) => res.statusCode == 200,
      stream: blockedLogStream
    })
  )

  // Add custom routes
  app.use(routes)

  app.listen(3000, "localhost", () => {
    console.log(pkg.name)
    console.log(`Version: ${pkg.version}`)
    console.log("Available Accounts: ", accounts.length)
  })

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error)
  })
}

init()
