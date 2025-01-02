import * as path from "path";
import type { DependencyContainer } from "tsyringe";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { DatabaseServer } from "@spt/servers/DatabaseServer";
import type { IDatabaseTables } from "@spt/models/spt/server/IDatabaseTables";
import type { StaticRouterModService } from "@spt/services/mod/staticRouter/StaticRouterModService";
import type { LocationCallbacks } from "@spt/callbacks/LocationCallback";
import { ILocations } from "@spt/models/spt/server/ILocations";
import { DialogueController } from "@spt/controllers/DialogueController";

import { TrackerCommands } from "./chatbot/TrackerCommands";
import { GoonsTracker } from "./chatbot/GoonsTracker";
import { ChatLocationService } from "./services/ChatLocationService";
import { RotationService } from "./services/RotationService";
import { AddBossToAllMaps } from "./services/AddGoonsToAllMaps";

class Mod implements IPostDBLoadMod, IPreSptLoadMod {
  private logger: ILogger;
  private databaseServer: DatabaseServer;
  private tables: IDatabaseTables;
  private maps: ILocations;
  private locationCallbacks: LocationCallbacks;
  private rotationService: RotationService;
  private addBossToAllMaps: AddBossToAllMaps;
  private rotationData = path.resolve(__dirname, "db/rotationData.json");
  private modConfig = require("../config/config.json");
  private mapConfig = path.resolve(__dirname, "../config/mapConfig.json");
  private zonesConfigPath = path.resolve(__dirname, "../src/db/mapZones.json");
  private async postDBLoad(container: DependencyContainer): Promise<void> {
    this.databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    this.tables = this.databaseServer.getTables();
    this.maps = this.tables.locations;
    this.locationCallbacks =
      container.resolve<LocationCallbacks>("LocationCallbacks");

    container.register("ChatLocationService", {
      useClass: ChatLocationService,
    });

    container.register<TrackerCommands>("TrackerCommands", TrackerCommands);
    container.register<GoonsTracker>("GoonsTracker", GoonsTracker);

    container
      .resolve<DialogueController>("DialogueController")
      .registerChatBot(container.resolve<GoonsTracker>("GoonsTracker"));

    this.addBossToAllMaps = new AddBossToAllMaps(
      this.logger,
      this.zonesConfigPath,
      this.modConfig
    );
    this.addBossToAllMaps.addBossToAllMaps(this.maps);

    this.rotationService = new RotationService(
      this.logger,
      this.modConfig,
      this.rotationData,
      this.mapConfig
    );

    const rotationData = await this.rotationService.readRotationData();
    const currentTime = Date.now();
    const rotationInterval = this.modConfig.rotationInterval;

    await this.rotationService.handleRotationChance(
      rotationData,
      currentTime,
      rotationInterval
    );
  }

  public async preSptLoad(container: DependencyContainer): Promise<void> {
    this.logger = container.resolve<ILogger>("WinstonLogger");

    const staticRouterModService = container.resolve<StaticRouterModService>(
      "StaticRouterModService"
    );

    staticRouterModService.registerStaticRouter(
      "RotationUpdate",
      [
        {
          url: "/client/locations",
          action: async (
            url: string,
            info: any,
            sessionId: string,
            output: string
          ) => {
            await this.updateBossSpawnChances();
            return this.locationCallbacks.getLocationData(url, info, sessionId);
          },
        },
        {
          url: "/client/match/local/end",
          action: async (url, info, sessionId, output) => {
            const rotationData = await this.rotationService.readRotationData();
            const currentTime = Date.now();
            const rotationInterval = this.modConfig.rotationInterval || 180;

            await this.rotationService.handleRotationChance(
              rotationData,
              currentTime,
              rotationInterval
            );

            return output;
          },
        },
      ],
      "spt"
    );
  }

  private async updateBossSpawnChances(): Promise<void> {
    const { selectedMap } =
      await this.rotationService.getNextUpdateTimeAndMapData();
    const bossName = "bossKnight";
    const spawnChance = this.modConfig.goonsSpawnChance;

    for (const mapName in this.maps) {
      const mapBosses = this.maps[mapName]?.base?.BossLocationSpawn || [];

      for (const mapBoss of mapBosses) {
        if (mapBoss.BossName !== bossName) continue;

        if (this.modConfig.debugLogs) {
          this.logger.info(
            `[Dynamic Goons] ${mapName}: Before Chance: ${mapBoss.BossChance}`
          );
        }

        mapBoss.BossChance = mapName === selectedMap ? spawnChance : 0;

        if (this.modConfig.debugLogs) {
          this.logger.info(
            `[Dynamic Goons] ${mapName}: After Chance: ${mapBoss.BossChance}`
          );
        }
      }
    }
  }
}

export const mod = new Mod();
