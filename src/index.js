const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/message');
const { addUser, removeUser, getUser, getUsersInRoom } =require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

// Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public');

// Setup static directory to serve
app.use(express.static(publicDirectoryPath)); //執行public 裡面的文件

io.on('connection', (socket) => { //socket is an object, it contains info about the new connection
    console.log('New WebSocket connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error);
        }

        socket.join(user.room); //因為有被trim + toLowerCase 所以用user.room

        socket.emit('message', generateMessage('Admin', 'Welcome!')); //the name of event: message 
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));//socket.broadcast.to().emit 傳送給所有在特定房間的用戶, 除了用戶自己
        
        //當有使用者加入時,傳送在此room的所有使用者名單給room的所有人
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    //訊息
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
        }
        //socket.emit('message', message); //只傳送給單一的connection
        io.to(user.room).emit('message', generateMessage(user.username, message)); //傳送給每一個connection
        callback();//acknowledgments
    });

    //經緯度
    socket.on('sendLocation', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, latitude, longitude));
        callback();//acknowledgments
    });

    //使用者離線
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));

            //當有使用者離開時,傳送在此room的所有使用者名單給room的所有人
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log(`Listening port: ${port}`);
});