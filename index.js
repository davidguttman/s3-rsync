var fs = require('fs')
var lsr = require('ls-r')
var path = require('path')
var knox = require('knox')
var MPU = require('knox-mpu')
var map = require('map-async')
var runs = require('run-series')
var runp = require('run-parallel')
var S3Lister = require('s3-lister')
var Wildemitter = require('wildemitter')

module.exports = function (opts, cb) {
  var sync = new Wildemitter
  var client = knox.createClient(opts)

  var local = opts.local
  var remote = normalizeRemote(opts.remote)

  getIndexes(client, local, remote, function (err, indexes) {
    if (err) return cb(err)

    var localIndex = indexes.local
    var remoteIndex = indexes.remote

    var toTransfer = compareIndexes(localIndex, remoteIndex)
    var totalTransferSize = getTransferSize(toTransfer)
    sync.emit('transferList', {files: toTransfer, size: totalTransferSize})

    var totalWritten = 0

    var fns = toTransfer.map(function (file) {
      return function (cb) {
        var dest = createDest(file, local, remote)
        var stream

        if (file.size < 5e9) {
          stream = putFile(client, file.file, dest, done)
        } else {
          stream = putMPFile(client, file.file, dest, done)
        }

        stream.on('progress', function (prog) {
          sync.emit('progress', {
            file: file,
            filePercent: prog.percent,
            fileWritten: prog.written,
            fileTotal: prog.total,
            allWritten: totalWritten + prog.written,
            allTotal: totalTransferSize
          })
        })

        function done (err) {
          if (err) return cb(err)
          totalWritten += file.size
          sync.emit('fileTransferred', file)
          cb()
        }
      }
    })

    runs(fns, cb)
  })

  return sync
}

function getIndexes (client, local, remote, cb) {
  runp({
    local: function (cb) { getLocalIndex(local, cb) },
    remote: function (cb) { getRemoteIndex(client, remote, cb) }
  }, cb)
}

function getLocalIndex (local, cb) {
  lsr(local, function (err, fileNames) {
    if (err) return cb(err)

    map(fileNames, stat, function (err, localFiles) {
      if (err) return cb(err)
      var localIndex = indexFiles(localFiles, local)
      cb(null, localIndex)
    })
  })
}

function getRemoteIndex (client, remote, cb) {
  getRemoteList(client, remote, function (err, remoteFiles) {
    if (err) return cb(err)

    var remoteIndex = indexFiles(remoteFiles, remote)
    cb(null, remoteIndex)
  })
}

function stat (file, cb) {
  fs.stat(file, function (err, stats) {
    if (err) return cb(err)
    cb(null, {
      file: file,
      isFile: stats.isFile(),
      size: stats.size
    })
  })
}

function getRemoteList (client, prefix, cb) {
  var lister = new S3Lister(client, {prefix: prefix})
  var collection = []
  lister.on('error', cb)
  lister.on('data', function (data) {
    collection.push({
      file: data.Key,
      size: data.Size,
      isFile: true
    })
  })
  lister.on('end', function () {
    cb(null, collection)
  })
}

function indexFiles (files, prefix) {
  var index = {}
  files.forEach(function (file) {
    if (!file.isFile) return
    if (file.file.match(/\.DS_Store$/)) return

    var fileKey = file.file.replace(prefix, '')
    var key = [fileKey, file.size].join('\xff')
    if (key[0] === '/') key = key.slice(1)
    index[key] = file
  })
  return index
}

function compareIndexes (local, remote) {
  var toTransfer = []

  Object.keys(local).forEach(function (localKey) {
    if (!remote[localKey]) toTransfer.push(local[localKey])
  })
  return toTransfer
}

function putFile (client, file, dest, cb) {
  return client.putFile(file, dest, function (err, res) {
    if (err) return cb(err)
    res.resume()
    cb(err)
  })
}

function putMPFile (client, file, dest, cb) {
  return new MPU({
    client: client,
    file: file,
    objectName: dest
  }, function (err, res) {
    if (err) return cb(err)
  })
}

function getTransferSize (toTransfer) {
  var size = 0
  toTransfer.forEach(function (file) {
    size += file.size
  })
  return size
}

function createDest (file, local, remote) {
  if (remote === '/') remote = ''

  return remote + file.file.replace(local, '')
}

function normalizeRemote (remote) {
  if (remote[0] === '/') return remote.slice(1)
  return remote
}
