var Gossip = require('simple-scuttle').gossip
  , stream = require('stream')
  , inherit = require('util').inherits
  , EE = require('events').EventEmitter


var base = {}

base.mtu = 10
base.max_history = 10
base.sort = sort
base.resolve = lww_vs_current_vers

module.exports = {}
module.exports.Ring = Ring
module.exports.RingConflict = RingConflict
module.exports.Pair = Pair
module.exports.Random = Random
module.exports.PairConflict = PairConflict
// module.exports.double_ring = double_ring

inherit(Ring, EE)
inherit(RingConflict, EE)
inherit(Pair, EE)
inherit(PairConflict, EE)
inherit(Random, EE)

function Ring(n, config) {
  config = config || base
  EE.call(this)

  this.nodes = []
  this.links = []

  for(var i = 0; i < n; ++i) {
    this.nodes[i] = {
        gossip: new Gossip(id(i), config)
    }
  }

  for(var i = 0; i < n; ++i) {
    var start = i
      , end = i + 1

    if(i === n - 1) {
      end = 0
    }

    this.links[i] = {
        source: this.nodes[start]
      , target: this.nodes[end]
    }

    this.nodes[start].gossip
      .pipe(this.nodes[end].gossip)
      .pipe(this.nodes[start].gossip)
  }

  keys_n(this, this.nodes)
}

function RingConflict(n, config) {
  config = config || base
  EE.call(this)

  this.nodes = []
  this.links = []

  var halfn = Math.floor(n / 2)

  for(var i = 0; i < halfn; i++) {
    this.nodes[i] = {
        gossip: new Gossip(id(i), config)
    }
    this.nodes[i + halfn] = {
        gossip: new Gossip(id(i), config)
    }
  }

  keys_n(this, this.nodes)

  for(var i = 0; i < this.nodes.length; ++i) {
    var start = i
      , end = i + 1

    if(i === (this.nodes.length - 1)) {
      end = 0
    }

    this.links[i] = {
        source: this.nodes[start]
      , target: this.nodes[end]
    }

    this.nodes[start].gossip
      .pipe(this.nodes[end].gossip)
      .pipe(this.nodes[start].gossip)
  }
}

function Random(n, config) {
  config = config || base
  EE.call(this)

  this.nodes = []
  this.links = []

  var i = 0
  while(this.nodes.length < n) {
    i++
    this.nodes.push({gossip: new Gossip(id(i), config)})
  }

  while(this.links.length < n) {
    var i = Math.floor(Math.random() * n)
      , j = Math.floor(Math.random() * n)

    while(j === i) {
      j = Math.floor(Math.random() * n)
    }

    this.links.push({
          source: this.nodes[i]
        , target: this.nodes[j]
    })

    this.nodes[i].gossip
      .pipe(this.nodes[j].gossip)
      .pipe(this.nodes[i].gossip)
  }

  keys_n(this, this.nodes)
}

function PairConflict(config) {
  config = config || base
  EE.call(this)

  var A = {gossip: new Gossip('A', config)}
    , B = {gossip: new Gossip('A', config)}

  this.nodes = [A, B]
  this.links = [{source: A, target: B}]

  A.gossip.pipe(B.gossip).pipe(A.gossip)

  keys_n(this, this.nodes)
}

function Pair(config) {
  config = config || base
  EE.call(this)

  var A = {gossip: new Gossip('A', config)}
    , B = {gossip: new Gossip('B', config)}

  this.nodes = [A, B]
  this.links = [{source: A, target: B}]

  A.gossip.pipe(B.gossip).pipe(A.gossip)

  keys_n(this, this.nodes)
}

function keys_n(self) {
  self.n = self.nodes.length
  self.keys = []

  for(var i = 0; i < self.n; ++i) {
    self.keys[i] = self.nodes[i].gossip.id

    self.nodes[i].gossip.on(
        'state'
      , self.emit.bind(
            self
          , 'state'
          , self.nodes[i].gossip.id
        )
    )
  }

  return self
}

function id(i) {
  return String.fromCharCode(97 + i)
}

function sort(A, B) {
  var Afirst

  if(A.version === B.version) {
    Afirst = A.source_id < B.source_id
  } else {
    Afirst = A.version < B.version
  }

  return Afirst ? -1 : 1
}

// Last write wins, but compared against the current version of the key in the
// gossip's state.
function lww_vs_current_vers(gossip, update) {
  var last_seen = gossip.get(update.key).version
    , current_value = gossip.get(update.key).value
    , current

  current = {}
  current.key = update.key
  current.value = current_value === null ? update.value : current_value
  current.source_id = gossip.id
  current.version = last_seen

  return sort(update, current) > 0
}

