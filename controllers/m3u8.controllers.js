const os = require("os");
const axios = require("axios");

const { FileModel } = require("../models/file.models");
const { MediaModel } = require("../models/media.models");
const { Cached } = require("../utils/cache.utils");
const { StreamModel } = require("../models/stream.models");

exports.getMaster = async (req, res) => {
  try {
    const host = req.get("host");
    const { slug } = req.params;
    const cache = await Cached.m3u8.get(`master-${slug}.json`);

    if (!cache.error) {
      let ArrayMaster = ["#EXTM3U", ...cache];

      res.set("content-type", "application/x-mpegURL");
      return res.end(ArrayMaster.join(os.EOL).replace(/\[HOST\]/g, host));
    }

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

      return [lines.join(","), `//[HOST]/index/${row?.slug}`, ""].join(os.EOL);
    });

    const saveCache = await Cached.m3u8.save(
      `master-${slug}.json`,
      await Promise.all(videoPromises)
    );
    let ArrayMaster = ["#EXTM3U", ...saveCache];

    res.set("content-type", "application/x-mpegURL");
    return res.end(ArrayMaster.join(os.EOL).replace(/\[HOST\]/g, host));
  } catch (err) {
    console.log(err);
    return res.status(404).end();
  }
};

exports.getIndex = async (req, res) => {
  try {
    const host = req.get("host");
    const { slug } = req.params;

    let items = [];

    const cache = await Cached.m3u8.get(`index-${slug}.json`);

    if (cache.error) {
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
            streamId: 1,
          },
        },
      ]);

      if (!medias?.length) throw new Error("This video doesn't exist");
      const media = medias[0];

      const { data, status } = await axios.get(media?.file);
      if (status != 200) throw new Error("This video doesn't exist");
      if (!media.streamId) {
        //random streamId
        const stream = await StreamModel.findOne({ enable: true }, null, {
          sort: { used: 1 },
        }).select("_id");
        if (!stream?._id) throw new Error("Not Stream");
        const updateStreamId = await MediaModel.updateOne(
          { slug },
          { streamId: stream._id }
        );

        if (updateStreamId?.matchedCount) {
          await StreamModel.findByIdAndUpdate(
            { _id: stream?._id },
            { used: await MediaModel.countDocuments({ streamId: stream._id }) }
          );
        }
        media.streamId = stream._id;
      }

      items = await Cached.m3u8.save(`index-${slug}.json`, {
        streamId: media?.streamId,
        index: data.index,
      });
    } else {
      items = cache;
    }

    //

    let domain = await Cached.domain.get(`${items.streamId}.json`);
    if (domain.error) {
      const stream = await StreamModel.findOne({
        _id: items.streamId,
        enable: true,
      }).select("domain");
      domain = await Cached.domain.save(
        `${items.streamId}.json`,
        stream.domain
      );
    }
    let i = 0,
      c = domain?.length - 1;
    const hls_lists = items.index.map((item) => {
      if (isNaN(item)) {
        return item;
      } else {
        if (c == 0) {
          return `//${domain[c]}/${slug}-${item}.html`;
        } else {
          const link = `//${domain[i]}/${slug}-${item}.html`;
          if (i == c) {
            i = 0;
          } else {
            i++;
          }
          return link;
        }
      }
    });
    res.set("content-type", "application/x-mpegURL");
    return res.end(hls_lists.join(os.EOL));
  } catch (err) {
    console.log(err);
    return res.status(404).end();
  }
};
