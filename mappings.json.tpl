{
  "rules": [
    {
      "id": "turn-light",
      "words": [
        "照明",
        "つけて"
      ],
      "payload": "clientkey=xxxx&deviceid=xxxx&message={\"format\":\"raw\",\"freq\":38,\"data\":[20691,10398,...]}"
    },
    {
      "id": "turn-up",
      "words": [
        "照明",
        "明るく"
      ],
      "payload": "test1"
    },
    {
      "id": "turn-down",
      "words": [
        "照明",
        "暗く"
      ],
      "payload": "test2"
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
