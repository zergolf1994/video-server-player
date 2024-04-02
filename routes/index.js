"use strict";
const express = require("express");
const router = express.Router();
const { getEmbed } = require("../controllers/embed.controllers");
const { isIframe, isReferrer } = require("../middleware");
const {
  getSource,
  getSourceM3U8,
} = require("../controllers/source.controllers");
const { getMaster, getIndex } = require("../controllers/m3u8.controllers");
const {
  getStream,
  getStreamMp4,
} = require("../controllers/stream.controllers");
const { getPoster } = require("../controllers/poster.controllers");
const { getPlayerSetting } = require("../controllers/player.controllers");

router.all("/", async (req, res) => {
  return res.render("index", {});
});
//embed
router.get("/embed/:slug", getEmbed);
router.get("/d/:slug", isReferrer, getSource);
router.get("/h/:slug", isReferrer, getSourceM3U8);
router.get("/set", getPlayerSetting);

router.get("/master/:slug", isReferrer, getMaster);
router.get("/index/:slug", isReferrer, getIndex);
router.get("/:slug-:item.:ext(txt|html|png|jpg|ts)", isReferrer, getStream);
router.get("/:slug.:ext(mp4)", isReferrer, getStreamMp4);
router.get("/thumb/:slug-:item([1-9]|10).:ext(png|jpg)", getPoster);

router.get("/v/:slug", async (req, res) => {
  const { slug } = req.params;
  const data = { slug };

  return res.render("v", data);
});

router.get("/test", async (req, res) => {
  return res.render("test", {});
});

router.use("/server", require("./server.routes"));
router.all("*", async (req, res) => {
  return res.status(404).end();
});
module.exports = router;
