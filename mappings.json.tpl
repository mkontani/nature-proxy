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
