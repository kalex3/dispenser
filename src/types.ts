/*
 * SPDX-FileCopyrightText: 2024-2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AuthBundle {
  aasToken?: string
  ac2dmToken?: string
  androidCheckInToken?: string
  authToken: string
  deviceCheckInConsistencyToken: string
  deviceConfigToken: string
  deviceInfoProvider?: DeviceInfoProvider
  dfeCookie: string
  email: string
  experimentsConfigToken: string
  gcmToken?: string
  gsfId: string
  isAnonymous: boolean
  locale: string
  oAuthLoginToken?: string
  tokenDispenserUrl: string
  userProfile?: UserProfile
}

export interface AnonymousAuthBundle {
  email: string
  auth: string
}

export interface AuthOptions {
  account: Account
  deviceConfig: DeviceConfig
  locale: string
}

export interface AuthPayload {
  gsfId: string
  userAgent: string
  deviceConsistencyToken: string
  deviceConfigToken: string
  dfeCookie: string
}

export interface Account {
  email: string
  aasToken: string
  password?: string
}

export interface DeviceInfoProvider {
  authUserAgentString: string
  localeString: string
  mccMnc: string
  playServicesVersion: number
  properties?: any
  userAgentString: string
  sdkVersion: number
}

export interface UserProfile {
  name: string
  email: string
  artwork: Artwork
}

export interface Artwork {
  url: string
  urlAlt?: string
  type: number
  width: number
  height: number
  aspectRatio?: number
}

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean

  mimeType?: string
  contents?: FileNode[]
  sha256?: string
  size?: number
  lastModified?: number
  createdAt?: number
}

export type DeviceConfig = Record<string, any>
