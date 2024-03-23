const { FileModel } = require("../models/file.models");

exports.getSource = async (req, res) => {
  try {
    const { slug } = req.params;
    const files = await FileModel.aggregate([
      { $match: { slug } },
      { $limit: 1 },
      //media
      {
        $lookup: {
          from: "medias",
          localField: "_id",
          foreignField: "fileId",
          as: "sources",
          pipeline: [
            { $match: { quality: { $ne: "original" } } },
            { $sort: { quality: -1 } },
            {
              $lookup: {
                from: "servers",
                localField: "serverId",
                foreignField: "_id",
                as: "servers",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      sv_ip: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                server: { $arrayElemAt: ["$servers", 0] },
              },
            },
            {
              $set: {
                file: {
                  $cond: {
                    if: {
                      $eq: ["$$ROOT.quality", "original"],
                    },
                    then: {
                      $concat: [
                        "http://",
                        "$server.sv_ip",
                        "/",
                        "$$ROOT.file_name",
                      ],
                    },
                    else: {
                      $concat: [
                        "http://",
                        "$server.sv_ip",
                        ":8889/mp4/",
                        "$$ROOT.fileId",
                        "/",
                        "$$ROOT.file_name",
                      ],
                    },
                  },
                },
                default: {
                  $cond: {
                    if: {
                      $eq: ["$$ROOT.quality", "360"],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                file: 1,
                label: {
                  $concat: ["$$ROOT.quality", "P"],
                },
                type: "video/mp4",
                default: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          title: 1,
          sources: 1,
          key: "W7zSm81+mmIsg7F+fyHRKhF3ggLkTqtGMhvI92kbqf/ysE99",
          width: "100%",
          height: "100%",
          preload: "metadata",
          primary: "html5",
          hlshtml: "true",
          controls: "true",
          pipIcon: "enabled",
          playbackRateControls: [2.0, 1.75, 1.0, 0.75, 0.5],
        },
      },
    ]);

    if (!files?.length) throw new Error("This video doesn't exist");
    const file = files[0];

    return res.json(file);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};

exports.getSourceM3U8 = async (req, res) => {
  try {
    const host = req.get("host");
    const { slug } = req.params;
    const files = await FileModel.aggregate([
      { $match: { slug } },
      { $limit: 1 },
      //media
      {
        $lookup: {
          from: "medias",
          localField: "_id",
          foreignField: "fileId",
          as: "medias",
          pipeline: [
            { $match: { quality: { $ne: "original" } } },
            {
              $project: {
                _id: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          encoded: { $size: "$medias" },
        },
      },
      {
        $set: {
          sources: {
            $cond: {
              if: { $gte: ["$encoded", 1] },
              then: [
                {
                  file: {
                    $concat: ["//", host, "/master/", "$$ROOT.slug"],
                  },
                  type: "application/vnd.apple.mpegurl",
                },
              ],
              else: null,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          title: 1,
          sources: 1,
          key: "W7zSm81+mmIsg7F+fyHRKhF3ggLkTqtGMhvI92kbqf/ysE99",
          width: "100%",
          height: "100%",
          preload: "metadata",
          primary: "html5",
          hlshtml: "true",
          controls: "true",
          pipIcon: "enabled",
          playbackRateControls: [2.0, 1.75, 1.0, 0.75, 0.5],
        },
      },
    ]);

    if (!files?.length) throw new Error("This video doesn't exist");
    const file = files[0];

    return res.json(file);
  } catch (err) {
    return res.json({ error: true, msg: err?.message });
  }
};
