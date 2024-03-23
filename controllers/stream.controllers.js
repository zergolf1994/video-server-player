const request = require("request");
const mime = require("mime-types");
const { MediaModel } = require("../models/media.models");
const { saveCache, getCache } = require("../utils/cache.utils");

exports.getStream = async (req, res) => {
  try {
    const { slug, item, ext } = req.params;

    let media = await getCache(slug);

    if (!media.file) {
      const medias = await MediaModel.aggregate([
        { $match: { slug } },
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
                ":8889/hls/",
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
          },
        },
      ]);

      if (!medias?.length) throw new Error("This video doesn't exist");
      media = medias[0];
      saveCache(slug, media);
    }
    const url = `${media.file}/seg-${item}-v1-a1.ts`;

    request(url)
      .on("response", function (res) {
        res.headers["content-type"] = mime.lookup(ext);
        res.headers["Cache-control"] = "public, max-age=31536000, immutable";
      })
      .pipe(res);
  } catch (err) {
    console.log(err);
    return res.status(404).end();
  }
};

exports.getStreamMp4 = async (req, res) => {
  try {
    const { slug, item, ext } = req.params;

    let media = await getCache(slug);

    if (!media.file) {
      const medias = await MediaModel.aggregate([
        { $match: { slug } },
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
                ":8889/hls/",
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
          },
        },
      ]);

      if (!medias?.length) throw new Error("This video doesn't exist");
      media = medias[0];
      saveCache(slug, media);
    }
    const url = media.file.replace("/hls/", "/mp4/");
    const headers = Object.assign(req.headers);
    delete headers.host;
    delete headers.referer;

    request({ url, headers })
      .on("response", (resp) => {
        res.statusCode = resp.statusCode;
        Object.keys(resp.headers).forEach((key) => {
          res.setHeader(key, resp.headers[key]);
        });
      })
      .pipe(res);
  } catch (err) {
    console.log(err);
    return res.status(404).end();
  }
};
