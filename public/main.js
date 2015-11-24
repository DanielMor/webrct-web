var constraints = { video : true, audio : true };

var getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator);
var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var MediaStream = window.webkitMediaStream || window.mozMediaStream || window.MediaStream;
var pc;
var socket = io();
var isInitiator;
var from;
var configuration = {
  'iceServers': [{
    'url': 'stun:8490.s1.minisipserver.com'
  }]
};

function call ( id ) {
    isInitiator = true;
    socket.emit('call', { name : id });
    //start( id );
}

function start( id ) {
    from = id;
    pc = new PeerConnection(configuration);

    pc.onicecandidate = function (evt) {
        if (evt.candidate){
            socket.emit('send-message', {type : 'candidate', candidate : evt.candidate, to : id});
        }
    };

    pc.onnegotiationneeded = function () {
        pc.createOffer(function (desc) {
            pc.setLocalDescription(desc, function () {
                socket.emit('send-message', {type : 'sdp', sdp : desc, to : id});
            });
        });
    }

    pc.onaddstream = function(evt) {
        var video = document.getElementById('remote-video');
        video.src = window.URL.createObjectURL(evt.stream);
    }

    getUserMedia(constraints, successCallBack, errorCallBack);
}

socket.on('message', function (data) {

    if(!pc) {
        isInitiator = false;
        start(data.from);
    }
    console.log("message");
    console.log(data);

    if (data.type == 'offer') {
        console.log('offer');
        pc.setRemoteDescription(new SessionDescription(data.sdp));   
    }

    if(data.type == 'answer'){
        console.log('answer');
        pc.setRemoteDescription(new SessionDescription(data.sdp));
    }
    if (data.type == 'candidate'){
        pc.addIceCandidate(new IceCandidate(data.candidate));
    }
});

function endCall() {
    pc.close();
}

function error(err) {
    console.log(err);
}

function successCallBack (stream) {
    var video = document.getElementById('local-video');
    video.src = window.URL.createObjectURL(stream);
    pc.addStream(stream);

    if(isInitiator) {
        pc.createOffer(function (desc) {
            console.log("create offer");
            console.log(desc);
            pc.setLocalDescription(desc);
            socket.emit('send-message', {type : 'offer', sdp : desc, to : from});
        }, error);
    }else {
        pc.createAnswer(function (desc) {
            console.log("create answer");
            console.log(desc);
            pc.setLocalDescription(desc);
            socket.emit('send-message', {type : 'answer', sdp : desc, to : from});
        }, error);
    }
}

function errorCallBack (error) {
    console.log("getUserMedia error: ", error);
};

function sendName(){
    var name = document.getElementById("iUsername").value;
    var room = document.getElementById("iRoom").value;
    socket.emit("set-name", { name : name, room : room });
}

socket.on('clients', function (data) {
    var lista = document.getElementById("lista");
    lista.innerHTML = "";
    for (var i = 0; i < data.clients.length; i++) {
        appendItem(lista, data.clients[i].room, data.clients[i].name, data.clients[i].socketId);
    }
});

socket.on('new-client', function (data) {
    var lista = document.getElementById("lista");
    appendItem(lista, data.room, data.name, data.socketId);
});

socket.on('call-response', function (data) {
    var message = getMessage(data.status);
    alert(message);
    if(data.status == 1){
        start(data.from);
    }
});

socket.on('call', function (data) {
    console.log(data);
    if(confirm("Um user pretende-lhe ligar.")){
        socket.emit('call-response', { to : data.from, status : 1});
    }else {
        socket.emit('call-response', { to: data.from, status : 2});
    }
});

function appendItem( lista, room, name, id ) {
    var item = document.createElement("LI");
    item.innerHTML = "<li>"+room + " - " + name+"<button onclick='call(" + '"'+ name + '"' + ")'> Call </button></li>";
    lista.appendChild(item);
}

function getMessage(status){
    switch(status){
        case 1:
            return "Chamada aceite.";
        case 2:
            return "Chamada recusada.";
        case 3:
            return "Utilizador offline";
        default:
            return "Codigo invalido"; 
    }
}
