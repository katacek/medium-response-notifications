# Medium post response notifications

Apify actor to check for new responses to [Medium.com](https://medium.com/) posts. If [Slack](https://slack.com/intl/en-cz/) token and channel is provided, it sends a notification message for each new response by calling an existing [Slack Message Generator](https://apify.com/katerinahronik/slack-message) Actor . 

## Input 

The following table shows specification of the actor INPUT fields as defined by its input schema. 

Field |	Type	| Description
---| ---| ---|
articleId|	*Array*|	(required) List of articles ids (i.e. ["cd3220e9abf5", "50417cc20994" ])
slackToken|	*String*|	(optional) Slack token
channel|	*String*|	(optional) Channel where the message will be sent (ie #general)
emailTo|	*String*|	(optional) Email address for sending the notification

## How to run

To run the actor, you'll need an [Apify account](https://my.apify.com/). Simply create a new task for the actor by clicking the green button above, modify the actor input configuration, click Run and get your results.

## API

To run the actor from your code, send a HTTP POST request to the following API endpoint: 

https://api.apify.com/v2/acts/katerinahronik~medium-response-notifications?token=<YOUR_API_TOKEN>

## CU usage 

It depends on number of responses.
