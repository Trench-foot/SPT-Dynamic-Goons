import { inject, injectable } from "tsyringe";
import { IChatCommand } from "@spt/helpers/Dialogue/Commando/IChatCommand";
import { ISendMessageRequest } from "@spt/models/eft/dialog/ISendMessageRequest";
import { IUserDialogInfo } from "@spt/models/eft/profile/ISptProfile";
import { MailSendService } from "@spt/services/MailSendService";
import { ChatLocationService } from "../services/ChatLocationService";

@injectable()
export class TrackerCommands implements IChatCommand {
  constructor(
    @inject("MailSendService") protected mailSendService: MailSendService,
    @inject("ChatLocationService") private locationService: ChatLocationService
  ) {}

  public getCommandPrefix(): string {
    return "goons";
  }

  public getCommandHelp(command: string): string {
    if (command === "track") {
      return "Usage: goons track - Get current rotation information.";
    } else if (command === "rotation") {
      return "Usage: goons rotation - Learn about the rotation mechanics.";
    }
  }

  public getCommands(): Set<string> {
    return new Set<string>(["track", "rotation"]);
  }

  public handle(
    command: string,
    commandHandler: IUserDialogInfo,
    sessionId: string,
    request: ISendMessageRequest
  ): string {
    if (command === "track") {
      try {
        const locationData = this.locationService.getLocationData();

        const responseMessage =
          `Location: ${locationData.location}\n` +
          `Last Seen: ${locationData.timeSinceLastSeen} minutes ago\n` +
          `Rotation: ${locationData.rotationChance.toFixed(2)}%\n` +
          `${locationData.dateLastSeen}`;

        this.mailSendService.sendUserMessageToPlayer(
          sessionId,
          commandHandler,
          responseMessage
        );
      } catch (error) {
        console.error("Error in handle:", error.message);
        this.mailSendService.sendUserMessageToPlayer(
          sessionId,
          commandHandler,
          "Error retrieving location data. Please try again later."
        );
      }
    } else if (command === "rotation") {
      const rotationExplanation =
        "The Goons stay on a map for a variable amount of time. " +
        "As time passes, the chance of them switching to a new " +
        "map increases. They will rotate to a new map at the end of a raid based on this chance. " +
        "Use goons track to see where they are currently and their rotation chance.";

      this.mailSendService.sendUserMessageToPlayer(
        sessionId,
        commandHandler,
        rotationExplanation
      );
    }

    return request.dialogId;
  }
}
