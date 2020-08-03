// https://monome.org/docs/serialosc/osc/

const osc = require('node-osc')
const express = require('express')
const bodyParser = require('body-parser')
const WebSocket = require('ws')

const webPort = 8000
const websocketPort = 8081
const oscPort = 12002
const devicePort = 12003
const deviceId = 'mweb'
const deviceType = 'grid'



const app = express()

app.use(express.static('static'))
app.use(bodyParser.json())

app.post('/api/message', (req, res) => {
  console.log('client message', req.body.message)
  req.body.message[0] = messagePrefix + req.body.message[0]
  sendMessage(destinationHost, destinationPort, req.body.message)
  res.send(200)
})

app.listen(webPort, () => {
  console.log(`web app listening on ${webPort}`)
})



const wss = new WebSocket.Server({ port: websocketPort })

function broadcastWsMsg (msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg))
    }
  })
}



let destinationHost = 'localhost'
let destinationPort
let messagePrefix = ''

function createOscServer (port, handlers) {
  const server = new osc.Server(port, '0.0.0.0', () => {
    console.log(`osc server listening on ${port}`)
  })

  server.on('message', msg => {
    // console.log(`message on ${port}: ${msg}`)

    let path = msg[0]

    if (path.indexOf(messagePrefix === 0))
      path = path.substring(messagePrefix.length)

    const handler = handlers[path]
    if (!handler) return

    // console.log(`invoking handler for ${path}`)
    handler(msg)
  })
}

createOscServer(oscPort, {
  '/serialosc/list': msg => {
    const host = msg[1]
    const port = msg[2]
    sendMessage(host, port, ['/serialosc/device', deviceId, deviceType, devicePort])
  }
})

createOscServer(devicePort, {
  '/sys/host': msg => {
    destinationHost = msg[1]
  },
  '/sys/port': msg => {
    destinationPort = msg[1]
  },
  '/sys/prefix': msg => {
    messagePrefix = msg[1]
  },
  '/grid/led/set': msg => {
    broadcastWsMsg(msg)
  },
  '/grid/led/level/map': msg => {
    broadcastWsMsg(msg)
  }
})

function sendMessage (host, port, message) {
  console.log(`sending message to ${host}:${port}: ${message}`)
  const client = new osc.Client(host, port)
  client.send(message, err => {
    if (err) console.error(err)
    client.close()
  })
}
