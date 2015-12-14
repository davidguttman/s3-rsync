#!/usr/bin/env node

var rimraf = require('rimraf')
var s3rver = require('s3rver')
var spawn = require('child_process').spawn

rimraf.sync(__dirname + '/remote/some_bucket/*')

var bin = __dirname + '/../bin/s3-rsync'
var args = [bin].concat('-k 123 -s abc -b some_bucket -e localhost -p 4568 -P test/local'.split(' '))

var fakes3 = new s3rver({
  port: 4568,
  hostname: 'localhost',
  silent: true,
  directory: __dirname + '/remote/'
}).run(function (err, host, port) {
  if (err) return console.error(err)

  var sync = spawn('node', args)
  sync.stdout.pipe(process.stdout)
  sync.stderr.pipe(process.stderr)
  sync.on('close', function () {
    fakes3.close()
  })
})
