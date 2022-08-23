const Alpaca = require("@alpacahq/alpaca-trade-api");
const csv = require('csvtojson');
const getScores = require('../indexAlgorithm/getScores');

const alpaca = new Alpaca({
    keyId: process.env.ALPACA_KEY,
    secretKey: process.env.ALPACA_SECRET,
    paper: true
});

const sleep = time => new Promise(resolve => setTimeout(resolve, time));

(async function(){
    try{
        let allSymbols = await csv().fromFile("./indexAlgorithm/allTickers.csv");
        allSymbols = allSymbols
            .sort((a,b) => parseInt(b["Market Cap"] || 0) - parseInt(a["Market Cap"] || 0))
            .map(s=>s.Symbol)
            .slice(0,100);
        let scores = await getScores(allSymbols);
        await alpaca.closeAllPositions();
        const cash = (await alpaca.getAccount()).cash;
        const scoreSum = scores.reduce((t,b)=>t+parseFloat(b.score || 0),0);
        for(const score of scores){
            const portfolioDiversity = (score.score||0)/scoreSum;
            const purchaseCost = portfolioDiversity*cash;
            if(purchaseCost > 0){
                await alpaca.createOrder({
                    symbol: score.symbol,
                    notional: purchaseCost,
                    side: "buy",
                    type: "market",
                    time_in_force: "day"
                });
                console.log(score.symbol, purchaseCost.toFixed(2));
            }
        }
        console.log("Portfolio updated");
    }
    catch(err){
        console.log(err.message);
    }
})();