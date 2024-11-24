# Dynamic Goons

This is a server mod for Single Player Tarkov (SPT) that attempts to simulate the Goons' map-to-map travel mechanic in live Escape From Tarkov. 

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Rotation](#rotation)
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
  "goonsSpawnChance": 35,
  "rotationInterval": 180
}
```

- `preventSameMapRotation`: \
  Prevents the Goons from rotating to the same map consecutively.
  - `true`: The goons will always rotate to a different map.
  - `false`: The Goons will be able to rotate to the same map they were on previously I.E Customs → Customs.
- `rotationInterval`: \
  Maximum time (in minutes) the Goons can stay on a map.
  - Default `180` minutes (3 hours). The longer they stay on a map, the higher the chance they will rotate to a new one after a raid.

## Rotation

On server start, the mod will evaluates whether the Goons should rotate based on how long they’ve stayed on their current map. The rotation chance increases as they approach their rotation time limit and is capped at 100%. 
By default, the Goons will typically stay on a map for roughly 3 hours.
Rotations only happen at the **server start** or **end of raid**.

## Credits
- Chomp for providing mod examples.
- SPT Mod Development Channel for their discussions, which helped me a ton during development.
