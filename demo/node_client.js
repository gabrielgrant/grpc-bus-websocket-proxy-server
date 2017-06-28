var grpc = require('grpc');
var helloworld = grpc.load('helloworld.proto').helloworld;

var client = new helloworld.Greeter('localhost:50051', grpc.credentials.createInsecure());

var concat = client.concat(function (err, res) {
  console.log(res)
});
concat.write({content: 'concat data 1'});
concat.write({content: 'concat data 2'});
concat.end();
