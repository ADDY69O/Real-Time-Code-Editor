const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const ACTIONS = require("./src/Actions");
const cors = require("cors");
var compiler = require("compilex");
var options = { stats: true }; //prints stats on console
compiler.init(options);

const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("build"));
// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

const userSocketMap = {};
function getAllConnectedClients(roomId) {
  // Map
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    compiler.flush(function () {
      console.log("deleted temp files");
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

app.post("/compile", function (req, res) {
  try {
    var code = req.body.code;
    var input = req.body.input;
    var lang = req.body.lang;

    if (lang == "python") {
      if (input.length > 0) {
        var envData = { OS: "windows", options: { timeout: 10000 } };

        compiler.compilePythonWithInput(envData, code, input, function (data) {
          return res.send(data);
        });
      } else {
        var envData = { OS: "windows", options: { timeout: 10000 } };

        compiler.compilePython(envData, code, function (data) {
          return res.send(data);
        });
      }
    } else if (lang == "cpp") {
      if (input.length > 0) {
        var envData = {
          OS: "windows",
          cmd: "g++",
          options: { timeout: 10000 },
        }; // (uses g++ command to compile )
        //else
        compiler.compileCPPWithInput(envData, code, input, function (data) {
          return res.send(data);
        });
      } else {
        var envData = {
          OS: "windows",
          cmd: "g++",
          options: { timeout: 10000 },
        }; // (uses g++ command to compile )
        //else
        compiler.compileCPP(envData, code, function (data) {
          return res.send(data);
          //data.error = error message
          //data.output = output value
        });
      }
    } else if (lang == "java") {
      if (input.length > 0) {
        var envData = { OS: "windows", options: { timeout: 10000 } };
        //else
        compiler.compileJavaWithInput(envData, code, input, function (data) {
          return res.send(data);
        });
      } else {
        //if windows
        var envData = { OS: "windows", options: { timeout: 10000 } };
        //else
        compiler.compileJava(envData, code, function (data) {
          return res.send(data);
        });
      }
    }
  } catch (error) {
    return res.status(400).send(error);
  }

  //data.error = error message
  //data.output = output value
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
