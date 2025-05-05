
/*

This initialized the giveaway campaign
>> for that we need to make sure
>> there is a bot that listen to keyword 'create a giveaway campaign,' 'create a gw' 'create a gw campaign'
keyword like , any number decimal would be number, like
for example 5 people , 5 peep, 5 guy, users etc,  draw on, end on, finish on, deadline, complete on 

then there involve a timeline - like AM , PM 9:00. and with DATE as keyword too,


and then for the prize - it can sol, any other solana, smart contract address , or other tokens
once that is done>> we scrape the user that mentioned their solana address
now we have a table giveaway

one the giveaway schema
that has 
but to also extract the maintweetid --very important
that is like the original post
tweetid,username,actionperform,prizepool,timeline,maintweetid


so get all the replies or from scrapper it's the same process
on the api endpoint, it would be more like /replies/search endpoint


>> after this process, then there is a helper class that checks for this
// maybe gweventfinder.js

after which when it's time, 
what we do is >>  
query all the details that has been scrape, 
>> now we used tweetid , for that and use another >> draw.js 
 (to randomly draw the gw)

 This draw.js >> will also make sure it fixed the pool/by number of prizepool
 to determined the amount

>> once selected now 

>> we query back to tweet and extract their solana address


>> after that
we trigger that send token feature

we might need bulksender.js
which will extract all the address and sent all the amount

and then
after that, we process a tweet to each , (instead of each)
we gather @1,@2, their username and then go back to main post that was tweeted(original post)
tweetid
*/


