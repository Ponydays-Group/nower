var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fetch = require('node-fetch');
var bodyParser = require('body-parser');
var fs = require("fs")

let config = JSON.parse(fs.readFileSync('conf.json', 'utf8'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var users = {}
var groups = {}

io.on('connection', async function(socket){
    console.log('a user connected', socket.handshake.query.token);
    console.log(config.url+"/server/getuserbykey?token="+config.token+"&key="+socket.handshake.query.token)
    let data = await (await fetch(config.url+"/server/getuserbykey?token="+config.token+"&key="+socket.handshake.query.token)).json()
    let iUserId = data.iUserId
    if (data.iUserId in users) {
        users[data.iUserId].push(socket)
    } else {
        users[data.iUserId] = [socket]
    }
    socket.on('listenTopic', async function(data){
        console.log("LISTEN TOPIC", data)
        let r = await fetch(config.url+"/server/hastopicaccess?token="+config.token+"&userId="+iUserId+"&topicId="+data.id)
        console.log(r)
        let d = await r.json()
        console.log(d, iUserId)
        if (!d.bAccess) {
            console.log("FALSE!")
            return false
        }
        joinToGroup("topic_"+data.id, socket)
    })
    socket.on('disconnect', function(){
        console.log("user disconnected", data.iUserId)
        users[data.iUserId].pop(socket)
    }.bind(this));
});

function sendToUser(id, event, data) {
    if (id in users) {
        for (let i =0; i<users[id].length; i++) {
            users[id][i].emit(event, data)
        }
        return true
    }
    return false
}

function sendToUsers(ids, event,data) {
    for (let i =0; i<ids.length; i++) {
        sendToUser(ids[i], event,data)
    }
}

function sendToGroup(group, event, data) {
    if (!(group in groups)) {
        console.log("RETURN")
        return false
    }
    for (let i =0; i<groups[group].length; i++) {
        groups[group][i].emit(event,data)
    }
}

function joinToGroup(group, sock) {
    if (!(group in groups)) {
        groups[group] = [sock]
    } else {
        groups[group].push(sock)
    }
}

/* ADD COMMENT
 * userId: int
 * userIds: array:int
 * senderId: int
 * commentData: array
 * targetType: string
 * targetId: int
 * targetTitle: string
 */
app.post('/comment', function(req, res){
    let data = req.body
    data.commentData = JSON.parse(data.commentData)
    // console.log(data)

    if (data.targetType=="talk") {
        sendToUsers(data.userIds,"talk-answer", data)
    } else {
        sendToGroup("topic_"+data.targetId, "new-comment", data)
        if (data.userId != data.senderId) {
            sendToUser(data.userId, "reply-info", data)
        }
    }

    res.send("")
});

/* EDIT COMMENT
 * userId: int
 * senderId: int
 * commentText: string
 * targetType: string
 * targetId: int
 * targetTitle: string
 */
app.patch('/comment', function(req, res){
    data = req.body
    data.commentData = JSON.parse(data.commentData)
    console.log("PATCH:",data)

    if (data.targetType=="talk") {
        sendToGroup("talk_"+data.targetId,"edit-comment", data)
    } else {
        sendToGroup("topic_"+data.targetId, "edit-comment", data)
        if (data.userId != data.senderId) {
            sendToUser(data.userId, "edit-comment-info", data)
        }
    }

    res.send("")
});

/* DELETE COMMENTT
 * userId: int
 * senderId: int
 * deleteReason: string
 * targetType: string
 * targetId: int
 * targetTitle: string
 * delete: bool
 */
app.delete('/comment', function(req, res){
    let data = req.body
    console.log(req.body)

    if (data.targetType=="talk") {
        sendToGroup("talk_"+data.targetId,"delete-comment", data)
    } else {
        sendToGroup("topic_"+data.targetId, "delete-comment", data)
        if (data.userId != data.senderId) {
            sendToUser(data.userId, "delete-comment-info", data)
        }
    }

    res.send("")
});

/* ADD TOPIC
 * senderId: int
 * topicId: int
 * targetId: int
 */
app.post('/topic', function(req, res){
    res.send("")
});

/* EDIT TOPIC
 * senderId: int
 * userId: int
 * topicId: int
 * targetId: int
 * topicText: string
 * topicTextShort: string
 */
app.patch('/topic', function(req, res){
    res.send("")
});

/* DELETE TOPIC
 * senderId: int
 * topicId: int
 * targetId: int
 */
app.delete('/topic', function(req, res){
    res.send("")
});

/* ADD TALK
 * senderId: int
 * userIds: array:int
 * talkId: int
 * talkTitle: string
 * talkText: string
 */
app.post('/talk', function(req, res){
    res.send("")
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});