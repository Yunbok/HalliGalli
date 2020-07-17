var express = require('express');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;


//app.use('/s01', express.static(__dirname + '/s01'));
		
app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});
/*
app.get('/s01/index.html', function(req, res){
	res.sendFile(__dirname + '/s01/index.html');
});
*/

// 플레이어 제한명수(아직구현안됨)
var PLAYER_CNT_LIMIT = 4;
// 연결된 사용자 목록
var users = [];
// 방장 sid
var host;

// cTypeCode
// 1: 딸기 1*5, 2*3, 3*3, 4*2, 5*1
// 2: 바나나 1*5, 2*3, 3*3, 4*2, 5*1
// 3: 라임 1*5, 2*3, 3*3, 4*2, 5*1
// 4: 자두 1*5, 2*3, 3*3, 4*2, 5*1
var cards = [
	{cid: 1, type: 1, num: 1},
	{cid: 2, type: 1, num: 1},
	{cid: 3, type: 1, num: 1},
	{cid: 4, type: 1, num: 1},
	{cid: 5, type: 1, num: 1},
	{cid: 6, type: 1, num: 2},
	{cid: 7, type: 1, num: 2},
	{cid: 8, type: 1, num: 2},
	{cid: 9, type: 1, num: 3},
	{cid: 10, type: 1, num: 3},
	{cid: 11, type: 1, num: 3},
	{cid: 12, type: 1, num: 4},
	{cid: 13, type: 1, num: 4},
	{cid: 14, type: 1, num: 5},
	{cid: 15, type: 2, num: 1},
	{cid: 16, type: 2, num: 1},
	{cid: 17, type: 2, num: 1},
	{cid: 18, type: 2, num: 1},
	{cid: 19, type: 2, num: 1},
	{cid: 20, type: 2, num: 2},
	{cid: 21, type: 2, num: 2},
	{cid: 22, type: 2, num: 2},
	{cid: 23, type: 2, num: 3},
	{cid: 24, type: 2, num: 3},
	{cid: 25, type: 2, num: 3},
	{cid: 26, type: 2, num: 4},
	{cid: 27, type: 2, num: 4},
	{cid: 28, type: 2, num: 5},
	{cid: 29, type: 3, num: 1},
	{cid: 30, type: 3, num: 1},
	{cid: 31, type: 3, num: 1},
	{cid: 32, type: 3, num: 1},
	{cid: 33, type: 3, num: 1},
	{cid: 34, type: 3, num: 2},
	{cid: 35, type: 3, num: 2},
	{cid: 36, type: 3, num: 2},
	{cid: 37, type: 3, num: 3},
	{cid: 38, type: 3, num: 3},
	{cid: 39, type: 3, num: 3},
	{cid: 40, type: 3, num: 4},
	{cid: 41, type: 3, num: 4},
	{cid: 42, type: 3, num: 5},
	{cid: 43, type: 4, num: 1},
	{cid: 44, type: 4, num: 1},
	{cid: 45, type: 4, num: 1},
	{cid: 46, type: 4, num: 1},
	{cid: 47, type: 4, num: 1},
	{cid: 48, type: 4, num: 2},
	{cid: 49, type: 4, num: 2},
	{cid: 50, type: 4, num: 2},
	{cid: 51, type: 4, num: 3},
	{cid: 52, type: 4, num: 3},
	{cid: 53, type: 4, num: 3},
	{cid: 54, type: 4, num: 4},
	{cid: 55, type: 4, num: 4},
	{cid: 56, type: 4, num: 5}
];

