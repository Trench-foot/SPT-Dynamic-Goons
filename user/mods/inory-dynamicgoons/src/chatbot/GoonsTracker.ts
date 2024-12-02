import { inject, injectAll, injectable } from "tsyringe";

import { AbstractDialogueChatBot } from "@spt/helpers/Dialogue/AbstractDialogueChatBot";
import { IChatCommand } from "@spt/helpers/Dialogue/Commando/IChatCommand";
import { IUserDialogInfo } from "@spt/models/eft/profile/ISptProfile";
import { MemberCategory } from "@spt/models/enums/MemberCategory";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { MailSendService } from "@spt/services/MailSendService";

@injectable()
export class GoonsTracker extends AbstractDialogueChatBot {
  constructor(
    @inject("WinstonLogger") logger: ILogger,
    @inject("MailSendService") mailSendService: MailSendService,
    @injectAll("TrackerCommands") chatCommands: IChatCommand[]
  ) {
    super(logger, mailSendService, chatCommands);
  }

  public getChatBot(): IUserDialogInfo {
    return {
      _id: "674d96b02225f02fff47b3be",
      aid: 777,
      Info: {
        Level: 1,
        MemberCategory: MemberCategory.SHERPA,
        SelectedMemberCategory: MemberCategory.SHERPA,
        Nickname: "Goons Tracker",
        Side: "Usec",
      },
    };
  }

  protected getUnrecognizedCommandMessage(): string {
    return (
      "Unrecognized command, please type goons track to receive details of The Goon's location. " +
      "Or type goons rotation if you need an explanation for their rotation mechanic."
    );
  }
}
