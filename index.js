var stream = require('readable-stream')

var SIGNAL_FLUSH = Buffer.from([0])

class WriteStream extends stream.Writable {
  constructor (opts, write, flush) {
    if (typeof opts === 'function') {
      flush = write
      write = opts
      opts = {}
    }

    super(opts)

    this.destroyed = false
    this._worker = write || null
    this._flush = flush || null
  }

  _write(data, enc, cb) {
    if (SIGNAL_FLUSH === data)
      this._flush(cb)
    else
      this._worker(data, enc, cb)
  }

  end(data, enc, cb) {
    if (!this._flush)
      return stream.Writable.prototype.end.apply(this, arguments)
    if (typeof data === 'function')
      return this.end(null, null, data)
    if (typeof enc === 'function')
      return this.end(data, null, enc)
    if (data)
      this.write(data)
    if (!this._writableState.ending)
      this.write(SIGNAL_FLUSH)
    return stream.Writable.prototype.end.call(this, cb)
  }

  destroy(err) {
    if (this.destroyed)
      return
    this.destroyed = true
    if (err)
      this.emit('error', err)
    this.emit('close')
  }

  static obj(opts, worker, flush) {
    if (typeof opts === 'function')
      return WriteStream.obj(null, opts, worker)
    if (!opts)
      opts = {}
    opts.objectMode = true
    return new WriteStream(opts, worker, flush)
  }
}

// To be backwards compatible without calling `new`
module.exports = new Proxy(WriteStream, {
  apply (target, thisArg, argumentsList) {
    return new target(...argumentsList)
  }
})
