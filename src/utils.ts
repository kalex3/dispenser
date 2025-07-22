/*
 * SPDX-FileCopyrightText: 2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function generateAvatar() {
  return {
    url: "https://lh3.googleusercontent.com/a/default-user",
    type: 4,
    width: 96,
    height: 96
  }
}

export function generateUserProfile() {
  return {
    name: "Anonymous",
    email: "anonymous@gmail.com",
    artwork: generateAvatar()
  }
}
