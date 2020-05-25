const Apify = require('apify');

Apify.main(async () => {
    
    const input = await Apify.getInput();

    if (input.articleUrl == undefined && input.articleId == undefined) {
        throw(new Error('input.articleUrl or input.articleId must be provided'))
    }

    //console.log(input.articleUrl)

    //const input = {articleId: ['5b61524e7919']}
    // const input = {
    //     articleUrl: ['https://humanparts.medium.com/my-journey-toward-radical-body-positivity-3412796df8ff', 'https://forge.medium.com/the-birds-gave-me-my-focus-back-b4d8f00c7378']
    // }

    Array.prototype.last = function(){
        return this[this.length - 1];
    };

    let articleIds = [];
   
    if (input.articleId != undefined) {
        articleIds = input.articleId;
    }
    else
    {
        articleIds = input.articleUrl.map(x => x.split('-').last())
    }
    
    console.log(articleIds)

    const dateFrom = new Date();
    dateFrom.setHours(0,0,0,0);
    //console.log(dateFrom)
    const dateFromValue = dateFrom.valueOf();


    function getNested(obj, ...args) {
        return args.reduce((obj, level) => obj && obj[level], obj)
      }


    const getResponse = async(articleId, continueToken) =>
    {
        let token = '';
        if (continueToken)
            token = `?to=${continueToken}`;
            
        let url = `https://medium.com/_/api/posts/${articleId}/responsesStream${token}`;
        const response = await Apify.utils.requestAsBrowser({ url: url });
        if (response.statusCode !== 200 || !response.body)
        {
            throw new Error('Failed to download');
        }

        const resText = await response.body;
        const resJson = JSON.parse(resText.match(/{"success":true.*/)[0]);
        return resJson.payload;

    }

    let postArrays = [];
    const newPosts = {};
    for (articleId of articleIds)
    {
        newPosts[articleId] = [];
        let postArray = [];
        let payload = await getResponse(articleId);
        // Object.keys: get list of keys from dictionary

        if (payload.references.Post === undefined)
            {
                console.log( `Article id: ${articleId} has no responses.` );
                continue;
            }

        Object.keys(payload.references.Post).forEach(x => postArray.push(payload.references.Post[x]));
       

        let token = getNested(payload, 'paging', 'next', 'to');
        while (token != undefined)
        {
            payload = await getResponse(articleId, token);
            Object.keys(payload.references.Post).forEach(x =>
            {
                // some() returns true if the fcn is valid for at least one item 
                // here: x is the key of the new post that I would like to add to postArray
                // y is the postArray that I get in previous iteration
                if (!postArray.some(y => y.id == x))
                //if (!postArray.some(y => y.id == payload.references.Post[x].id))
                {
                    postArray.push(payload.references.Post[x]);
                }
            });
            token = getNested(payload, 'paging', 'next', 'to');
        }

        console.log(`id:${articleId} - responses:${postArray.length-1}`);
        // filter, and then apply ... ie get individual elements from array to push (adding elements to list)
        // if not using..., concat () must have been used (adding list to list)
        if (postArray.length>0){
            newPosts[articleId].push(...postArray.filter(x => x.createdAt >= dateFromValue));
        }
        postArrays.push(...postArray);
    }

    //console.log(newPosts); 

    let slackMessages = []
    Object.keys(newPosts).forEach(x => newPosts[x].forEach(y =>
        {
            let title= postArrays.find(z=>x==z.id).title;

            slackMessages.push(`Your post "${title}" on medium has new response https://medium.com/p/${y.id}`);
        }));
    
    //console.log(slackMessages); 

    const slackToken = input.slackToken
    const emailTo = input.emailTo;
    
    for (message of slackMessages)
    {
        if (slackToken) {  

         const slackMessageActor = {
                "token": slackToken,
                "text": message,
                "channel": input.channel
            }

            await Apify.call('katerinahronik/slack-message', slackMessageActor)

            console.log(`Slack notification: "${message}" sent.`);
        } 
    
        if (emailTo) {  
           
            const emailActorInput = {
                "to": emailTo,
                "subject": "New response on medium.com",
                "text": message
            }

            await Apify.call('apify/send-mail', emailActorInput)

            console.log(`Email notification: "${message}" sent.`);
        }

    }
    
    if (Object.keys(newPosts).length !== 0){
    await Apify.setValue('OUTPUT', newPosts);
    }
}); 
