const websocketPort = 8081

const apiBaseUrl = `http://${window.location.hostname}:8000/api`

const grid = document.getElementById('grid')

let heldKey

for (let y = 0; y < 8; y++) {
  const row = document.createElement('div')
  row.classList.add('row')
  grid.appendChild(row)
  for (let x = 0; x < 16; x++) {
    const cell = document.createElement('div')
    cell.classList.add('cell')
    row.appendChild(cell)

    const value = document.createElement('div')
    value.classList.add('value')
    cell.appendChild(value)

    value.addEventListener('mousedown', event => {
      if (event.shiftKey && !heldKey) {
        console.log(`holding ${x} ${y}`)
        heldKey = { x, y }
      }

      sendMessage(['/grid/key', x, y, 1])
    })

    value.addEventListener('mouseup', () => {
      if (heldKey && heldKey.x === x && heldKey.y === y) return

      sendMessage(['/grid/key', x, y, 0])
    })

    value.addEventListener('touchstart', event => {
      event.preventDefault()
      sendMessage(['/grid/key', x, y, 1])
    })

    value.addEventListener('touchend', event => {
      event.preventDefault()
      sendMessage(['/grid/key', x, y, 0])
    })
  }
}

document.addEventListener('keyup', event => {
  if (event.key === 'Shift' && heldKey) {
    sendMessage(['/grid/key', heldKey.x, heldKey.y, 0])
    heldKey = undefined
  }
})

document.body.addEventListener('touchmove', event => {
  event.preventDefault()
}, false)

// document.body.style.zoom = window.outerWidth / (grid.clientWidth + 100)

function sendMessage (message) {
  console.log('sending', message)
  return fetch(`${apiBaseUrl}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  })
}

const ws = new WebSocket(`ws://${window.location.hostname}:${websocketPort}`)

ws.onmessage = event => {
  const msg = JSON.parse(event.data)
  // console.log(msg)

  if (msg[0].indexOf('/grid/led/set') > -1) {
    const x = msg[1]
    const y = msg[2]
    const v = msg[3]
    setCell(x, y, v)
  } else if (msg[0].indexOf('/grid/led/level/map') > -1) {
    const xOffset = msg[1]
    const yOffset = msg[2]
    const vs = msg.slice(3)
    for (let i = 0; i < vs.length; i++) {
      const x = i % 8 + xOffset
      const y = Math.floor(i / 8) + yOffset
      const v = vs[i]
      setCell(x, y, v / 16)
    }
  } else {
    console.error('unknown message:', msg)
  }
}

function setCell (x, y, v) {
  const row = grid.children[y]
  const cell = row.children[x]
  const value = cell.children[0]
  value.style.opacity = v
}
