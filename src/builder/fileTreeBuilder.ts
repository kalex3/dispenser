/*
 * SPDX-FileCopyrightText: 2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FileNode } from "../types"

import fs from "fs"
import mime from "mime-types"
import path from "path"

// Configurable safe options
interface BuildOptions {
  maxDepth?: number
  allowedExtensions?: string[] // e.g., [".pdf", ".jpg"]
  maxFiles?: number
}

function isDir(p: string): boolean {
  try {
    const stats = fs.statSync(p)
    return stats.isDirectory()
  } catch {
    return false
  }
}

function buildTree(
  dirPath: string,
  options: BuildOptions = {},
  depth: number = 0,
  fileCount: { count: number } = { count: 0 },
  basePath: string = dirPath,
  virtualRoot: string = "/downloads"
): FileNode | undefined {
  const { maxDepth = 3, allowedExtensions = null, maxFiles = 500 } = options
  const name = path.basename(dirPath)
  const fullPath = path.resolve(dirPath)

  if (!fullPath.startsWith(path.resolve(basePath))) {
    throw new Error("Directory traversal attempt detected.")
  }

  const stats = fs.lstatSync(fullPath)

  if (stats.isSymbolicLink()) {
    throw new Error(`Symlinks are not allowed: ${fullPath}`)
  }

  const relativePath = path.relative(basePath, fullPath)
  const displayedPath = path.join(virtualRoot, relativePath)

  if (stats.isDirectory()) {
    if (depth > maxDepth) {
      return {
        name,
        path: displayedPath,
        isDirectory: true,
        contents: []
      }
    }

    const entries = fs.readdirSync(fullPath)
    const children: FileNode[] = []

    for (const entry of entries) {
      if (fileCount.count >= maxFiles) break

      const entryPath = path.join(fullPath, entry)
      const child = buildTree(entryPath, options, depth + 1, fileCount, basePath, virtualRoot)
      if (child) {
        children.push(child)
        fileCount.count++
      }
    }

    return {
      name,
      path: displayedPath,
      isDirectory: true,
      contents: children,
      lastModified: stats.mtimeMs
    }
  } else {
    const ext = path.extname(fullPath).toLowerCase()
    const mimeType = mime.lookup(ext)

    if (allowedExtensions && !allowedExtensions.includes(ext)) return

    return {
      name,
      path: displayedPath,
      isDirectory: false,
      lastModified: stats.mtimeMs,
      createdAt: stats.birthtimeMs,
      mimeType: mimeType || undefined,
      size: stats.size
    }
  }
}

export function buildRoot(dirPath: string, options: BuildOptions = {}): FileNode | undefined {
  if (!isDir(dirPath)) {
    throw new Error(`Provided path is not a directory: ${dirPath}`)
  }

  const safePath = path.resolve(dirPath)
  const contents = buildTree(safePath, options, 0, { count: 0 }, safePath)

  return contents || undefined
}
