var util = require('util')

var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({ port: 8081 });

var grpcBus = require('grpc-bus');
var protobuf = require("protobufjs");

console.log('Starting...')
var alwaysLog = console.log;

if (!process.argv.includes('--verbose')) {
  console.log('running in quiet mode: most log output will be supressed')
  console.log = () => {};
  console.dir = () => {};
} else {
  console.log('running in verbose mode');
}


if (process.env.OVERRIDE_ENDPOINT) {
  var overrideEndpoint = process.env.OVERRIDE_ENDPOINT;
  overrideEndpoint = overrideEndpoint.trim();
  alwaysLog('all service endpoints will be overriden with: ', overrideEndpoint);
} else {
  if (process.env.ALLOWED_ENDPOINTS) {
    var allowedEndpoints = process.env.ALLOWED_ENDPOINTS.split(',');
    allowedEndpoints = allowedEndpoints.map(s => s.trim());
    alwaysLog('allowed service endpoints: ', allowedEndpoints);
  } else {
    alwaysLog('no ALLOWED_ENDPOINTS defined, so connections to all hosts will be allowed')
  }

  if (process.env.DEFAULT_ENDPOINT) {
    var defaultEndpoint = process.env.DEFAULT_ENDPOINT;
    defaultEndpoint = defaultEndpoint.trim();
    alwaysLog('default service endpoint: ', defaultEndpoint);
  } else {
    alwaysLog('no DEFAULT_ENDPOINT is defined, so all client connection requests must specify their endpoint explicitly')
  }
}

gbBuilder = protobuf.loadProtoFile('grpc-bus.proto');
gbTree = gbBuilder.build().grpcbus;

wss.on('connection', function connection(ws, request) {
  alwaysLog(`New connection established from ${request.connection.remoteAddress}`);

  ws.once('message', function incoming(data, flags) {
    var message = JSON.parse(data);
    console.log('connected with');
    console.dir(message, { depth: null });
    var protoFileExt = message.filename.substr(message.filename.lastIndexOf('.') + 1);
    if (protoFileExt === "json") {
      protoDefs = protobuf.loadJson(message.contents, null, message.filename);
    } else {
      protoDefs = protobuf.loadProto(message.contents, null, message.filename);
    }
    console.log('protoDefs');
    console.log(protoDefs);
    var gbServer = new grpcBus.Server(protoDefs, function(message) {
      console.log('sending (pre-stringify): %s')
      console.dir(message, { depth: null });
      console.log('sending (post-stringify): %s')
      console.dir(JSON.stringify(message));
      //ws.send(JSON.stringify(message));
      var pbMessage = new gbTree.GBServerMessage(message);
      console.log('sending (pbMessage message):', pbMessage);
      console.log('sending (raw message):', pbMessage.toBuffer());
      console.log('re-decoded message:', gbTree.GBServerMessage.decode(pbMessage.toBuffer()));
      if (ws.readyState === ws.OPEN) {
        ws.send(pbMessage.toBuffer());
      } else {
        console.error('WebSocket closed before message could be sent:', pbMessage);
      }
    }, require('grpc'));

    ws.on('message', function incoming(data, flags) {
      console.log('received (raw):');
      console.log(data);
      console.log('with flags:')
      console.dir(flags);
      //var message = JSON.parse(data);
      var message = gbTree.GBClientMessage.decode(data);
      console.log('received (parsed):');
      // We specify a constant depth here because the incoming
      // message may contain the Metadata object, which has
      // circular references and crashes console.dir if its
      // allowed to recurse to print. Depth of 3 was chosen
      // because it supplied enough detail when printing
      console.dir(message, { depth: 3 });
      if (message.service_create) {
        let serviceId = message.service_create.service_info.service_id;
        let endpoint = message.service_create.service_info.endpoint;
        console.log(`client requested creation of a new service (${serviceId}) on ${endpoint}`)
        if (overrideEndpoint) {
          console.log(`overriding endpoing with ${overrideEndpoint}`)
          endpoint = overrideEndpoint;
        } else {
          if (typeof defaultEndpoint !== 'undefined' && !endpoint) {
            console.log(`no endpoint specified, using default: ${defaultEndpoint}`)
            message.service_create.service_info.endpoint = defaultEndpoint;
          }
          if (typeof allowedEndpoints === 'undefined') {
            console.log('no allowedEndpoints defined, so connection will be allowed');
          } else {
            console.log(`checking against allowedEndpoints whitelist (${allowedEndpoints})`);
            if (allowedEndpoints.includes(endpoint)) {
              console.log(`Requested endpoint in allowedEndpoints, so connection will be allowed`);
            } else {
              let msg = `Error: Attempted to connect to ${endpoint}, but that is not an allowed server (${allowedEndpoints})`;
              throw new Error(msg);
              ws.send(msg);
            }
          }
        }
      }
      gbServer.handleMessage(message);
    });

    ws.on('error', error => console.error(`WebSocket Error: ${error.message}`));
  });
});

wss.on('error', error => console.error(`WebSocket Server Error: ${error.message}`));
