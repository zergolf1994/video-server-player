const path = require("path");
const fs = require("fs-extra");

exports.getCache = (videoSlug) => {
  try {
    const _dir = path.join(global.dir, ".cached", "stream"),
      _file = path.join(_dir, `${videoSlug}`);

    if (!fs.existsSync(_dir)) {
      fs.mkdirSync(_dir, { recursive: true });
    }

    if (!fs.existsSync(_file)) throw new Error("not found");

    const read = fs.readFileSync(_file, "utf8");
    return JSON.parse(read);
  } catch (error) {
    return { error: true };
  }
};

exports.saveCache = (videoSlug, data) => {
  try {
    const _dir = path.join(global.dir, ".cached", "stream"),
      _file = path.join(_dir, `${videoSlug}`);

    if (!fs.existsSync(_dir)) {
      fs.mkdirSync(_dir, { recursive: true });
    }
    console.log("new", videoSlug);
    fs.writeFileSync(_file, JSON.stringify(data), "utf8");

    return data;
  } catch (error) {
    return { error: true };
  }
};

exports.deleteCache = (videoSlug) => {
  try {
    const _dir = path.join(global.dir, ".cached", "stream"),
      _file = path.join(_dir, `${videoSlug}`);

    if (!fs.existsSync(_dir)) {
      fs.mkdirSync(_dir, { recursive: true });
    }

    if (!fs.existsSync(_file)) throw new Error("not found");

    fs.unlinkSync(_file);
    return { success: true };
  } catch (error) {
    return { error: true };
  }
};