io.on('connection', function(socket){
	// 접속한 클라이언트의 정보가 수신되면
	socket.on('login', function(data) {
		console.log('Client logged-in:\n name:' + data.name + '\n userid: ' + data.userid);
		
		var isHost = false;
		var isPlayer = false;
		var isReady = false;
		// 처음들어온사람 host 추후 방장바뀌는건 코딩해야함
		if(users.length == 0){
			host = socket.id;
			isHost = true;
			isReady = true;
		}
		
		// player 제한하는 코드 필요함
		isPlayer = true;
		
		// socket에 클라이언트 정보를 저장한다
		var userInfo = {
			sid: socket.id,
			name: data.name,
			userid: data.userid,
			isPlayer: isPlayer,
			isHost: isHost,
			isReady: isReady
		};
		socket.userInfo = userInfo;
		// socket.userid = data.userid;
		// socket.player = true;	// 임시로 true로 박음

		//console.log(io.sockets.clients());
		console.log(socket.id);
		
		//플레이어 PLAYER_CNT_LIMIT = 4명제한, 이외는 CHATTER

		// 현재사용자 목록 보내줌
		io.to(socket.id).emit('currentUser', users);

		// 접속된 모든 클라이언트에게 메시지를 전송한다
		io.emit('login', socket.userInfo);

		users.push({sid: socket.id, userInfo: socket.userInfo});
		console.log(users);
		
		//fn_gameCheck();
	});

	// 클라이언트로부터의 메시지가 수신되면
	socket.on('chat', function(data) {
		console.log('Message from %s: %s', socket.name, data.msg);

		var msg = {
			from: socket.userInfo,
			msg: data.msg
		};

		// 메시지를 전송한 클라이언트를 제외한 모든 클라이언트에게 메시지를 전송한다
		socket.broadcast.emit('chat', msg);

		// 메시지를 전송한 클라이언트에게만 메시지를 전송한다
		// socket.emit('s2c chat', msg);

		// 접속된 모든 클라이언트에게 메시지를 전송한다
		// io.emit('s2c chat', msg);

		// 특정 클라이언트에게만 메시지를 전송한다
		// io.to(id).emit('s2c chat', data);
	});

	// force client disconnect from server
	socket.on('forceDisconnect', function() {
		socket.disconnect();
	});

	socket.on('disconnect', function() {
		console.log('user disconnected: ' + socket.userInfo);
		
		if(socket.userInfo != undefined){
			console.log('user remove: ' + socket.userInfo.name);
			// 유저 삭제
			users.splice(users.findIndex(item => item.sid === socket.id), 1);

			// 접속된 모든 클라이언트에게 메시지를 전송한다
			io.emit('logout', socket.userInfo);
		}
	});
	
	
	socket.on('ready', function(data) {
		console.log('ready ' + socket.id);
		console.log(socket.userInfo);
		
		if(socket.userInfo.isPlayer == true){
			if(socket.userInfo.isHost == true){

			}
			else{
				if(socket.userInfo.isReady == true){
					// 유저 update
					var idx = users.findIndex(item => item.sid === socket.id);
					users[idx].userInfo.isReady = false;
					socket.userInfo = users[idx].userInfo;
					
					// 접속된 모든 클라이언트에게 메시지를 전송한다
					io.emit('readyOff', socket.userInfo);
				}
				else{
					// 유저 update
					var idx = users.findIndex(item => item.sid === socket.id);
					users[idx].userInfo.isReady = true;
					socket.userInfo = users[idx].userInfo;
					
					// 접속된 모든 클라이언트에게 메시지를 전송한다
					io.emit('readyOn', socket.userInfo);
				}
				
				// 플레이어한명이상인것도 체크해야함, 모두레디이면
				if(users.findIndex(item => item.userInfo.isReady === false) < 0){
					
					// 방장에게만 메시지전송
					io.to(host).emit('startOn', {sid: host});
				}
				else{
					
					// 방장에게만 메시지전송
					io.to(host).emit('startOff', {sid: host});
				}
			}
		}
	});
	
	socket.on('start', function(data) {
		console.log('start ' + socket.id);
		console.log(socket.userInfo);
		
		if(socket.id == host){
			// 플레이어한명이상인것도 체크해야함, 모두레디이면
			if(users.findIndex(item => item.userInfo.isReady === false) < 0){
				
				// 접속된 모든 클라이언트에게 메시지를 전송한다
				io.emit('start', socket.userInfo);
				
				// 이후 추가 구현필요, 테스트 인터페이스임,
				// 최초 카드세팅
				fn_setCard();
				// io.to(users[0]).emit('card', 14);
				
				// 현재턴 user 로직필요
				io.emit('turn', {sid: host});
			}
		}
	});
	
	socket.on('openCard', function(data) {
		console.log('openCard ' + socket.id);
		console.log(socket.userInfo);
		
		if(socket.userInfo.isPlayer == true){
			// 순서도 체크해야겟지?
			
			var idx = users.findIndex(item => item.sid === socket.id);
			var cid = users[idx].cardList.pop();
			var cardInfo = cards.find(item => item.cid === cid);
			
			io.emit('openCard', {sid: socket.id, cardInfo: cardInfo, remain: users[idx].cardList.length});
		}
	});
});

function fn_gameCheck(){
	
}

function fn_setCard(){
	// 샘플코드임
	// var cardList = [];
	// for(var i=0; i<14; i++){
	// 	cardList.push()
	// }
	
	// cid만 저장
	users[0].cardList = [1,2,3,4,5,6,7,8,9,10,11,12,13,14];
}

// function fn_random(num){
// 	return Math.floor(Math.random() * num);
// }

server.listen(port, function(){
	console.log('socket io server listening on port '+port);
});