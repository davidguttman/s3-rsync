var tape = require('tape')
var s3rver = require('s3rver')
var rimraf = require('rimraf')
var s3Sync = require('..')

var fakes3
var s3Port = 4568
var bucket = 'some_bucket'
var syncOpts = {
  local: __dirname + '/local',
  remote: '/',
  key: 'key',
  secret: 'secret',
  bucket: bucket,
  endpoint: 'localhost',
  port: s3Port,
  style: 'path'
}

tape('setup', function (t) {
  rimraf.sync(__dirname + '/remote/' + bucket + '/*')
  fakes3 = new s3rver({
    port: s3Port,
    hostname: 'localhost',
    silent: false,
    directory: __dirname + '/remote/'
  }).run(function (err, host, port) {
    if (err) return console.error(err)
    t.end()
  })
})

tape('should sync remote root', function (t) {
  t.plan(4)

  var xferCount = 0

  syncOpts.remote = '/'
  var sync = s3Sync(syncOpts, function (err) {
    t.ifError(err, 'should not error')
    t.equal(xferCount, 4, 'should get fileTransferred events')
    t.end()
  })

  sync.on('transferList', function (list) {
    t.equal(list.size, 12576783, 'should have transferList size')
    t.equal(list.files.length, 4, 'should have transferList files')
  })

  sync.on('fileTransferred', function (file) { xferCount ++ })
})

tape('should partial sync remote root', function (t) {
  rimraf.sync(__dirname + '/remote/' + bucket + '/a/b')

   t.plan(4)

  var xferCount = 0

  syncOpts.remote = '/'
  var sync = s3Sync(syncOpts, function (err) {
    t.ifError(err, 'should not error')
    t.equal(xferCount, 1, 'should get fileTransferred events')
    t.end()
  })

  sync.on('transferList', function (list) {
    t.equal(list.size, 998270, 'should have transferList size')
    t.equal(list.files.length, 1, 'should have transferList files')
  })

  sync.on('fileTransferred', function (file) { xferCount ++ })
})

tape('should sync remote dir', function (t) {
  t.plan(4)

  var xferCount = 0

  syncOpts.remote = 'test'
  var sync = s3Sync(syncOpts, function (err) {
    t.ifError(err, 'should not error')
    t.equal(xferCount, 4, 'should get fileTransferred events')
    t.end()
  })

  sync.on('transferList', function (list) {
    t.equal(list.size, 12576783, 'should have transferList size')
    t.equal(list.files.length, 4, 'should have transferList files')
  })

  sync.on('fileTransferred', function (file) { xferCount ++ })
})

tape('should partial sync remote dir', function (t) {
  rimraf.sync(__dirname + '/remote/' + bucket + '/test/a/b')

  t.plan(4)

  var xferCount = 0

  syncOpts.remote = 'test'
  var sync = s3Sync(syncOpts, function (err) {
    t.ifError(err, 'should not error')
    t.equal(xferCount, 1, 'should get fileTransferred events')
    t.end()
  })

  sync.on('transferList', function (list) {
    t.equal(list.size, 998270, 'should have transferList size')
    t.equal(list.files.length, 1, 'should have transferList files')
  })

  sync.on('fileTransferred', function (file) { xferCount ++ })
})

tape('finish', function (t) {
  fakes3.close(function () { t.end() })
})
