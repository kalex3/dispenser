/*
 * SPDX-FileCopyrightText: 2025 Aurora OSS
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function getRandomColor(): string {
  const colors = [
    "red",
    "green",
    "blue",
    "yellow",
    "purple",
    "orange",
    "pink",
    "brown",
    "gray",
    "black",
    "cyan",
    "magenta",
    "lime",
    "teal"
  ]

  return colors[Math.floor(Math.random() * colors.length)]
}

function generateAvatar() {
  return {
    url: `https://placehold.co/96x96/${getRandomColor()}/white?text=IMG`,
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
