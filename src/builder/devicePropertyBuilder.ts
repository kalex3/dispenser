/*
 * SPDX-FileCopyrightText: 2024-2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { propertiesToJson } from "properties-file"
import { GooglePlay } from "../compiled-proto"
import { DeviceConfig } from "../types"

import path from "path"

import DeviceFeature = GooglePlay.DeviceFeature
import DeviceConfigurationProto = GooglePlay.DeviceConfigurationProto
import AndroidCheckinRequest = GooglePlay.AndroidCheckinRequest
import AndroidBuildProto = GooglePlay.AndroidBuildProto
import AndroidCheckinProto = GooglePlay.AndroidCheckinProto

function getDeviceConfig(deviceName: string) {
  return propertiesToJson(path.resolve(`resources/${deviceName}.properties`))
}

function getUserAgent(deviceConfig: DeviceConfig): string {
  const platforms = deviceConfig["Platforms"].split(",").join(";")

  const deviceProperties = {
    api: 3,
    versionCode: deviceConfig["Vending.version"],
    sdk: deviceConfig["Build.VERSION.SDK_INT"],
    device: deviceConfig["Build.DEVICE"],
    hardware: deviceConfig["Build.HARDWARE"],
    product: deviceConfig["Build.PRODUCT"],
    platformVersionRelease: deviceConfig["Build.VERSION.RELEASE"],
    model: deviceConfig["Build.MODEL"],
    buildId: deviceConfig["Build.ID"],
    isWideScreen: 0,
    supportedAbis: platforms
  }

  const devicePropertiesString = Object.entries(deviceProperties)
    .map(([k, v]) => `${k}=${v}`)
    .join(",")

  return `Android-Finsky/${deviceConfig["Vending.versionString"]} (${devicePropertiesString})`
}

function getDeviceConfigurationProto(deviceConfig: DeviceConfig) {
  const deviceFeatures = deviceConfig["Features"].split(",").map((val: string) =>
    DeviceFeature.fromObject({
      name: val,
      value: 0
    })
  )

  return DeviceConfigurationProto.fromObject({
    touchScreen: Number(deviceConfig["TouchScreen"]),
    keyboard: Number(deviceConfig["Keyboard"]),
    navigation: Number(deviceConfig["Navigation"]),
    screenLayout: Number(deviceConfig["ScreenLayout"]),
    hasHardKeyboard: Boolean(deviceConfig["HasHardKeyboard"]),
    hasFiveWayNavigation: Boolean(deviceConfig["HasFiveWayNavigation"]),
    lowRamDevice: Boolean(deviceConfig["LowRamDevice"]),
    maxNumOf_CPUCores: Number(deviceConfig["MaxNumOfCPUCores"]),
    totalMemoryBytes: Number(deviceConfig["TotalMemoryBytes"]),
    glEsVersion: Number(deviceConfig["GL.Version"]),
    glExtension: deviceConfig["GL.Extensions"].split(","),
    systemSharedLibrary: deviceConfig["SharedLibraries"].split(","),
    systemAvailableFeature: deviceConfig["Features"].split(","),
    nativePlatform: deviceConfig["Platforms"].split(","),
    screenDensity: Number(deviceConfig["Screen.Density"]),
    screenWidth: Number(deviceConfig["Screen.Width"]),
    screenHeight: Number(deviceConfig["Screen.Height"]),
    systemSupportedLocale: deviceConfig["Locales"].split(","),
    deviceClass: 0,
    deviceFeature: deviceFeatures
  })
}

function getCheckinRequest(deviceConfig: DeviceConfig): AndroidCheckinRequest {
  const androidBuildProto = AndroidBuildProto.fromObject({
    id: deviceConfig["Build.FINGERPRINT"],
    product: deviceConfig["Build.HARDWARE"],
    career: deviceConfig["Build.BRAND"],
    radio: deviceConfig["Build.RADIO"],
    bootloader: deviceConfig["Build.BOOTLOADER"],
    device: deviceConfig["Build.DEVICE"],
    sdkVersion: deviceConfig["Build.VERSION.SDK_INT"],
    model: deviceConfig["Build.MODEL"],
    manufacturer: deviceConfig["Build.MANUFACTURER"],
    buildProduct: deviceConfig["Build.PRODUCT"],
    client: deviceConfig["Client"],
    otsInstalled: Boolean(deviceConfig["OtaInstalled"]),
    timeStamp: Date.now(),
    googleServices: deviceConfig["GSF.version"]
  })

  const androidCheckinProto = AndroidCheckinProto.create({
    build: androidBuildProto,
    lastCheckinMsec: 0,
    cellOperator: deviceConfig["CellOperator"],
    simOperator: deviceConfig["SimOperator"],
    roaming: deviceConfig["Roaming"],
    userNumber: 0
  })

  return AndroidCheckinRequest.create({
    id: 0,
    checkin: androidCheckinProto,
    locale: "en",
    timeZone: deviceConfig["TimeZone"],
    version: 3,
    deviceConfiguration: getDeviceConfigurationProto(deviceConfig),
    fragment: 0
  })
}

export { getCheckinRequest, getDeviceConfig, getDeviceConfigurationProto, getUserAgent }
