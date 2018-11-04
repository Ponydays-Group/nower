var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fetch = require('node-fetch');
var bodyParser = require('body-parser');
var fs = require("fs");

let config = JSON.parse(fs.readFileSync('conf.json', 'utf8'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});
let x = 0;
let rtcUsers = {};

io.on('connection', async function(socket){
    console.log('a user connected', socket.handshake.query.token);
    console.log(socket.handshake.query);
    console.log(config.url+"/server/getuserbykey?token="+config.token+"&key="+socket.handshake.query.token);
    let data = await (await fetch(config.url+"/server/getuserbykey?token="+config.token+"&key="+socket.handshake.query.token)).json();
    let iUserId = null;
    let sUserAvatar = data.sUserAvatar;
    let user = {avatar: sUserAvatar, login: data.sUserLogin, id: data.iUserId, video: false, audio: false};
    if (data.iUserId) {
        iUserId = data.iUserId;
        socket.join("user_" + iUserId);
        console.log('a user connected id ', iUserId);
    }
    socket.on('listenTopic', async function(data){
        let r = await fetch(config.url+"/server/hastopicaccess?token="+config.token+"&userId="+iUserId+"&topicId="+data.id);
        // console.log(r)
        let d = await r.json();
        // console.log(d, iUserId)
        if (!d.bAccess) {
            console.log("FALSE!");
            return false
        }
        socket.join("topic_"+data.id)
    });
    socket.on('listenTalk', async function(data){
        let r = await fetch(config.url+"/server/hastalkaccess?token="+config.token+"&userId="+iUserId+"&talkId="+data.id);
        // console.log(r)
        let d = await r.json();
        // console.log(d, iUserId)
        if (!d.bAccess) {
            console.log("FALSE!");
            return false
        }
        socket.join("talk_"+data.id)
    });

    socket.on('joinRTC',function(){
        socket.join('webrtc');
        console.log(rtcUsers,user);
        rtcUsers[user.id] = user;
        console.log(rtcUsers,user);
        io.sockets.emit('user joined', rtcUsers)
    });
    socket.on('leaveRTC',function(){
        socket.leave('webrtc');
        console.log(rtcUsers,user);
        delete rtcUsers[user.id];
        console.log(rtcUsers,user);
        io.sockets.emit('user leaved', rtcUsers)
    });
    socket.on('getRTC',function(){
        console.log(rtcUsers,user);
        socket.emit('rtc users', rtcUsers)
    });
    socket.on('speaking', function(){
        console.log('speaking', iUserId);
        io.sockets.emit('speaking', iUserId)
    });
    socket.on('stopped speaking', function(){
        console.log('stopped speaking', iUserId);
        io.sockets.emit('stopped speaking', iUserId)
    });
    socket.on('mute', function(){
        console.log('mute', iUserId);
        rtcUsers[user.id] = user;
        rtcUsers[iUserId].audio = false;
        io.sockets.emit('mute', iUserId)
    });
    socket.on('unmute', function(){
        console.log('unmute', iUserId);
        rtcUsers[user.id] = user;
        rtcUsers[iUserId].audio = true;
        io.sockets.emit('unmute', iUserId)
    });
    socket.on('pause video', function(){
        console.log('pause video', iUserId);
        rtcUsers[iUserId].video = false;
        io.sockets.emit('pause video', iUserId)
    });
    socket.on('resume video', function(){
        console.log('resume video', iUserId);
        rtcUsers[user.id] = user;
        rtcUsers[iUserId].audio = true;
        io.sockets.emit('resume video', iUserId)
    });

    socket.on('disconnect', function(){
        console.log(rtcUsers,user);
        delete rtcUsers[user.id];
        console.log(rtcUsers,sUserAvatar);
        io.sockets.emit('user leaved', rtcUsers);
        console.log("user disconnected", data.iUserId)
    }.bind(this));
    console.log(rtcUsers, iUserId)
});

function sendToUser(id, event, data) {
    io.to("user_"+id).emit(event, data)
}

function sendToUsers(ids, event,data) {
    for (let i =0; i<ids.length; i++) {
        sendToUser(ids[i], event,data)
    }
}

function sendToGroup(group, event, data) {
    io.to(group).emit(event,data)
}

app.post('/notification', function(req, res){
    x += 1;
    let data = req.body;
    console.log(data);
    data.noticeId = x;
    sendToUser(data.user_id, "notification", data);
    data.title="";
    data.text="";
    let group = data.group_target_type + "_" + data.group_target_id;
    sendToGroup(group, "notification_group", data);
    res.send("")
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});