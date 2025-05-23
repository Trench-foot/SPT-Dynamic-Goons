/* eslint-disable @typescript-eslint/keyword-spacing */
/* eslint-disable @typescript-eslint/brace-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-mixed-spaces-and-tabs */
import * as fs from "node:fs";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { inject, injectable } from "tsyringe";
import { rotationChanceCalculator } from "../services/RotationChanceCalculator";

@injectable()
export class RotationService 
{
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private modConfig: any;
    private rotationData: string;
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    private mapConfig: any;
    constructor(
        @inject("Logger") private logger: ILogger,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        modConfig: any,
        rotationDataFilePath: string,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        mapConfig: any
    ) 
    {
        this.modConfig = modConfig;
        this.rotationData = rotationDataFilePath;
        this.mapConfig = mapConfig;
    }

    public async getNextUpdateTimeAndMapData(): Promise<{
        nextUpdateTime: number;
        selectedMap: string;
    }> 
    {
        try 
        {
            const rotationData = await this.readRotationData();
            return {
                nextUpdateTime: rotationData.nextUpdateTime,
                selectedMap: rotationData.selectedMap
            };
        }
        catch (error) 
        {
            this.logger.error(
                `[Dynamic Goons] Error reading rotation data: ${error.message}`
            );
            return { nextUpdateTime: 0, selectedMap: "bigmap" };
        }
    }

    public async handleRotationChance(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        rotationData: any,
        currentTime: number,
        rotationInterval: number
    ): Promise<void> 
    {
        const remainingTime = rotationData.nextUpdateTime - currentTime;
        const rotationChance = rotationChanceCalculator(
            remainingTime,
            rotationInterval,
            this.logger,
            this.modConfig.debugLogs
        );

        if (this.modConfig.debugLogs) 
        {
            this.logger.info(
                `[Dynamic Goons] Remaining time: ${remainingTime}ms, Rotation chance: ${rotationChance}%`
            );
        }

        const randomRoll = Math.random() * 100;

        if (rotationData.lastRotationInterval !== this.modConfig.rotationInterval) 
        {
            if (this.modConfig.debugLogs) 
            {
                this.logger.info(
                    "[Dynamic Goons] Rotation interval changed. Rotating now."
                );
            }
            await this.selectRandomMapAndSave(rotationInterval);
	  return;
        }
	
        const nextUpdateTime = rotationData.nextUpdateTime;
        const chosenMap = rotationData.selectedMap;
        const lastUpdateTime = rotationData.lastUpdateTime;
	
        if (randomRoll <= rotationChance) 
        {
            if (this.modConfig.debugLogs) 
            {
                this.logger.info("[Dynamic Goons] Rotation triggered. Rotating now.");
            }
            await this.selectRandomMapAndSave(rotationInterval);
        }
        else
	  {
            const mapTime = Math.floor(((Date.now() - rotationData.lastUpdateTime)/600000) + rotationData.timeOnMap);

            if(this.modConfig.debugLogs)
            {
                this.logger.info((Date.now()).toString());
                this.logger.info(rotationData.lastUpdateTime);
                this.logger.info(mapTime.toString());
            }
            
            const spawnChance = await this.updateSpawnChance(mapTime, rotationData);
		
            await this.saveNextUpdateTimeAndMapData(
                nextUpdateTime,
                chosenMap,
                rotationInterval,
                lastUpdateTime,
                mapTime,
                spawnChance
            );
	  }
    }

    public calculateRotationChance(remainingTime: number): number 
    {
        const maxTime = this.modConfig.rotationInterval * 60 * 1000;
        const maxChance = 100;

        if (remainingTime <= 0) return maxChance;

        const factor = Math.min(Math.max(remainingTime / maxTime, 0), 1);
        const chance = maxChance * (1 - factor ** 2);

        if (this.modConfig.debugLogs) 
        {
            this.logger.info(
                `[Dynamic Goons] Remaining time: ${remainingTime}ms, Rotation chance: ${chance}%`
            );
        }

        return chance;
    }

    private async selectRandomMapAndSave(
        rotationInterval: number
    ): Promise<void> 
    {
        const rotationData = await this.readRotationData();
        const currentMap = rotationData.selectedMap;
        const chosenMap = await this.getRandomMap(rotationData.selectedMap);
        const spawnChance = await this.modConfig.goonsSpawnChance;
        const lingerTime = rotationData.timeOnMap;

        const nextUpdateTime = Date.now() + rotationInterval * 60 * 1000;
        const lastUpdateTime = Date.now();

        if (this.modConfig.debugLogs) 
        {
            const updateTimeString = new Date(nextUpdateTime).toLocaleTimeString(
                "en-GB",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );
            const remainingTimeFormatted = this.formatTime(
                nextUpdateTime - Date.now()
            );

            this.logger.info(
                `[Dynamic Goons] Selected Map: ${chosenMap}, Update Scheduled in: ${updateTimeString}, Remaining Time: ${remainingTimeFormatted}, Last Rotation: ${new Date(
                    lastUpdateTime
                ).toLocaleString()}`
            );
        }
	
        // Save spawn chance if the goons stay on the same map
        if (chosenMap == currentMap)
        {
	          await this.saveNextUpdateTimeAndMapData(
                nextUpdateTime,
                chosenMap,
                rotationInterval,
                lastUpdateTime,
	              lingerTime,
	              rotationData.dynamicSpawnChance
            );
        }
        else
        {
            await this.saveNextUpdateTimeAndMapData(
                nextUpdateTime,
                chosenMap,
                rotationInterval,
                lastUpdateTime,
	              0,
	              spawnChance
            );
        }
    }

