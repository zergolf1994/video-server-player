const { FileModel } = require("../models/file.models");

exports.getEmbed = async (req, res) => {
  let data = {
    title: `Player`,
    base_color: `#ff0000`,
    host: req.get("host"),
    lang: "th",
  };

  try {
    const { slug } = req.params;
    data.slug = slug;
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
                quality: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          total_media: { $size: "$medias" },
        },
      },
      //encode
      {
        $lookup: {
          from: "encodes",
          localField: "_id",
          foreignField: "fileId",
          as: "encodes",
          pipeline: [
            { $match: { type: "video" } },
            {
              $project: {
                quality: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          total_encode: { $size: "$encodes" },
        },
      },
      {
        $set: {
          ready: {
            $cond: {
              if: {
                $gt: ["$total_media", 0],
              },
              then: true,
              else: false,
            },
          },
          encoding: {
            $cond: {
              if: {
                $gt: ["$total_encode", 0],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          ready: 1,
          encoding: 1,
        },
      },
    ]);

    if (!files?.length) throw new Error("This video doesn't exist");
    const file = files[0];

    data.title = file.title;
    data.code = file._id;

    if (!file.ready && !file.encoding) throw new Error("Formatting video");
    if (!file.ready && file.encoding)
      throw new Error("We're processing this video. Check back later.");

    return res.render("embed", data);
  } catch (err) {
    data.title = err?.message;
    data.msg = err?.message;
    return res.render("error", data);
  }
};
