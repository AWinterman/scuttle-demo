var Demo = require('./index.js')
  , ring = require('./network').ring

module.exports = run

function run(el) {
  var going = false

  Demo = new Demo(el, ring)

   // bind click event handlers to each node in the demo.
  for(var i = 0, len = demo.node[0].length; i < len; ++i) {
    demo.node[0][i].onmousedown = click()
    demo.node[0][i].ontouchend = click()
  }

  // scale the demo to its container, draw the elements onto the dom.
  demo.start()
  // start the force directed layout.
  demo.force.start()

  window.addEventListener('scroll', debounce(onscroll))

  // gossip every 200 milliseconds
  setInterval(gossip, 200)

  function gossip() {
    // pick a node at random
    var i = Math.floor(Math.random() * demo.n)

    demo.node[0][i].__data__.gossip.gossip()
  }

  function onscroll() {
    // bind this to the onscroll event to make sure the layout only runs when
    // it is on screen.
    var rect =  el.getBoundingClientRect()
    // are we below the top
    if((rect.top < window.innerHeight ) && (rect.bottom > 0)) {
      if(!going) {
        going = true
        demo.force.start()
      }
    } else if(going) {
      demo.force.stop()
      going = false
      console.log(network, ' is offscreen, stopping animation')
    }
  }

  function click() {
    var v = 0

    return function(ev) {
      v++
      ev.target.__data__.gossip.set(ev.target.__data__.gossip.id, v)
      console.log(ev.target.parent.parent)
    }
  }
}
