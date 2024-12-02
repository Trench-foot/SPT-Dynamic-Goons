import * as fs from "fs";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { inject, injectable } from "tsyringe";
import { rotationChanceCalculator } from "../services/RotationChanceCalculator";

@injectable()
export class RotationService {
  private modConfig: any;
  private rotationData: string;

  constructor(
    @inject("Logger") private logger: ILogger,
    modConfig: any,
    rotationDataFilePath: string
  ) {
    this.modConfig = modConfig;
    this.rotationData = rotationDataFilePath;
  }

  public async getNextUpdateTimeAndMapData(): Promise<{
    nextUpdateTime: number;
    selectedMap: string;
  }> {
    try {
      const rotationData = await this.readRotationData();
      return {
        nextUpdateTime: rotationData.nextUpdateTime,
        selectedMap: rotationData.selectedMap,
      };
    } catch (error) {
      this.logger.error(
        `[Dynamic Goons] Error reading rotation data: ${error.message}`
      );
      return { nextUpdateTime: 0, selectedMap: "bigmap" };
    }
  }

  public async handleRotationChance(
    rotationData: any,
    currentTime: number,
    rotationInterval: number
  ): Promise<void> {
    const remainingTime = rotationData.nextUpdateTime - currentTime;
    const rotationChance = rotationChanceCalculator(
      remainingTime,
      rotationInterval,
      this.logger,
      this.modConfig.debugLogs
    );

    if (this.modConfig.debugLogs) {
      this.logger.info(
        `[Dynamic Goons] Remaining time: ${remainingTime}ms, Rotation chance: ${rotationChance}%`
      );
    }

    const randomRoll = Math.random() * 100;

    if (rotationData.lastRotationInterval !== this.modConfig.rotationInterval) {
      if (this.modConfig.debugLogs) {
        this.logger.info(
          `[Dynamic Goons] Rotation interval changed. Rotating now.`
        );
      }
      await this.selectRandomMapAndSave(rotationInterval);
    }

    if (randomRoll <= rotationChance) {
      if (this.modConfig.debugLogs) {
        this.logger.info(`[Dynamic Goons] Rotation triggered. Rotating now.`);
      }
      await this.selectRandomMapAndSave(rotationInterval);
    }
  }

  public calculateRotationChance(remainingTime: number): number {
    const maxTime = this.modConfig.rotationInterval * 60 * 1000;
    const maxChance = 100;

    if (remainingTime <= 0) return maxChance;

    const factor = Math.min(Math.max(remainingTime / maxTime, 0), 1);
    const chance = maxChance * (1 - Math.pow(factor, 2));

    if (this.modConfig.debugLogs) {
      this.logger.info(
        `[Dynamic Goons] Remaining time: ${remainingTime}ms, Rotation chance: ${chance}%`
      );
    }

    return chance;
  }

  private async selectRandomMapAndSave(
    rotationInterval: number
  ): Promise<void> {
    const rotationData = await this.readRotationData();
    const chosenMap = this.getRandomMap(rotationData.selectedMap);

    const nextUpdateTime = Date.now() + rotationInterval * 60 * 1000;
    const lastUpdateTime = Date.now();

    if (this.modConfig.debugLogs) {
      const updateTimeString = new Date(nextUpdateTime).toLocaleTimeString(
        "en-GB",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      );
      if (this.modConfig.debugLogs) {
        const remainingTimeFormatted = this.formatTime(
          nextUpdateTime - Date.now()
        );
        this.logger.info(
          `[Dynamic Goons] Selected Map: ${chosenMap}, Update Scheduled in: ${updateTimeString}, Remaining Time: ${remainingTimeFormatted}, Last Rotation: ${new Date(
            lastUpdateTime
          ).toLocaleString()}`
        );
      }
    }

    await this.saveNextUpdateTimeAndMapData(
      nextUpdateTime,
      chosenMap,
      rotationInterval,
      lastUpdateTime
    );
  }

  private async saveNextUpdateTimeAndMapData(
    nextUpdateTime: number,
    selectedMap: string,
    lastRotationInterval: number,
    lastUpdateTime: number
  ): Promise<void> {
    try {
      const data = {
        nextUpdateTime,
        selectedMap,
        lastRotationInterval,
        lastUpdateTime,
      };
      await fs.promises.writeFile(
        this.rotationData,
        JSON.stringify(data, null, 4),
        "utf8"
      );

      if (this.modConfig.debugLogs) {
        this.logger.info(`[Dynamic Goons] Rotation data saved successfully.`);
      }
    } catch (error) {
      this.logger.error(
        `[Dynamic Goons] Error saving rotation data: ${error.message}`
      );
    }
  }

  public async readRotationData(): Promise<any> {
    try {
      const data = await fs.promises.readFile(this.rotationData, "utf8");
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(
        `[Dynamic Goons] Error reading rotation data: ${error.message}`
      );
      return {
        lastRotationInterval: 180,
        nextUpdateTime: 0,
        selectedMap: "bigmap",
        lastUpdateTime: 0,
      };
    }
  }

  private getRandomMap(excludeMap: string | null = null): string {
    const mapPool = ["bigmap", "shoreline", "lighthouse", "woods"];
    const availableMaps = excludeMap
      ? mapPool.filter((map) => map !== excludeMap)
      : mapPool;
    return availableMaps[Math.floor(Math.random() * availableMaps.length)];
  }

  //This is just for making debugging logs easier to read for me :v
  private formatTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }
}