    private async saveNextUpdateTimeAndMapData(
        nextUpdateTime: number,
        selectedMap: string,
        lastRotationInterval: number,
        lastUpdateTime: number,
        timeOnMap: number,
        dynamicSpawnChance: number
    ): Promise<void> 
    {
        try 
        {
            const data = {
                nextUpdateTime,
                selectedMap,
                lastRotationInterval,
                lastUpdateTime,
                timeOnMap,
                dynamicSpawnChance
            };
            await fs.promises.writeFile(
                this.rotationData,
                JSON.stringify(data, null, 6),
                "utf8"
            );

            if (this.modConfig.debugLogs) 
            {
                this.logger.info("[Dynamic Goons] Rotation data saved successfully.");
            }
        }
        catch (error) 
        {
            this.logger.error(
                `[Dynamic Goons] Error saving rotation data: ${error.message}`
            );
        }
    }

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    public async readRotationData(): Promise<any> 
    {
        try 
        {
            const data = await fs.promises.readFile(this.rotationData, "utf8");
            return JSON.parse(data);
        }
        catch (error) 
        {
            this.logger.error(
                `[Dynamic Goons] Error reading rotation data: ${error.message}`
            );
            return {
                lastRotationInterval: 180,
                nextUpdateTime: 0,
                selectedMap: "bigmap",
                lastUpdateTime: 0,
                timeOnMap: 0,
                dynamicSpawnChance: 30
            };
        }
    }

    private async getEnabledMaps(): Promise<string[]> 
    {
        try 
        {
            const data = await fs.promises.readFile(this.mapConfig, "utf8");
            const json = JSON.parse(data);

            if (!json || !json.enabledMaps || typeof json.enabledMaps !== "object") 
            {
                throw new Error("Invalid JSON structure for enabled maps.");
            }

            // Filter only the maps that are set to true
            return Object.entries(json.enabledMaps)
                .filter(([_, enabled]) => enabled)
                .map(([mapName, _]) => mapName);
        }
        catch (error) 
        {
            this.logger.error(
                `[Dynamic Goons] Error reading enabled maps file: ${error.message}`
            );
            // Fallback to default maps if reading fails
            return ["bigmap", "shoreline", "lighthouse", "woods"];
        }
    }

    private async getRandomMap(
        excludeMap: string | null = null
    ): Promise<string> 
    {
        const enabledMaps = await this.getEnabledMaps();

        // Filter out the excluded map
        const availableMaps = excludeMap
            ? enabledMaps.filter((map) => map !== excludeMap)
            : enabledMaps;

        // Fallback to default maps if no available maps
        const defaultFallbackMaps = ["bigmap", "shoreline", "lighthouse", "woods"];
        const finalMaps =
      availableMaps.length > 0 ? availableMaps : defaultFallbackMaps;

        // Randomly select a map
        const selectedMap = finalMaps[Math.floor(Math.random() * finalMaps.length)];
        return selectedMap;
    }

    // This is just for making debugging logs easier to read for me :v
    private formatTime(ms: number): string 
    {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }
  
    // Update spawn chance based on time sense last rotation
    private updateSpawnChance(rc: number, rotationData: any): Promise<number> 
    {
	 const defaultSpawn = this.modConfig.goonsSpawnChance;
	 const changeBool = this.modConfig.dynamicSpawnChance;
	 const oldLingerTime = rotationData.timeOnMap;
	 const newLingerTime = rc;
	 const steepFactor = newLingerTime ** 0.5;  //Attempt to create a spawn chance curve similar to the rotationChanceCalculator
	 let dynamicSpawn = rotationData.dynamicSpawnChance;
	 
	 if (!changeBool)
	   {
		 return defaultSpawn; 
	   }
	   
	 if (newLingerTime === oldLingerTime)
	   {
		 return dynamicSpawn;
	   }

	  dynamicSpawn = defaultSpawn + Math.floor(steepFactor);
	  if (dynamicSpawn > 100)
	   {
		 dynamicSpawn = 100;
		 return dynamicSpawn;
	   }
	   return dynamicSpawn;
    }
}
