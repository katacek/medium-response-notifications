const Apify = require('apify');

Apify.main(async () => {
    const input = await Apify.getInput();
    
    //const input = {articleId: ['cd3220e9abf5','50417cc20994' ]}
    
    const dateFrom = new Date();
    dateFrom.setHours(0,0,0,0);
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

    

    let postArray = [];
    const newPosts = {};
    for (articleId of input.articleId)
    {
        newPosts[articleId] = [];
        let payload = await getResponse(articleId);
        // Object.keys: get list of keys from dictionary
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
        newPosts[articleId].push(...postArray.filter(x => x.createdAt >= dateFromValue));
    }

    console.log(newPosts); 

    let slackMessages = []
    Object.keys(newPosts).forEach(x => newPosts[x].forEach(y =>
        {
            let title= postArray.find(z=>x==z.id).title;

            slackMessages.push(`Your post "${title}" on medium has new response https://medium.com/p/${y.id}`);
        }));
    
   
    const slackToken = input.slackToken
    
    for (message of slackMessages) {

        if (slackToken) {  

         const slackMessageActor = {
                "token": slackToken,
                "text": message,
                "channel": input.channel
            }

            await Apify.call('katerinahronik/slack-message', slackMessageActor)
            }
    }

    await Apify.setValue('OUTPUT', newPosts);
}); 
