GRPC-Bus WebSocket Proxy Server

This Node.js server acts as a proxy, connecting GRPC clients running in a browser context to standard GRPC service(s) via a WebSocket.

Usage

```
node server.js
```

How it Works

The browser client loads the Protobuf definition, and passes it to the server via the initial message after creating the WebSocket connection


TODO

- Upgrade to Protobuf JS v6
- Serve static content
- Allow server to load .proto file directly
- Push .proto file from server to client
- Validate service map against proto file
- Beter Error Handling
- Support bundled/synchronous loading of JSON-formatted protoDefs
- Specify allowed connections as CLI arg: --allow [service_name:]server:port
- Specify port as CLI arg:  --port 8080


