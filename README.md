# Dynamic Goons

This is a server mod for Single Player Tarkov (SPT) that attempts to simulate the Goons' map-to-map travel mechanic in live Escape From Tarkov. 

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Rotation](#rotation)
- [Compatibility](#compatibility)
- [Credits](#credits)

## Features 

- Map-to-map rotation for the Goons.
- Increased rotation chance the longer they stay on a map.
- Custom chat bot to track of the Goons' location and rotation chances.
- Configurable spawn chances.

## Installation

Drag and drop the contents of the zip directly into your SPT install.

## Configuration

```json
{
  "debugLogs": false,
  "preventSameMapRotation": false,
  "goonsSpawnChance": 30,
  "rotationInterval": 180
}
```

- `preventSameMapRotation`: \
  Prevents the Goons from rotating to the same map consecutively.
  - `true`: The Goons will always rotate to a different map.
  - `false`: The Goons will be able to rotate to the same map they were on previously I.E Customs → Customs.
- `rotationInterval`: \
  Maximum time (in minutes) the Goons can stay on a map.
  - Default `180` minutes (3 hours). The longer they stay on a map, the higher the chance they will rotate to a new one after a raid.

## Rotation

In base SPT, the Goons have a static 35% spawn chance per raid on their designated maps. However, this mod implements a rotation mechanic that simulates the Goons traveling through four maps: Customs, Woods, Shoreline, and Lighthouse. By default, the Goons typically stay on a single map for approximately 3 hours. Their spawn chances are adjusted to reflect their current location. For example, if they are on Customs then their spawn chance will be 30% (Configurable) on Customs, and 0% on other maps.

Rotations occur only at server start or after completing a raid. At these points, the mod evaluates whether the Goons should rotate to a new map, with the rotation chance increasing the longer they’ve stayed on their current map. This chance grows over time and is capped at 100%, ensuring they eventually move.

This is meant to simulate their behavior on live EFT.

## Credits
- Chomp for providing mod examples.
- SPT Mod Development Channel for their discussions, which helped me a ton during development.
- Fika discord user that posted their fix for Fika filtering out modded chat bots
