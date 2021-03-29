# irkit-proxy

- [irkit-proxy](#irkit-proxy)
  - [Setup](#setup)
    - [Env setting](#env-setting)
    - [mapping setting](#mapping-setting)
  - [Run](#run)
    - [proxy example](#proxy-example)
  - [Request](#request)

:loud_sound: Simple API tool as IRKit proxy. [IRKit](https://getirkit.com/) is a IoT device as remote controller.

Use this proxy for below reasons:

- IRKit api does not support tlsv1.2, and IFTTT webhook now only supports tlsv1.2 and above.
So by for now, IFTTT cannot send request to IRkit apis.

- IFTTT free plan has became define only 3 custom actions.
- IFTTT trigger cannot request multiple times all at once.

IFTTT action is like below:

```:sh
<smart speaker device> ---> <this proxy api> ---> <irkit api>
```

`Google Assistant` has ingredient util on ITFFF (speaking phrase can be used on next webhook),
so `GoogleHome` is especially suitable.

## Setup

### Env setting

This api is restricted by `apikey` on request body, so you should deploy on tls.

Set `APIKEY` with any random value on `.env`.

```:sh
# mandatory
APIKEY=xxxx

# option (if use standalone ssl.)
USETLS=true
KEY_PATH=./server.key
CERT_PATH=./server.cert
PORT=443
```

### mapping setting

We should define mappings for `phrase` and `IRkit request payload`.

Set `mappings.json` like below:

```:json
[
    {
        "words": ["照明", "つけて"],
        "payload": "clientkey=xxx&deviceid=xxx&message={\"format\":\"raw\",\"freq\":38,\"data\":[999,999]}"
    },
    {
        "words": ["照明", "明るく"],
        "payload": "clientkey=xxx&deviceid=xxx&message={\"format\":\"raw\",\"freq\":38,\"data\":[999,999]}"
    },
    {
        "words": ["照明", "暗く"],
        "payload": "clientkey=xxx&deviceid=xxx&message={\"format\":\"raw\",\"freq\":38,\"data\":[999,999]}"
    }
]
```

If all `words` are contained in request `phrase`, its correspond `payload` will be use.

## Run

```:sh
$ docker build -t irkit-proxy .

# proxy case
$ docker run -d -p 127.0.0.1:8000:8000 --restart always irkit-proxy

# standalone case (set env USETLS=true)
$ docker run -d -p 443:443 --restart always irkit-proxy
```

### proxy example

nginx(openresty) settings:

```:sh
server {
    listen 443 ssl;
    server_name api.nicopun.com;

    # fallback certs, make sure to create them before hand
    ssl_certificate /etc/openresty/default.pem;
    ssl_certificate_key /etc/openresty/default.key;

    ssl_certificate_by_lua_block {
        require("resty.acme.autossl").ssl_certificate()
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

## Request

```:sh
ᐅ curl -XPOST -H 'content-type: application/json' \
    -d '{"apikey": "xxxx", "phrase": "照明 を 明るく して", "repeat": 2}' \
    https://api.nicopun.com/v1/api/irkit
```

