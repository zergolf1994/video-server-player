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

//embed
router.get("/embed/:slug", isIframe, getEmbed);
router.get("/d/:slug", isReferrer, getSource);
router.get("/h/:slug", isReferrer, getSourceM3U8);

router.get("/master/:slug", isReferrer, getMaster);
router.get("/index/:slug", isReferrer, getIndex);
router.get("/:slug-:item.:ext(txt|html|png|jpg|ts)", isReferrer, getStream);
router.get("/:slug.:ext(mp4)", isReferrer, getStreamMp4);

router.get("/v/:slug", async (req, res) => {
  const { slug } = req.params;
  const data = { slug };

  return res.render("v", data);
});

router.use("/server", require("./server.routes"));
router.all("*", async (req, res) => {
  const html = `
  <html>
    <head>
      <title>zembed.xyz</title>
      <style>
        html,body{
          padding: 0;
          margin: 0;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          width: 100%;
          background: #000;
          color: #fff;
        }
        p{
          width: 100%;
          text-align: center;
          font-size: 2rem;
          padding: 0.25rem;
          line-height: 2.5rem;
        }
      </style>
    </head>
    <body>
      <p>Power by zembed.xyz</p>
    </body>
  </html>
  `;
  return res.status(200).end(html);
});
module.exports = router;
