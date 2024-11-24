import { FikaDialogueController } from "../../../fika-server/src/controllers/FikaDialogueController";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { inject, injectable } from "tsyringe";
import { ICoreConfig } from "@spt/models/spt/config/ICoreConfig";
import { ConfigTypes } from "@spt/models/enums/ConfigTypes";

// Patch the getFriendList method of FikaDialogueController at runtime
@injectable()
export class PatchFikaDialogueController {
  constructor(@inject("ConfigServer") private configServer: ConfigServer) {
    this.patchGetFriendList();
  }

  public patchGetFriendList() {
    const originalGetFriendList =
      FikaDialogueController.prototype.getFriendList;

    // Override the getFriendList method dynamically
    FikaDialogueController.prototype.getFriendList = function (
      sessionID: string
    ) {
      let botsAndFriends = this.dialogController.dialogueChatBots.map((v) =>
        v.getChatBot()
      );

      const core = this.configServer.getConfig<ICoreConfig>(ConfigTypes.CORE);

      if (!core.features.chatbotFeatures.commandoEnabled) {
        botsAndFriends = botsAndFriends.filter((u) => u._id != "sptCommando");
      }

      if (!core.features.chatbotFeatures.sptFriendEnabled) {
        botsAndFriends = botsAndFriends.filter((u) => u._id != "sptFriend");
      }

      const friendsIds =
        this.fikaPlayerRelationsHelper.getFriendsList(sessionID);

      for (const friendId of friendsIds) {
        const profile = this.profileHelper.getPmcProfile(friendId);

        botsAndFriends.push({
          _id: profile._id,
          aid: profile.aid,
          Info: {
            Nickname: profile.Info.Nickname,
            Level: profile.Info.Level,
            Side: profile.Info.Side,
            MemberCategory: profile.Info.MemberCategory,
            SelectedMemberCategory: profile.Info.SelectedMemberCategory,
          },
        } as any);
      }

      return {
        Friends: botsAndFriends,
        Ignore: this.fikaPlayerRelationsHelper.getIgnoreList(sessionID),
        InIgnoreList: this.fikaPlayerRelationsHelper.getInIgnoreList(sessionID),
      };
    };
  }
}
