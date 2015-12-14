var s3Sync = require('..')

var sync = s3Sync({
  local: __dirname + '/local',
  remote: '/',
  key: 'key',
  secret: 'secret',
  bucket: 'some_bucket',
  endpoint: 'localhost',
  port: 4568,
  style: 'path'
}, function (err) {
  if (err) return console.error(err)
})

