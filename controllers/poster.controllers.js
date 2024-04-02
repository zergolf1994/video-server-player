const request = require("request");
const mime = require("mime-types");
const { FileModel } = require("../models/file.models");
const { Cached } = require("../utils/cache.utils");

exports.getPoster = async (req, res) => {
  try {
    const { slug, item, ext } = req.params;
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
            { $sort: { quality: 1 } },
            { $limit: 1 },
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
                  $concat: [
                    "http://",
                    "$server.sv_ip",
                    ":8889/thumb/",
                    "$$ROOT.fileId",
                    "/",
                    "$$ROOT.file_name",
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                file: 1,
                dimention: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          media: { $arrayElemAt: ["$medias", 0] },
        },
      },
      {
        $project: {
          _id: 1,
          media: 1,
          duration: 1,
        },
      },
    ]);
    if (!files?.length) throw new Error("This video doesn't exist");
    const file = files[0];
    const total = file?.duration;
    const url = `${file.media.file}/thumb-${Math.floor(
      (total / item) * 1000
    )}.jpg`;

    let buffers = [];
    let length = 0;
    request(url)
      .on("response", function (res) {
        res.headers["content-type"] = mime.lookup(ext);
        res.headers["Cache-control"] = "public, max-age=3600";
      })
      .on("data", function (chunk) {
        length += chunk.length;
        buffers.push(chunk);
      })
      .on("end", async function () {
        if (res?.statusCode == 200) {
          let data = Buffer.concat(buffers);
          Cached.poster.save(`${slug}-${item}.${ext}`,data);
        }
      })
      .pipe(res);
  } catch (err) {
    return res.status(404).end();
  }
};
