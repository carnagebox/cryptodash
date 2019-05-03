const Gdax = require('gdax');
const blessed = require('blessed');
const request = require('request-promise');
const config = require('config');

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});

screen.title = "CBX:Dashboard";
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

var _BTCBalance = 0.0;
var BTCBalance = blessed.text({
  top: pos++,
  width: 32
});
screen.append(BTCBalance);

var _ETHBalance = 0.0;
var ETHBalance = blessed.text({
  top: pos++,
  width: 32
});
screen.append(ETHBalance);

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

var _BTCEquity = 0;
var BTCEquity = blessed.text({
  top: pos++,
  width: 32
});
screen.append(BTCEquity);

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
    if(error || !data) {
      return false;
    }
    data.forEach((d) => {
      if(d['currency'] == 'USD') {
        _USDBalance = Number.parseFloat(d['balance']);
        var _USDPercent = Math.round((_USDBalance/_USDEquity)*100);
        USDBalance.setContent('$ ' + _USDBalance.toFixed(2) + ' (' + _USDPercent + '%)');
      } else if (d['currency'] == 'BTC') {
        _BTCBalance = Number.parseFloat(d['balance']);
        var _BTCPercent = Math.round((_BTCBalance/_BTCEquity)*100);
        BTCBalance.setContent('Β ' + _BTCBalance.toFixed(8) + ' (' + _BTCPercent + '%)');
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
    if(err || !body.data) {
      return;
    }
    _minPayout = body.data.minPayout;
    request.get(ethermine.statUri, { json: true }, (err, res, body) => {
      if(err || !body.data) {
        return;
      }
      ReportedHashrate.setContent('⌗ ' + Number.parseFloat(body.data.reportedHashrate/1000000).toFixed(2) + ' Mh/s');
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
        PayoutETA.setContent('H --');
      }
   });
  });
  setTimeout(refreshMinerStats, 2*60*1000);
}
refreshMinerStats();

function updateUnpaidBalance() {
  _UnpaidBalance += (_CoinsPerMSec*1000);
  var MinimumPayout = Number.parseFloat(_minPayout/1000000000000000000);
  UnpaidBalance.setContent('Ξ ' + _UnpaidBalance.toFixed(5) + '/' + MinimumPayout + ' (' + Math.round((_UnpaidBalance/MinimumPayout)*100) + '%)');
  setTimeout(updateUnpaidBalance, 1000);
}
updateUnpaidBalance();

var deltaWaiting = false;
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
  if(o=='Δ ') {
    o += 'less than a minute';
    switch(deltaWaiting) {
      case 1:
        o += '';
        break;
      case 2:
        o += '.';
        break;
      case 3:
        o += '..';
        break;
      case 4:
        o += '...';
        break;
      case 5:
        o += '...';
        break;
      default:
        o += '...';
        deltaWaiting = 0;
        break;
    }
    deltaWaiting++;
  } else {
    deltaWaiting = false;
  }
  PayoutDelta.setContent(o);
  setTimeout(updateDelta, 1000);
}
updateDelta();

var _BTCUSDExchange = 0.0;
var _ETHBTCExchange = 0.0;
var _ETHUSDExchange = 0.0;

function connectWebsocket() {
  const websocket = new Gdax.WebsocketClient(
    ['BTC-USD','ETH-BTC','ETH-USD'],
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
      if(data['product_id'] == 'BTC-USD') {
        _BTCUSDExchange = Number.parseFloat(data['price']);
        //BTCUSDExchange.setContent('{yellow-fg}BTCUSD{/yellow-fg} ' + _BTCUSDExchange.toFixed(2));
      } else if(data['product_id'] == 'ETH-BTC') {
        _ETHBTCExchange = Number.parseFloat(data['price']);
        //ETHBTCExchange.setContent('{yellow-fg}ETHBTC{/yellow-fg} ' + _ETHBTCExchange.toFixed(8));
      } else if(data['product_id'] == 'ETH-USD') {
        _ETHUSDExchange = Number.parseFloat(data['price']);
        //ETHUSDExchange.setContent('{yellow-fg}ETHUSD{/yellow-fg} ' + _ETHUSDExchange.toFixed(2));
      }
      _USDEquity = _USDBalance + (_BTCBalance * _BTCUSDExchange) + (_ETHBalance * _ETHUSDExchange);
      var _USDTrade = (0.02 * _USDEquity).toFixed(2);
      USDEquity.setContent('$ ' + _USDEquity.toFixed(2) + ' (' + _USDTrade  + ')');
      _BTCEquity = _BTCBalance + (_USDBalance / _BTCUSDExchange) + (_ETHBalance * _ETHBTCExchange);
      var _BTCTrade = (0.02 * _BTCEquity).toFixed(5);
      BTCEquity.setContent('Β ' + _BTCEquity.toFixed(8) + ' (' + _BTCTrade  + ')');
      _ETHEquity = _ETHBalance + (_USDBalance / _ETHUSDExchange) + (_BTCBalance / _ETHBTCExchange);
      var _ETHTrade = (0.02 * _ETHEquity).toFixed(5);
      ETHEquity.setContent('Ξ ' + _ETHEquity.toFixed(8) + ' (' + _ETHTrade + ')');
      screen.render();
    }
  });
  websocket.on('error', err => {
    /* handle error */
  });
  websocket.on('close', () => {
    connectWebsocket();
  });
}
connectWebsocket();

