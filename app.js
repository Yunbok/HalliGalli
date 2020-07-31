var express = require('express');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8090; 


app.use('/images', express.static(__dirname + '/images'));
		
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
//카드덱 뒤집은 카드들
var cardDeck = new Array();
//뒤집혀 있는 카드들
var openCards = [];
//게임 시작여부
var start = false;
io.on('connection', function(socket){
	// 접속한 클라이언트의 정보가 수신되면
	socket.on('login', function(data) {
		console.log('Client logged-in:\n name:' + data.name + '\n userid: ' + data.userid);
		
		var isHost = false;
		var isPlayer = false;
		var isReady = false;
		//턴구분
		var isTurn = false;
		//게임 아웃 구분
		var isOut = true;
		// 처음들어온사람 host 추후 방장바뀌는건 코딩해야함
		var hostCnt = (users.filter(users => users.userInfo.isHost)).length;
		if(users.length == 0 || hostCnt == 0){
			host = socket.id;
			isHost = true;
			isReady = true;
		}
		
		// player 임시제한 2명 
		// 게임시작 후 들어오면 CHATTER
		if((users.filter(users => users.userInfo.isPlayer)).length < PLAYER_CNT_LIMIT && !start){
			isPlayer = true;
			isOut = false;
		}
		
		// socket에 클라이언트 정보를 저장한다
		var userInfo = {
			sid: socket.id,
			name: data.name,
			userid: data.userid,
			isPlayer: isPlayer,
			isHost: isHost,
			isReady: isReady,
			isTurn: isTurn,
			isOut : isOut
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
			var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
			//호스트 접속해제시 호스트변경
			if(socket.id === host){
				if(users.length > 0 && playerCnt > 0){
					var idx = users.findIndex(item => item.sid === socket.id);
					if((users.filter(users => users.userInfo.isPlayer)).length > (idx+1)){
						if(users[idx+1].userInfo.isPlayer){
							users[idx+1].userInfo.isHost = true;
							io.emit('host', users[idx+1].userInfo);
							host = users[idx+1].userInfo.sid;
						}
						else{
							var num = users.findIndex(item => item.userInfo.isPlayer);
							users[num].userInfo.isHost = true;
							io.emit('host', users[num].userInfo);
							host = users[num].userInfo.sid;
						}
					}
					else{
						var num = users.findIndex(item => item.userInfo.isPlayer);
						users[num].userInfo.isHost = true;
						io.emit('host', users[num].userInfo);	
						host = users[num].userInfo.sid;
					}
					console.log("host out");
				}
			}
			// 접속된 모든 클라이언트에게 메시지를 전송한다
			io.emit('logout', socket.userInfo);
		}
		fn_end();
	
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
					var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
					var readyPlayerCnt = (users.filter(users => users.userInfo.isReady)).length;
					console.log("playerCnt: " + playerCnt);
					console.log("readyPlayerCnt: " + readyPlayerCnt);
					if(readyPlayerCnt == (playerCnt)){
						io.to(host).emit('startOn', {sid: host});
					}
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
			// 플레이어한명이상
			if((users.filter(users => users.userInfo.isPlayer)).length > 1){
				//플레이어 모두 레디
				if(users.findIndex(item => item.userInfo.isReady === false) < 0){
					// 최초 카드세팅
					fn_setCard();
					//보너스 카드 수
					io.emit('bonus', {bonus: cardDeck.length});
					// 접속된 모든 클라이언트에게 메시지를 전송한다
					io.emit('start', socket.userInfo);
				
					start = true;
					// 이후 추가 구현필요, 테스트 인터페이스임,
					// io.to(users[0]).emit('card', 14);
				
					// 현재턴 user 로직필요
					io.emit('turn', {sid: host});
				}
			}
		}
	});
	
	socket.on('openCard', function(data) {
		console.log('openCard ' + socket.id);
		console.log(socket.userInfo);
		
		var idx = users.findIndex(item => item.sid === socket.id);
		
		if(socket.userInfo.isPlayer == true && users[idx].userInfo.isOut == false ){
			// 순서도 체크해야겟지?
			
			var cid = users[idx].cardInfo.cardList.dequeue();
			var cardInfo = cards.find(item => item.cid === cid);
			var cidx = openCards.findIndex(item => item.openCard.sid === socket.id);
			openCards[cidx].openCard.cid = cid;
			cardDeck.push(cid);
			users[idx].cardInfo.cardCnt -=1;
			users[idx].cardInfo.openCards +=1;
			io.emit('openCard', {sid: socket.id, cardInfo: cardInfo, remain: users[idx].cardInfo.cardCnt, cardInfo2: users[idx].cardInfo});
			fn_turn(idx);
			console.log(cardDeck);
		}
	});
	
	socket.on('bell', function(data) {
		console.log('bell ' + socket.id);
		console.log(socket.userInfo);
		var idx = users.findIndex(item => item.sid === socket.id);
		var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
		if(socket.userInfo.isPlayer == true && users[idx].userInfo.isOut == false){
			var result = fn_bellCheck(socket.id);
			if(result){
				for(var i=0;i<openCards.length;i++){
					openCards[i].openCard.cid = 0;
				}
				console.log(cardDeck.length);
				var length = cardDeck.length;
				for(var i=0;i<length;i++){
					var target = cardDeck.splice(Math.floor(0), 1)[0];
					console.log("target"+target);
					users[idx].cardInfo.cardList.enqueue(target);
					users[idx].cardInfo.cardCnt += 1;
				}
				console.log(users[idx].cardInfo.cardList);
				var outObj = new Array();
				for(var i=0; i<playerCnt; i++){
					console.log(users[i]);
					users[i].cardInfo.openCards = 0;
					if(users[i].cardInfo.cardCnt == 0){
						users[i].userInfo.isOut = true; 
						io.emit('out',  {sid: users[i].userInfo.sid});
						outObj.push(io.of("/").connected[users[i].userInfo.sid]);
					}
				}
				for(var i=0; i<outObj.length; i++){
					outObj[i].disconnect();
				}
				io.emit('success', users);
				io.emit('bonus', {bonus: cardDeck.length});
			}
			else{
				if(users[idx].cardInfo.cardCnt == 0){
					users[idx].userInfo.isOut = true;
					io.emit('out',  {sid: socket.id});
					socket.disconnect();
				}
				else{
					for(var i=0; i<playerCnt; i++){
						if(socket.id === users[i].userInfo.sid || users[i].userInfo.isOut == true){
							continue;
						}
						else{
							if(users[idx].cardInfo.cardCnt > 0){
								var cid = users[idx].cardInfo.cardList.dequeue();
								users[idx].cardInfo.cardCnt -= 1;
								users[i].cardInfo.cardList.enqueue(cid);
								users[i].cardInfo.cardCnt += 1;
							}
							else{
								break;
							}
						}
					}
					if(users[idx].cardInfo.cardCnt == 0){
						fn_turn(idx);
					}
				}
				io.emit('fail',  users);
			}
		}
		fn_end();
	});
});

