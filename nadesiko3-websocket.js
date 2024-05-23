/**
 * file: plugin_websocket.js
 * WebSocketのためのプラグイン (wsをラップしたもの)
 */
const WebSocket = require('ws').Server
const https = require('https')
const fs = require('fs')

let app = null

// 定数・変数
const ERROR_NO_INIT = '先に『WSサーバ起動』命令を実行してください。'

const PluginWebsocket = {
  'meta': {
    type: 'const',
    value: {
      pluginName: 'nadesiko3-websocket', // プラグインの名前
      description: 'WebSocketサーバープラグイン', // 説明
      pluginVersion: '3.6.5', // プラグインのバージョン
      nakoRuntime: ['cnako3'], // 対象ランタイム
      nakoVersion: '3.6.5' // 要求なでしこバージョン
    }
  },
    '初期化': {
    type: 'func',
    josi: [],
    fn: function (sys) {
      // イベント変数を初期化
      sys.__setSysVar('WSサーバ:ONSUCCESS', null)
      sys.__setSysVar('WSサーバ:ONERROR', null)
      sys.__setSysVar('WSサーバ:ONMESSAGE', null)
      sys.__setSysVar('WSサーバ:ONCONNECTION', null)
      // サーバーのイベントを設定
      sys.__ws_setEvent = (app, sys) => {
        app.on('connection', (ws, req) => {
          const cbCon = sys.__getSysVar('WSサーバ:ONCONNECTION')
          if (cbCon) {
            sys.__setSysVar('対象', req)
            sys.__ws = ws;
            cbCon(sys)
          }
          ws.on('message', (msg) => {
            const cbMsg = sys.__getSysVar('WSサーバ:ONMESSAGE')
            sys.__setSysVar('対象', msg)
            sys.__setSysVar('WSサーバ相手', ws._socket._peername.address + ':' + ws._socket._peername.port)
            sys.__ws = ws;
            // console.log(Object.keys(ws._socket));
            // console.log(ws._socket._peername);
            if (cbMsg) cbMsg(sys)
          })
        })
        app.on('close', (e) => {
          console.log('ws::close', e)
        })
        app.on('error', (e) => {
          const callback = sys.__getSysVar('WSサーバ:ONERROR')
          if (callback) callback(e, sys)
        })
        // サーバの成功時
        const callback = sys.__getSysVar('WSサーバ:ONSUCCESS')
        if (callback) callback(sys)
      }
    }
  },
  // @WebSocketサーバ
  'WSサーバ起動': { // @ポートPORTNOでサーバを起動して成功したら『WSサーバ起動成功した時』を実行する // @WSさーばきどう
    type: 'func',
    josi: [['の', 'で']],
    fn: function (portno, sys) {
      app = new WebSocket({port: portno}) // WSを起動
      sys.__ws_setEvent(app, sys) // イベントを設定
      return app
    }
  },
  'WSSサーバ起動': { // @設定CONF{cert:サーバ証明書,key:キーファイル,port:ポート番号}を指定してWSSサーバを起動して成功したら『WSサーバ起動成功した時』を実行する // @WSSさーばきどう
    type: 'func',
    josi: [['の', 'で']],
    fn: function (conf, sys) {
      // (ref) https://www.npmjs.com/package/ws#external-https-server
      // サーバー証明書など読み取り
      try {
        certBody = fs.readFileSync(conf.cert) // サーバ証明書
        keyBody = fs.readFileSync(conf.key) // キーファイル 
      } catch (e) {
        throw new Error('『WSSサーバ起動』でサーバ証明書ファイルが読み込めません。' + e.message)
      }
      // HTTPSサーバーの起動
      let web
      try {
        web = https.createServer({
          cert: certBody,
          key: keyBody
        })
      } catch (e) {
        throw new Error('『WSSサーバ起動』でHTTPSサーバが起動できません。証明書ファイルが間違っている可能性があります。ファイルを確認してください。' + e.message)
      }
      // WSSを起動
      app = new WebSocket({server: web})
      web.listen(conf.port)
      sys.__ws_setEvent(app, sys) // イベントを設定
      return app
    }
  },
  'WSサーバ起動成功時': { // @WSサーバ起動が成功した時にcallbackを実行 // @WSさーばきどうせいこうしたとき
    type: 'func',
    josi: [['を']],
    fn: function (callback, sys) {
      sys.__setSysVar('WSサーバ:ONSUCCESS', callback)
    },
    return_none: true
  },
  'WSサーバ起動失敗時': { // @WSサーバ起動が失敗した時にcallbackを実行 // @WSさーばきどうしっぱいしたとき
    type: 'func',
    josi: [['を']],
    fn: function (callback, sys) {
      sys.__setSysVar('WSサーバ:ONERROR', callback)
    },
    return_none: true
  },
  'WSサーバ接続時': { // @WSサーバにクライアントが接続してきた時callbackを実行。接続情報は、変数『対象』に入る // @WSさーばせつぞくしたとき
    type: 'func',
    josi: [['を']],
    fn: function (callback, sys) {
      sys.__setSysVar('WSサーバ:ONCONNECTION', callback)
    },
    return_none: true
  },
  'WSサーバ受信時': { // @WSサーバでメッセージを受信した時に実行される。クライアントのIPアドレスとポートは『WSサーバー相手』に受信データは『対象』に代入される // @WSさーばじゅしんしたとき
    type: 'func',
    josi: [['で']],
    fn: function (callback, sys) {
      sys.__setSysVar('WSサーバ:ONMESSAGE', callback)
    },
    return_none: true
  },
  'WSサーバ全送信': { // @WSサーバで全員にメッセージSを送信する // @WSさーばぜんそうしん
    type: 'func',
    josi: [['を']],
    fn: function (s, sys) {
      if (!app) throw new Error(ERROR_NO_INIT)
      app.clients.forEach((client) => {
        client.send(s)
      })
    },
    return_none: true
  },
  'WSサーバ相手': {type: 'const', value: ''}, // @WSさーばあいて
  'WSサーバ個別送信': { // @WSサーバで個別にメッセージSを送信する // @WSさーばこべつそうしん
    type: 'func',
    josi: [['を']],
    fn: function (s, sys) {
      if (!app) throw new Error(ERROR_NO_INIT)
     sys.__ws.send(s)
    },
    return_none: true
  },
  'WSクライアント一覧取得': { // @WSサーバに接続しているクライアントの一覧を返す // @WSくらいあんといちらんしゅとく
    type: 'func',
    josi: [['を']],
    fn: function (s, sys) {
      if (!app) throw new Error(ERROR_NO_INIT)
      return app.clients
    },
    return_none: true
  }
}

module.exports = PluginWebsocket
