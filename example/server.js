var S3rver = require('s3rver')
var client

var client = new S3rver({
  port: 4568,
  hostname: 'localhost',
  silent: true,
  directory: __dirname + '/remote/'
}).run(function (err, host, port) {
  if (err) return console.error(err)
  console.log('s3rver running on port', port)
})