function fn_gameCheck(){
	
}
function fn_bellCheck(sid){
	var type1 = 0;
	var type2 = 0;
	var type3 = 0;
	var type4 = 0;
	for(var i=0;i<openCards.length;i++){
		if(openCards[i].openCard.cid === 0){
			continue;
		}
		else{
			var cardType = (cards.find(item => item.cid === openCards[i].openCard.cid)).type;
			console.log(cardType);
			switch(cardType){
				case 1:
					type1 += (cards.find(item => item.cid === openCards[i].openCard.cid)).num;
					break;
				case 2:
					type2 += (cards.find(item => item.cid === openCards[i].openCard.cid)).num;
					break;
				case 3:
					type3 += (cards.find(item => item.cid === openCards[i].openCard.cid)).num;
					break;
				case 4:
					type4 += (cards.find(item => item.cid === openCards[i].openCard.cid)).num;
					break;
			}
		}
	}
	if(type1 === 5 || type2 === 5 || type3 === 5 || type4 === 5){
		return true;
	}
	return false;
}

function fn_setCard(){
	for(var i=1;i<57;i++){
		cardDeck.push(i);
	}
	//카드 정보
	
	var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
	for(var i=0; i<playerCnt; i++){
		var cardList = new Queue();
		var cardInfo = {
			cardCnt : 0,
			cardList : cardList,
			openCards : 0
		};
		 for(var j=0;j<Math.floor(56/playerCnt);j++){
			 let target = cardDeck.splice(Math.floor(Math.random() * cardDeck.length), 1)[0];
		 	 cardInfo.cardCnt +=1;
			 cardInfo.cardList.enqueue(target);
		 }
		 users[i].cardInfo = cardInfo;
		 var sid = users[i].userInfo.sid;
		 var openCard = {
			sid: sid,
			cid: 0
		};
		 openCards.push({openCard : openCard});
	 }
	var num = users.findIndex(item => item.userInfo.sid === host);
	users[num].userInfo.isTurn = true;
	console.log(users[num].userInfo);
	
	// cid만 저장
	//users[0].cardList = [1,2,3,4,5,6,7,8,9,10,11,12,13,14];
}

function fn_turn(idx){
	users[idx].userInfo.isTurn = false;
	var turnIdx = idx;
	for(var i = turnIdx;i<users.length+1;i++){
		turnIdx+=1;
		if(turnIdx >= users.length){
			var num = users.findIndex(item => (item.userInfo.isPlayer && item.cardInfo.cardCnt > 0));
			users[num].userInfo.isTurn = true;
			io.emit('turn', {sid: users[num].userInfo.sid});
			break;
		}
		else if(users[turnIdx].userInfo.isPlayer && users[turnIdx].cardInfo.cardCnt >0){
			users[turnIdx].userInfo.isTurn = true;
			io.emit('turn', {sid: users[turnIdx].userInfo.sid});
			break;
		}
		else if(!users[turnIdx].userInfo.isPlayer){
			continue;
		}
		else{
			console.log('AAAAAAAAAA');
			console.log(idx);
			console.log(users[idx]);
			start = false;
			cardDeck = new Array();
			io.emit('end',  users[idx].userInfo);
		}
	}
}

function fn_end(){
	var survivor = (users.filter(users => !users.userInfo.isOut)).length;
	if(survivor == 1){
		start = false;
		var idx = users.findIndex(item => !item.userInfo.isOut);
		cardDeck = new Array();
		users[idx].userInfo.isTurn = false;
		io.emit('end',  users[idx].userInfo);
	}
}
// function fn_random(num){
// 	return Math.floor(Math.random() * num);
// }
class Queue {
	constructor() {
		this._arr = [];
	}
	enqueue(item) {
		this._arr.push(item);
	}
	dequeue() {
		return this._arr.shift();
	}
}
server.listen(port, function(){
	console.log('socket io server listening on port '+port);
});