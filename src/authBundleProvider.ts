/*
 * SPDX-FileCopyrightText: 2024-2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
  getCheckinRequest,
  getDeviceConfigurationProto,
  getUserAgent
} from "./builder/devicePropertyBuilder"
import { getCheckinHeaders, getDefaultHeaders } from "./builder/headers"
import { getDefaultParams } from "./builder/params"
import { GooglePlay } from "./compiled-proto"
import { AUTH_URL, CHECKIN_URL, TOC_URL, UPLOAD_DEVICE_CONFIG_URL } from "./constants"
import { AnonymousAuthBundle, AuthBundle, AuthOptions, AuthPayload, DeviceConfig } from "./types"
import { generateUserProfile } from "./utils"

import axios from "axios"
import _ from "lodash"

import AndroidCheckinRequest = GooglePlay.AndroidCheckinRequest
import AndroidCheckinResponse = GooglePlay.AndroidCheckinResponse
import UploadDeviceConfigRequest = GooglePlay.UploadDeviceConfigRequest
import ResponseWrapper = GooglePlay.ResponseWrapper

async function checkInDevice(deviceConfig: DeviceConfig) {
  const androidCheckinRequest = getCheckinRequest(deviceConfig)
  const encodedAndroidCheckinRequest = AndroidCheckinRequest.encode(androidCheckinRequest).finish()
  const headers = getCheckinHeaders(deviceConfig)

  const { data } = await axios.post(CHECKIN_URL, encodedAndroidCheckinRequest, {
    headers: headers,
    responseType: "arraybuffer"
  })

  return AndroidCheckinResponse.decode(data)
}

async function uploadDeviceConfig(
  userAgent: string,
  locale: string,
  deviceConfig: DeviceConfig,
  androidCheckinResponse: AndroidCheckinResponse
) {
  const deviceConfigurationProto = getDeviceConfigurationProto(deviceConfig)
  const uploadDeviceConfigRequest = UploadDeviceConfigRequest.create({
    deviceConfiguration: deviceConfigurationProto
  })
  const encodedUploadDeviceConfigRequest =
    UploadDeviceConfigRequest.encode(uploadDeviceConfigRequest).finish()

  const payload: AuthPayload = {
    userAgent,
    deviceConsistencyToken: androidCheckinResponse.deviceCheckinConsistencyToken,
    gsfId: androidCheckinResponse.androidId.toString(16),
    deviceConfigToken: "",
    dfeCookie: ""
  }

  const headers = getDefaultHeaders(payload, locale)
  headers["Content-Type"] = "application/x-protobuf"

  const { data } = await axios.post(UPLOAD_DEVICE_CONFIG_URL, encodedUploadDeviceConfigRequest, {
    headers,
    responseType: "arraybuffer"
  })

  return ResponseWrapper.decode(data)?.payload?.uploadDeviceConfigResponse
}

async function generateAuthBundle(
  authBundleOptions: AuthOptions,
  authPayload: AuthPayload
): Promise<AuthBundle> {
  const { account, deviceConfig, locale } = authBundleOptions
  const { gsfId, userAgent, deviceConsistencyToken, deviceConfigToken } = authPayload

  const authUserAgentString = `GoogleAuth/1.4 (${deviceConfig["Build.DEVICE"]} ${deviceConfig["Build.ID"]})`
  const headers = {
    app: "com.google.android.gms",
    device: gsfId,
    "User-Agent": authUserAgentString
  }

  const params = getDefaultParams(
    {
      email: account.email,
      aasToken: account.aasToken,
      gsfId: gsfId
    },
    deviceConfig,
    locale
  )

  const { data } = await axios.post(AUTH_URL, undefined, {
    headers: headers,
    params: params,
    responseType: "text"
  })

  const authBundle: Record<string, string> = _.fromPairs(
    data.split("\n").map((value: string) => value.split("="))
  )

  const tocResponse = await acceptTOC(authPayload, authBundle.Auth, locale)

  const dfeCookie = String(tocResponse?.cookie)

  return {
    aasToken: "REDACTED",
    ac2dmToken: "",
    androidCheckInToken: "",
    authToken: authBundle.Auth,
    deviceCheckInConsistencyToken: deviceConsistencyToken,
    deviceConfigToken,
    dfeCookie,
    experimentsConfigToken: "",
    gsfId,
    isAnonymous: false,
    locale: authBundleOptions.locale,
    tokenDispenserUrl: "https://auroraoss.com/api/auth",
    email: account.email,
    deviceInfoProvider: {
      authUserAgentString,
      localeString: deviceConfig.locale,
      mccMnc: "310260",
      playServicesVersion: deviceConfig["GSF.version"],
      userAgentString: userAgent,
      sdkVersion: deviceConfig["Build.VERSION.SDK_INT"],
      properties: deviceConfig
    },
    userProfile: generateUserProfile()
  }
}

async function acceptTOC(
  payload: AuthPayload,
  bearerToken: string,
  locale: string
): Promise<GooglePlay.ITocResponse | null | undefined> {
  const { data } = await axios.get(TOC_URL, {
    headers: getDefaultHeaders(payload, locale, bearerToken),
    responseType: "arraybuffer"
  })

  return ResponseWrapper.decode(data)?.payload?.tocResponse
}

async function buildAuthBundle(options: AuthOptions): Promise<AuthBundle> {
  const { deviceConfig, locale } = options

  const userAgent = getUserAgent(deviceConfig)

  const androidCheckinResponse = await checkInDevice(deviceConfig)
  const uploadDeviceConfigResponse = await uploadDeviceConfig(
    userAgent,
    locale,
    deviceConfig,
    androidCheckinResponse
  )

  const authPayload: AuthPayload = {
    userAgent,
    gsfId: androidCheckinResponse.androidId.toString(16),
    deviceConsistencyToken: androidCheckinResponse.deviceCheckinConsistencyToken,
    deviceConfigToken: uploadDeviceConfigResponse?.uploadDeviceConfigToken as string,
    dfeCookie: ""
  }

  return await generateAuthBundle(options, authPayload)
}

async function buildAnonymousAuthBundle(options: AuthOptions): Promise<AnonymousAuthBundle> {
  const authBundle: AuthBundle = await buildAuthBundle(options)

  return {
    email: options.account.email,
    auth: authBundle.authToken
  }
}

export { buildAnonymousAuthBundle, buildAuthBundle }
