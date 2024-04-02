const { PlayerModel } = require("../models/player.models");

exports.getPlayerSetting = async (req, res) => {
  try {
    const host = req.get("host");
    const players = await PlayerModel.aggregate([
      { $match: { domain: host } },
      { $limit: 1 },
      /*{
        $project: {
          _id: 0,
          title: 1,
          sources: 1,
        },
      },*/
    ]);

    if (!players?.length) throw new Error("This Player doesn't exist");
    const player = players[0];

    const data = {
      jwplayer: {
        key: "W7zSm81+mmIsg7F+fyHRKhF3ggLkTqtGMhvI92kbqf/ysE99",
        width: "100%",
        height: "100%",
        preload: "metadata",
        primary: "html5",
        hlshtml: "true",
        controls: "true",
        playbackRateControls: [2.0, 1.75, 1.0, 0.75, 0.5],
        pipIcon: player?.player_options?.video_button_pip
          ? "enabled"
          : "disabled",
        autostart: player?.player_options?.video_autoplay || false,
        mute: player?.player_options?.video_mute || false,
        repeat: player?.player_options?.video_repeat || false,
        title: player?.player_options?.video_title || false,
        /*cast: {
          //customAppId: "Your Application ID",
        },*/
        horizontalVolumeSlider: true,
        skin: {
          name: "custom",
        },
        /*logo: {
          file: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
          link: "https://www.buymeacoffee.com/pingo",
        },*/
        captions: {
          color: "#FFF",
          fontSize: 14,
          backgroundOpacity: 0,
          edgeStyle: "raised",
        },
      },
      setting: {
        block_direct: player?.player_options?.block_direct || false,
        block_devtools: player?.player_options?.block_devtools || false,
        video_continue: player?.player_options?.video_continue || false,
        video_button_chromecast:
          player?.player_options?.video_button_chromecast || false,
        video_button_download:
          player?.player_options?.video_button_download || false,
        jw_version: "8.32.1",
      },
    };
    return res.json(data);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};
