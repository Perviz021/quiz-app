import http from "http";
import app from "./app.js";
import initSocket from "./socket/index.js";

const server = http.createServer(app);
const io = initSocket(server);

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
