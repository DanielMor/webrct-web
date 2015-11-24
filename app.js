var express = require('express');
var app = express();
var io = require('socket.io').listen(server);

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('listening at http://%s:%s', host, port);
});

var io = require('socket.io').listen(server);

var clients = [];
function Client (id){
    this.socketId = id;
    this.userId = "";
    this.name = "";
}

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	console.log(' socket - ' + socket.id + ' - joined.');

    var client = new Client(socket.id);
    clients.push(client);

	socket.on('set-name', function (data) {
		console.log(' socket - ' + socket.id + ' - change name to - ' + data.name + ' - .');

		client.name = data.name;
        client.room = data.room;
        socket.join( client.room );
        socket.broadcast.to(client.room).emit('new-client', { name : data.name, room : data.room, socketId : socket.id });
        socket.emit('clients', { clients : getClientsInRoom(client.room, client.name)});
        //console.log(getClientsInRoom(client.room, client.name));
	});

    socket.on('call', function (data) {
        var user = getClient(data.name);
        if(user){
            socket.broadcast.to(user.socketId).emit( 'call', {from: socket.id} );
            console.log("Socket id: "+socket.id+" connecting in: "+ user.socketId);
        }
        else{
            socket.emit( 'call-response', { status : 3 } );
        }
	});

    socket.on('call-response', function (data) {
        console.log(data);
        var to = data.to;
        data.from = socket.id;
        delete data.to;
        socket.broadcast.to(to).emit('call-response', data);
	});

    socket.on('end-call', function (data) {
        var socketId = null;
        clients.forEach(function(c, i){
            if( data.targetUser === c.name ){
                socketId = c.socketId;
            }
        });

        if(socketId!==null){
            // console.log("Emiting "+JSON.stringify({from: socket.id})+" to: "+socketId);
            socket.broadcast.to(socketId).emit( 'end-call', {from: socket.id} );
        }
	});

    socket.on('send-message', function (data) {
        var to = data.to;
        data.from = socket.id;
        delete data.to;
        socket.broadcast.to(to).emit('message', data);
    });

	socket.on('disconnect', function ()  {
		console.log(' disconnect client - ' + socket.id + ' - ' );
        var client = null;
        clients.forEach(function(c, i){
            if(c.socketId === socket.id){
                client = c;
                return;
            }
        });
        if( client !== null ){
            clients.splice(clients.indexOf(client), 1);
            socket.broadcast.to(client.room).emit('clients', { clients : clients});
        }
	});
});

function getClientsInRoom(room, name){
    var aux = [];
    clients.forEach(function(c, i){
        if( room === c.room && name !== c.name ){
            aux.push(c);
        }
    });
    return aux;
}

function getClient(name){
    var client = undefined;
    clients.forEach(function(c, i){
        console.log(name + " - " + c.name + " - " + (name === c.name) + " - " + (name == c.name) );
        if(name === c.name){
            client = c;
        }
    });
    return client;
}

setInterval(function() { 
    console.log("CLIENTS : " + clients.length);
    //console.log(clients);
}, 10000);