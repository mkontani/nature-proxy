"use strict";

const fs = require("fs");
const http = require("http");
const https = require("https");
const axios = require("axios");
require("dotenv").config();

const Serve = async (conf) => {
  let server;
  if (process.env.USETLS) {
    server = https.createServer(
      {
        key: fs.readFileSync(process.env.KEY_PATH),
        cert: fs.readFileSync(process.env.CERT_PATH),
      },
      async (req, res) => {
        req.protocol = "https";
        await apply(req, res, conf);
      }
    );
  } else {
    server = http.createServer(async (req, res) => {
      req.protocol = "http";
      await apply(req, res, conf);
    });
  }
  const port = process.env.PORT || 8000;
  server.listen(port, () => {
    const schema = process.env.USETLS ? "HTTPS" : "HTTP";
    console.log(`${schema} Server is listening on PORT ${port}`);
  });

  server.on("error", (e) => {
    console.log(e);
    process.exit(1);
  });
};

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const apply = async (req, res, confmap) => {
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", async () => {
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
    // healthcheck ep
    if (url.pathname === "/status" && req.method === "GET") {
      res.statusCode = 200;
      res.end("ok");
      return;
    }
    // api endpoint
    else if (url.pathname === "/v1/api/irkit" && req.method === "POST") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log("unauthorized");
        res.statusCode = 403;
        res.end("unauthorized");
        return;
      }
      if (data?.apikey !== process.env.APIKEY) {
        console.log("unauthorized");
        res.statusCode = 401;
        res.end("unauthorized");
        return;
      }
      const repeat = data?.repeat || 1;

      const usemap = confmap.find((map) => {
        return map.words.every((word) => String(data?.phrase).includes(word));
      });
      if (!usemap?.payload) {
        console.log("bad request", data);
        res.statusCode = 400;
        res.end("specified phrase is not match");
        return;
      }

      let failtimes = 0;
      for (let i = 0; i < repeat; i++) {
        try {
          const resp = await axios({
            method: "post",
            url: "https://api.getirkit.com/1/messages",
            data: usemap.payload,
            headers: {
              "content-type": "application/x-www-form-urlencoded",
            },
          });
          if (resp.status === 200) {
            console.log(`Accepted ${i + 1} times.`);
          } else {
            console.log(resp);
            failtimes++;
          }
        } catch {
          (e) => {
            console.log(e);
            res.statusCode = 500;
            res.end("internal server error");
          };
        }
        await sleep(1000);
      }
      if (failtimes === repeat) {
        res.writeHead(400, { "content-type": "text/plain" });
        res.end(`All request failed.`);
        return;
      } else if (failtimes > 0) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(`request partially failed. FailTimes: ${failtimes}`);
        return;
      } else {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("Accepted");
        return;
      }
    } else {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
  });
};

const conf = require("./mappings.json");
Serve(conf);
