"use strict";

const fs = require("fs");
const axios = require("axios");
require("dotenv").config();
const logger = require("log4js").getLogger();
logger.level = process.env.LOG_LEVEL || "warn";

const Serve = async (conf) => {
  // cron proc
  if (conf.schedules) registerCron(conf);

  // server proc
  let server;
  if (process.env.USETLS) {
    server = require("https").createServer(
      {
        key: fs.readFileSync(process.env.KEY_PATH),
        cert: fs.readFileSync(process.env.CERT_PATH),
      },
      async (req, res) => {
        req.protocol = "https";
        await apply(req, res, conf?.rules);
      }
    );
  } else {
    server = require("http").createServer(async (req, res) => {
      req.protocol = "http";
      await apply(req, res, conf?.rules);
    });
  }
  const port = process.env.PORT || 8000;
  server.listen(port, () => {
    const schema = process.env.USETLS ? "HTTPS" : "HTTP";
    logger.info(`${schema} Server is listening on PORT ${port}`);
  });

  server.on("error", (e) => {
    logger.error(e);
    process.exit(1);
  });
};

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const request = async (use_rule, repeat) => {
  const base_url = "https://api.nature.global";
  let failtimes = 0;
  let options = {
    method: "post",
    // data: use_rule.payload,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
    },
  };

  switch (String(use_rule.type).toLowerCase) {
    case "signal":
      options.url = `${base_url}/1/signals/${use_rule.signal_id}/send`;
      break;
    case "appliance:light":
      options.url = `${base_url}/1/appliances/${use_rule.appliance_id}/light`;
      options.data = use_rule.payload;
      break;
    case "appliance:tv":
      options.url = `${base_url}/1/appliances/${use_rule.appliance_id}/tv`;
      options.data = use_rule.payload;
      break;
    default:
      logger.warn(`type ${use_rule.type} is not supported`);
      break;
  }

  for (let i = 0; i < repeat; i++) {
    try {
      logger.info(`request ${i + 1} of ${repeat}`);
      const resp = await axios(options);
      if (resp.status === 200) {
        logger.info(`Accepted ${i + 1} times.`);
      } else {
        logger.warn("request to nature is failed", resp);
        failtimes++;
      }
    } catch {
      (e) => {
        throw new Exception(e);
      };
    }
    await sleep(1000);
  }
  return failtimes;
};

const registerCron = async (c) => {
  const cron = require("cron").CronJob;
  for (const idx in c.schedules) {
    const schedule = c.schedules[idx];
    const rule = c.rules.find((r) => schedule.ruleId === r.id);
    if (rule) {
      new cron(
        schedule.cronTime,
        async () => await request(rule, schedule.repeat || 1),
        null,
        true,
        schedule.timezone || process.env.TIME_ZONE
      );
      logger.info(
        `ruleId ${schedule.ruleId} is scheduled on ${schedule.cronTime}.`
      );
    } else {
      logger.warn(`ruleId ${schedule.ruleId} is not defined.`);
    }
  }
};

const apply = async (req, res, confmap) => {
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", async () => {
    res.setHeader(
      "Access-Control-Allow-Headers",
      process.env.ACCESS_CONTROL_ALLOW_HEADERS || "*"
    );
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.ACCESS_CONTROL_ALLOW_ORIGIN || "*"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      process.env.ACCESS_CONTROL_ALLOW_METHODS || "*"
    );
    if (process.env.ACCESS_CONTROL_ALLOW_CREDENTIALS)
      res.setHeader("Access-Control-Allow-Credentials", true);
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
    // healthcheck ep
    if (url.pathname === "/status" && req.method === "GET") {
      res.statusCode = 200;
      res.end("ok");
      return;
    }
    // pre flight
    else if (url.pathname === "/v1/api/nature" && req.method === "OPTIONS") {
      res.statusCode = 200;
      res.end();
      return;
    }
    // api endpoint
    else if (url.pathname === "/v1/api/nature" && req.method === "POST") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        logger.warn("request params invalid", e);
        res.statusCode = 400;
        res.end("request params invalid");
        return;
      }
      if (data?.apikey !== process.env.APIKEY) {
        logger.warn("unauthorized");
        res.statusCode = 403;
        res.end("unauthorized");
        return;
      }
      const repeat = data?.repeat || 1;

      let use_rule;
      if (data.id) {
        use_rule = confmap.find((map) => data.id === map.id);
      } else {
        use_rule = confmap.find((map) =>
          map.words.every((word) => String(data?.phrase).includes(word))
        );
      }
      if (!use_rule?.id) {
        logger.warn("correspond mapping is not defined", data);
        res.statusCode = 400;
        res.end("correspond mapping is not defined");
        return;
      }

      try {
        const failtimes = await request(use_rule, repeat);
        if (failtimes === repeat) {
          logger.warn(`all request failed`);
          res.writeHead(400, { "content-type": "text/plain" });
          res.end(`all request failed.`);
          return;
        } else if (failtimes > 0) {
          logger.warn(`request partially successed. FailTimes: ${failtimes}`);
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(`request partially successed. FailTimes: ${failtimes}`);
          return;
        } else {
          logger.info("all request successed.");
          res.writeHead(200, { "content-type": "text/plain" });
          res.end("accepted");
          return;
        }
      } catch (e) {
        logger.error(e);
        res.statusCode = 500;
        res.end("request to nature came to exception");
      }
    } else {
      logger.warn(
        `reqeust path or method is invalid: Path: ${url.pathname}, method: ${req.method}`
      );
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
  });
};

const confpath = process.env.CONF_PATH || "./mappings.json";
const conf = JSON.parse(fs.readFileSync(confpath));
Serve(conf);
