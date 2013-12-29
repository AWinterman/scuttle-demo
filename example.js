var Demo = require('./index.js')
  , Ring = require('./networks').Ring

module.exports = run

function run(el) {
  var going = false

  demo = new Demo(el, new Ring(10))

  // scale the demo to its container, draw the elements onto the dom.
  demo.dim()
  demo.start()
  // start the force directed layout.
  demo.force.start()

   // bind click event handlers to each node in the demo.
  for(var i = 0, len = demo.node[0].length; i < len; ++i) {
    demo.node[0][i].onmousedown = click()
    demo.node[0][i].ontouchend = click()
  }

  // gossip every 200 milliseconds
  setInterval(gossip, 200)

  function gossip() {
    // pick a node at random
    var i = Math.floor(Math.random() * demo.n)

    demo.node[0][i].__data__.gossip.gossip()
  }

  function click() {
    var v = 0

    return function(ev) {
      v++
      ev.target.__data__.gossip.set(ev.target.__data__.gossip.id, v)
    }
  }
}
