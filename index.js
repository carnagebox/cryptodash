const Gdax = require('gdax');
const blessed = require('blessed');
const request = require('request-promise');
const config = require('config');

// Create a screen object.
const screen = blessed.screen({
  smartCSR: true
});

screen.title = 'CBX:Dashboard';
pos = 0;

var Wallet = blessed.text({
  content: 'Wallet',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: '100%'
});
screen.append(Wallet);

var _USDBalance = 0.0;
var USDBalance = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
});
screen.append(USDBalance);

var _ETHBalance = 0.0;
var ETHBalance = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
});
screen.append(ETHBalance);

var Hashrate = blessed.text({
  content: 'Hashrate',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: '100%'
});
screen.append(Hashrate);

var ReportedHashrate = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
});
screen.append(ReportedHashrate);

var Unpaid = blessed.text({
  content: 'Unpaid',
  bg: 'blue',
  fg: 'cyan',
  top: pos++,
  width: '100%'
});
screen.append(Unpaid);

var _UnpaidBalance = 0;
var UnpaidBalance = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
});
screen.append(UnpaidBalance);

var _PayoutETA = 0;
var PayoutETA = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
});
screen.append(PayoutETA);

var _PayoutDelta = 0;
var PayoutDelta = blessed.text({
  tags: true,
  top: pos++,
  width: '100%'
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
        USDBalance.setContent('{yellow-fg}${/yellow-fg} ' + _USDBalance.toFixed(2) + ' (' + _USDPercent + '%)');
      } else if (d['currency'] == 'ETH') {
        _ETHBalance = Number.parseFloat(d['balance']);
        var _ETHPercent = Math.round((_ETHBalance/_ETHEquity)*100);
          ETHBalance.setContent('{yellow-fg}Ð{/yellow-fg} ' + _ETHBalance.toFixed(8) + ' (' + _ETHPercent + '%)');
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
  request.get({uri: ethermine.settingUri, json: true })
    .then((body) => {
      _minPayout = body.data.minPayout;
      request.get({uri: ethermine.statUri, json: true })
        .then((body) => {
          ReportedHashrate.setContent('{yellow-fg}⌗{/yellow-fg} ' + Number.parseFloat(body.data.reportedHashrate/1000000).toFixed(2) + ' Mh/s');
          if(body.data.unpaid) {
            _UnpaidBalance = Number.parseFloat(body.data.unpaid/1000000000000000000);
            _CoinsPerMSec = body.data.coinsPerMin/60/1000;
            var MinimumPayout = Number.parseFloat(_minPayout/1000000000000000000);
            UnpaidBalance.setContent('{yellow-fg}Ð{/yellow-fg} ' + _UnpaidBalance.toFixed(6) + '/' + MinimumPayout + ' (' + Math.round((_UnpaidBalance/MinimumPayout)*100) + '%)');
            _PayoutDelta = Math.round(((_minPayout - body.data.unpaid)/1000000000000000000)/(_CoinsPerMSec*1000));
            var date = new Date();
            date.setTime(date.getTime() + (_PayoutDelta*1000));
            PayoutETA.setContent('{yellow-fg}H{/yellow-fg} ' + date.toLocaleString());
          } else {
            //Reset everything pending payout.
            _UnpaidBalance = 0.0;
            _CoinsPerMSec = 0.0;
            PayoutETA.setContent('{yellow-fg}H{/yellow-fg} --');
          }
        })
        .catch((reason) => {
          setTimeout(refreshMinerStats, 500);
        });
    }).catch((reason) => {
      setTimeout(refreshMinerStats, 500);
    });
  screen.render();
  setTimeout(refreshMinerStats, 2*60*1000);
}
refreshMinerStats();

function updateUnpaidBalance() {
  _UnpaidBalance += (_CoinsPerMSec*1000);
  var MinimumPayout = Number.parseFloat(_minPayout/1000000000000000000);
  UnpaidBalance.setContent('{yellow-fg}Ð{/yellow-fg} ' + _UnpaidBalance.toFixed(5) + '/' + MinimumPayout + ' (' + Math.round((_UnpaidBalance/MinimumPayout)*100) + '%)');
  setTimeout(updateUnpaidBalance, 1000);
  screen.render();
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
  var o = '{yellow-fg}Δ{/yellow-fg} ';
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
  if(o=='{yellow-fg}Δ{/yellow-fg} ') {
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
  screen.render();
  setTimeout(updateDelta, 1000);
}
updateDelta();

var _websocketInit = false;
var _ETHUSDExchange = NaN;
var _USDEquity = NaN;
var _ETHEquity = NaN;

function connectWebsocket() {
  try {
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
        if(data['product_id'] == 'ETH-USD') {
          _ETHUSDExchange = Number.parseFloat(data['price']);
        }
        _USDEquity = _USDBalance + (_ETHBalance * _ETHUSDExchange);
        _ETHEquity = _USDEquity / _ETHUSDExchange;
      }
      if(!_websocketInit) {
        _websocketInit = true;
      }
    });
    websocket.on('error', err => {
      /* handle error */
    });
    websocket.on('close', () => {
      connectWebsocket();
    });
  } catch(e) {
    setTimeout(connectWebsocket, 500);
  }
}
connectWebsocket();
