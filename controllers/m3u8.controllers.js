const os = require("os");
const axios = require("axios");

const { FileModel } = require("../models/file.models");
const { MediaModel } = require("../models/media.models");

exports.getMaster = async (req, res) => {
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
          as: "videos",
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
                  $concat: [
                    "http://",
                    "$server.sv_ip",
                    "/media/",
                    "$$ROOT.slug",
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                file: 1,
                slug: 1,
                quality: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          videos: 1,
        },
      },
    ]);

    if (!files?.length) throw new Error("This video doesn't exist");
    const file = files[0];

    const videoPromises = file.videos.map(async (row) => {
      const { data, status } = await axios.get(row?.file);
      if (status != 200) return null;

      const lines = data.master.map((line) => {
        if (line.match(/RESOLUTION=(.*?)/gm)) {
          if (isNaN(row?.quality)) {
            return line;
          } else {
            const match = line.match(
              /RESOLUTION=([\w\-]{1,200})x([\w\-]{1,200})$/i
            );
            return `RESOLUTION=${match[1]}x${row?.quality}`;
          }
        } else {
          return line;
        }
      });

      return [lines.join(","), `//${host}/index/${row?.slug}`, ""].join(os.EOL);
    });

    const video = await Promise.all(videoPromises);
    let ArrayMaster = ["#EXTM3U", ...video];

    res.set("content-type", "application/x-mpegURL");
    return res.end(ArrayMaster.join(os.EOL));
  } catch (err) {
    console.log(err);
    return res.status(404).end();
  }
};

exports.getIndex = async (req, res) => {
  try {
    const host = req.get("host");
    const { slug } = req.params;
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
            $concat: ["http://", "$server.sv_ip", "/media/", "$$ROOT.slug"],
          },
        },
      },
      {
        $project: {
          _id: 0,
          file: 1,
          slug: 1,
        },
      },
    ]);

    if (!medias?.length) throw new Error("This video doesn't exist");
    const media = medias[0];

    const { data, status } = await axios.get(media?.file);
    if (status != 200) throw new Error("This video doesn't exist");

    const hls_lists = data.index.map((item) => {
      if (isNaN(item)) {
        return item;
      } else {
        return `//${host}/${slug}-${item}.html`;
      }
    });
    res.set("content-type", "application/x-mpegURL");
    return res.end(hls_lists.join(os.EOL));
  } catch (err) {
    return res.status(404).end();
  }
};
