const Gdax = require('gdax');
const blessed = require('blessed');
const request = require('request-promise');
const config = require('config');

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});

screen.title = "CaRNaGeBoX";
pos = 0;

var Wallet = blessed.text({
  content: 'Wallet',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: 32
});
screen.append(Wallet);

var _USDBalance = 0.0;
var USDBalance = blessed.text({
  top: pos++,
  width: 32
});
screen.append(USDBalance);

var _ETHBalance = 0.0;
var ETHBalance = blessed.text({
  top: pos++,
  width: 32
});
screen.append(ETHBalance);

var _Exchange = 0.0;
var Exchange = blessed.text({
  content: 'Exchange',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: 32
});
screen.append(Exchange);

var ETHUSDExchangeRate = blessed.text({
  top: pos++,
  width: 32
});
screen.append(ETHUSDExchangeRate);

var Equity = blessed.text({
  content: 'Equity',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: 32
});
screen.append(Equity);

var _USDEquity = 0;
var USDEquity = blessed.text({
  top: pos++,
  width: 32
});
screen.append(USDEquity);

var _ETHEquity = 0;
var ETHEquity = blessed.text({
  top: pos++,
  width: 32
});
screen.append(ETHEquity);

var Hashrate = blessed.text({
  content: 'Hashrate',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: 32
});
screen.append(Hashrate);

var ReportedHashrate = blessed.text({
  top: pos++,
  width: 32
});
screen.append(ReportedHashrate);

var Unpaid = blessed.text({
  content: 'Unpaid',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: 32
});
screen.append(Unpaid);

var _UnpaidBalance = 0;
var UnpaidBalance = blessed.text({
  top: pos++,
  width: 32
});
screen.append(UnpaidBalance);

var _PayoutETA = 0;
var PayoutETA = blessed.text({
  top: pos++,
  width: 32
});
screen.append(PayoutETA);

var _PayoutDelta = 0;
var PayoutDelta = blessed.text({
  top: pos++,
  width: 32
});
screen.append(PayoutDelta);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Render the screen.
screen.render();

// Connect to GDAX
const gdax = config.get('gdax');
const authedClient = new Gdax.AuthenticatedClient(
  gdax.key,
  gdax.secret,
  gdax.pass,
  gdax.apiUri
);

// Wallet
function refreshWallet() {
  authedClient.getAccounts((error, response, data) => {
    if(error) {
      return false;
    }
    data.forEach((d) => {
      if(d['currency'] == 'USD') {
        _USDBalance = Number.parseFloat(d['balance']);
        var _USDPercent = Math.round((_USDBalance/_USDEquity)*100);
        USDBalance.setContent('$ ' + _USDBalance.toFixed(2) + ' (' + _USDPercent + '%)');
      } else if (d['currency'] == 'ETH') {
        _ETHBalance = Number.parseFloat(d['balance']);
        var _ETHPercent = Math.round((_ETHBalance/_ETHEquity)*100);
        ETHBalance.setContent('Ξ ' + _ETHBalance.toFixed(8) + ' (' + _ETHPercent + '%)');
      }
    });
    screen.render();
  });
  setTimeout(refreshWallet, 1000);
}
refreshWallet();

const ethermine = config.get('ethermine');

var _CoinsPerMSec = 0.0;
var _minPayout = 1;

function refreshMinerStats() {
  request.get(ethermine.settingUri, { json: true }, (err, res, body) => {
    _minPayout = body.data.minPayout;
    request.get(ethermine.statUri, { json: true }, (err, res, body) => {
      ReportedHashrate.setContent('♯ ' + Number.parseFloat(body.data.reportedHashrate/1000000).toFixed(2) + ' Mh/s');
      if(body.data.unpaid) {
        _UnpaidBalance = Number.parseFloat(body.data.unpaid/1000000000000000000);
        _CoinsPerMSec = body.data.coinsPerMin/60/1000;
        var MinimumPayout = Number.parseFloat(_minPayout/1000000000000000000);
        UnpaidBalance.setContent('Ξ ' + _UnpaidBalance.toFixed(6) + '/' + MinimumPayout + ' (' + Math.round((_UnpaidBalance/MinimumPayout)*100) + '%)');
        _PayoutDelta = Math.round(((_minPayout - body.data.unpaid)/1000000000000000000)/(_CoinsPerMSec*1000));
        var date = new Date();
        date.setTime(date.getTime() + (_PayoutDelta*1000));
        PayoutETA.setContent('H ' + date.toLocaleString());
      } else {
        //Reset everything pending payout.
        _UnpaidBalance = 0.0;
        _CoinsPerMSec = 0.0;
        PayoutETA.setContent('+ Payout pending...');
      }
   });
  });
  setTimeout(refreshMinerStats, 2*60*1000);
}
refreshMinerStats();

function updateUnpaidBalance() {
  _UnpaidBalance += (_CoinsPerMSec*1000);
  var MinimumPayout = Number.parseFloat(_minPayout/1000000000000000000);
  UnpaidBalance.setContent('Ξ ' + _UnpaidBalance.toFixed(6) + '/' + MinimumPayout + ' (' + Math.round((_UnpaidBalance/MinimumPayout)*100) + '%)');
  setTimeout(updateUnpaidBalance, 1000);
}
updateUnpaidBalance();

function updateDelta() {
  var seconds = _PayoutDelta--;
  var a = Math.floor(seconds/86400); //days
  var x = seconds%86400;
  var b = Math.floor(x/3600); //hours
  x = x%3600;
  var c = Math.floor(x/60); //minutes
  var d = x%60; //seconds
  var o = 'Δ ';
  if(a>0) {
    o += a+'d ';
  }
  if(b>0) {
    o += b+'h ';
  }
  if(c>0) {
    o += c+'m ';
  }
  if(d>0) {
    o += d+'s';
  }
  PayoutDelta.setContent(o);
  setTimeout(updateDelta, 1000);
}
updateDelta();

const websocket = new Gdax.WebsocketClient(
  ['ETH-USD'],
  gdax.feedUri,
  {
    key: gdax.key,
    secret: gdax.secret,
    passphrase: gdax.pass
  },
  { channels: ['ticker'] }
);

websocket.on('message', data => {
  if(data['type'] == 'ticker') {
    _Exchange = Number.parseFloat(data['price']);
    ETHUSDExchangeRate.setContent('$ ' + _Exchange.toFixed(2));
    _USDEquity = (_Exchange * _ETHBalance) + _USDBalance;
    var _USDTrade = (0.02 * _USDEquity).toFixed(2);
    USDEquity.setContent('$ ' + _USDEquity.toFixed(2) + ' ($' + _USDTrade  + ')');
    _ETHEquity = (_USDBalance / _Exchange) + _ETHBalance;
    var _ETHTrade = (0.02 * _ETHEquity).toFixed(4);
    ETHEquity.setContent('Ξ ' + _ETHEquity.toFixed(8) + ' (Ξ' + _ETHTrade + ')');
    screen.render();
  }
});
websocket.on('error', err => {
  /* handle error */
});
websocket.on('close', () => {
  /* ... */
  process.exit(1);
});

