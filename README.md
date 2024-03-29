# nature-proxy

[![DockerCI][docker-badge]][docker-ci]

[docker-badge]: https://github.com/mkontani/nature-proxy/workflows/Docker%20Image%20CI/badge.svg
[docker-ci]: https://github.com/mkontani/nature-proxy/actions/workflows/docker-image.yml

- [nature-proxy](#nature-proxy)
  - [Setup](#setup)
    - [Generate nature request payload](#generate-nature-request-payload)
    - [Env setting](#env-setting)
    - [Config setting](#config-setting)
    - [IFTTT Action Setting](#ifttt-action-setting)
      - [IF](#if)
      - [THEN](#then)
  - [Run](#run)
  - [Build](#build)
  - [Manual Request](#manual-request)
    - [Request with id](#request-with-id)
    - [Request with phrase](#request-with-phrase)

:loud_sound: Simple API tool as nature proxy. [nature](https://developer.nature.global) is a IoT device as remote controller,
and [IFTTT](https://ifttt.com/) is a trigger and action service with IoT device.

This proxy addresses following problems:

- IFTTT free plan has became define only 3 custom actions.
- IFTTT trigger cannot request multiple times all at once.
- resolve CORS errs (requests by web browser) for nature apis.
- schedule(cron) support.

IFTTT action is like below:

<!---
```plantuml
@startuml
actor Actor
Actor -> SmartSpeakerDevice
SmartSpeakerDevice -> IFTTT: phrase(action and N times)
Actor -> browser: trigger by any api tools
browser -> natureproxy: proxy req(action and N times)
IFTTT -> natureproxy: webhook req
group loop N times
natureproxy -> natureAPI: API req
natureAPI -> natureproxy: result
end
natureproxy -> IFTTT: summary result
...
group loop N times on schedule
natureproxy -> natureAPI: API req
natureAPI -> natureproxy: result
end
@enduml
```
-->

![image](https://www.plantuml.com/plantuml/svg/hP31IiGm48RlUOevwi4-G0-o2oBiHOJj2wJjq8PDCd5cujgtDoskLThZ7l87Xk_xC-GWQbbpyCPsIWp7ESsIyFGCvs1Ppmdj1Va5Frs7PZkQmTDhqpGrf96ju4FfSXJ1nXxUG5r0ULmxMwQh8DUWx8O16TgfaEKa1qhanVmGCnojPiR4z3NLi5p0-B7xmBB2nhbYEn9TPiiCJ3c19qeto_nXL_NuVggXn2BzZZRLZ9Az6epzlvhrDoI7O7cwWLLLxQm0546w4VliyLxh74hauBy1)

`Google Assistant` has ingredient util on IFTTT (speaking phrase can be used on next webhook),
so `GoogleHome` is especially suitable.

## Setup

### Generate nature request payload

See details: <https://developer.nature.global>

```sh
# get props example
$ curl -X GET "https://api.nature.global/1/appliances" \
  -H "accept: application/json" \
  -H "Authorization: Bearer $TOKEN" | jq | tee remo-appliance.json
```

### Env setting

This api is restricted by `apikey` on request body, so you should deploy on tls.

Set `APIKEY` with any random value on `.env`.

`ACCESS_TOKEN` is need for requesting nature-api.
see <https://home.nature.global/home>

```:sh
# mandatory
APIKEY=xxxx
ACCESS_TOKEN=xxxx

# option
LOG_LEVEL=info (defult: `warn`)
PORT=9999 (default: `8000`)
CONF_PATH=/path/to/conf (default: `./mappings.json`)

# option (for preflight)
ACCESS_CONTROL_ALLOW_ORIGIN=https://example.com (default: *)
ACCESS_CONTROL_ALLOW_HEADERS=X-TOKEN (default: *)
ACCESS_CONTROL_ALLOW_METHODS=POST (default: *)
ACCESS_CONTROL_ALLOW_CREDENTIALS=true (default: unset)

# option (for use standalone ssl.)
USETLS=true
KEY_PATH=./server.key
CERT_PATH=./server.cert
PORT=443
TIME_ZONE=Asia/Tokyo
```

### Config setting

We should define mappings for `type` and `id`.

Set `mappings.json` like below:

```:json
{
  "rules": [
    {
      "type": "appliance:LIGHT",
      "id": "turn-light",
      "appliance_id": "xxxx-xxxx-xxxx-xxxx-xxxxx",
      "words": [
        "照明",
        "つけて"
      ],
      "payload": "button=onoff"
    },
    {
      "type": "signal",
      "id": "turn-planetarium",
      "signal_id": "xxxx-xxxx-xxxx-xxxx-xxxxx",
      "words": [
        "プラネタリウム",
        "電源"
      ]
    }
  ],
  "schedules": [
    {
      "cronTime": "0 0 0 * * *",
      "timezone": "Asia/Tokyo",
      "ruleId": "turn-light",
      "repeat": 1
    }
  ]
}

```

In `rules` section, if all `words` are contained in request `phrase`, its correspond `payload` will be use.

In `schedules` section, you can define schedules for rules correspond to `ruleId`. This section is Optional.

### IFTTT Action Setting

#### IF

Use `Say a phrase with both a number and a text ingredient` on `Google Assistant`.

Set params for `What do you want to say?` like below:

`IR $ for # times (IR $ を # 回)`

Then, if you speak `ok google, IR Room light 3 times`, `Room light` is set to `$`
and `3` is set to `#`.

These params can be used in next then-action by using ingredient.

#### THEN

Use `Make a web request` on `webhook`.

Set params like below:

```:sh
URL: https://<your apihost>/v1/api/nature
Method: POST
Content-type: application/json
Body: {"apikey": "<your defined value>", "phrase": " {{TextField}}", "repeat": {{NumberField}} }
```

`{{TextField}}` and `{{NumberField}}` are corresponded to `Room light` and `3` respectively on above example.

## Run

```:sh
# local
$ npm ci
$ npm run serve

################################ 

# Run with docker
$ docker run -d -p 127.0.0.1:8000:8000 --restart always \
    -v $PWD/mappings.json:/app/mappings.json \
    -v $PWD/.env:/app/.env \
    ghcr.io/mkontani/nature-proxy:latest
```

## Build

```sh
# docker usecase
$ docker build -t nature-proxy .

## proxy case
$ docker run -d -p 127.0.0.1:8000:8000 --restart always nature-proxy

## standalone case (set env USETLS=true)
$ docker run -d -p 443:443 --restart always nature-proxy
```

## Manual Request

### Request with id

```:sh
ᐅ curl -XPOST -H 'content-type: application/json' \
    -d '{"apikey": "xxxx", "id": "turn-light", "repeat": 1}' \
    https://api.nicopun.com/v1/api/nature
```

### Request with phrase

```:sh
ᐅ curl -XPOST -H 'content-type: application/json' \
    -d '{"apikey": "xxxx", "phrase": "照明 を 明るく して", "repeat": 2}' \
    https://api.nicopun.com/v1/api/nature
```
