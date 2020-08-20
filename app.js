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

//윤복추가 카드세팅 알고리즘 
var index = [5,3,3,2,1];
var cards = [];
var cardNum =0;
var i = 1;
for(var j = 1; j<=4 ; j++){
	cardNum = 0;
	for(var k = 0; k<5; k++){
		cardNum++;
		for(var x =0; x < index[k];x ++){
			cards.push({cid: i, type: j, num: cardNum});
			i++;
		}
	}
}

// cTypeCode
// 1: 딸기 1*5, 2*3, 3*3, 4*2, 5*1
// 2: 바나나 1*5, 2*3, 3*3, 4*2, 5*1
// 3: 라임 1*5, 2*3, 3*3, 4*2, 5*1
// 4: 자두 1*5, 2*3, 3*3, 4*2, 5*1
/*
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
*/
//카드덱 뒤집은 카드들
var cardDeck = new Array();
//뒤집혀 있는 카드들
var openCards = new Array();
//보너스
var bonus = 0;

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
		var hostCnt = (users.filter(users => users.userInfo.isHost)).length;
		if(users.length == 0 || hostCnt == 0){
			host = socket.id;
			isHost = true;
			isReady = true;
		}
		
		// player 임시제한 4명 
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
			var idx = users.findIndex(item => item.sid === socket.id);
			var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
			if(start && playerCnt > 2){
				//카드가 남아잇는 플레이어 종료시 남은 카드 보너스에 추가
				if(users[idx].userInfo.isPlayer == true && (users[idx].cardInfo.cardCnt > 0 || users[idx].cardInfo.openCards > 0)){
					for(var i = 0;i<users[idx].cardInfo.cardCnt;i++){
						var cid = users[idx].cardInfo.cardList.dequeue();
						cardDeck.push(cid);
					}
					bonus += users[idx].cardInfo.cardCnt + users[idx].cardInfo.openCards;
					io.emit('bonus', {bonus: bonus});
				}
				//턴인 플레이어가 접속종료시
				if(users[idx].userInfo.isTurn){
					fn_turn(idx);
				}
			}
			// 유저 삭제
			users.splice(users.findIndex(item => item.sid === socket.id), 1);
			var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
			openCards.splice(openCards.findIndex(item => item.openCard.sid === socket.id), 1);

			//호스트 접속해제시 호스트변경
			if(socket.id === host){
				if(users.length > 0 && playerCnt > 0){
					if((users.filter(users => users.userInfo.isPlayer)).length > (idx+1)){
						if(users[idx+1].userInfo.isPlayer){
							fn_hostSet(users[idx+1].userInfo);
						}
						else{
							var num = users.findIndex(item => item.userInfo.isPlayer);
							fn_hostSet(users[num].userInfo);
						}
					}
					else{
						var num = users.findIndex(item => item.userInfo.isPlayer);
						fn_hostSet(users[num].userInfo);
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
					bonus = cardDeck.length;
					io.emit('bonus', {bonus: bonus});
					// 접속된 모든 클라이언트에게 메시지를 전송한다
					io.emit('start', socket.userInfo);
				
					start = true;
				
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
		
		//플래이어 체크 & 아웃여부 체크
		if(users[idx].userInfo.isPlayer == true && users[idx].userInfo.isOut == false ){
			// 순서도 체크해야겟지?
			
			var cid = users[idx].cardInfo.cardList.dequeue();
			// var cardInfo = cards.find(item => item.cid === cid);
			var cardImageInfo = cards.find(item => item.cid === cid);
			var cidx = openCards.findIndex(item => item.openCard.sid === socket.id);
			openCards[cidx].openCard.cid = cid;
			cardDeck.push(cid);
			users[idx].cardInfo.cardCnt -=1;
			users[idx].cardInfo.openCards +=1;
			//remain  삭제했는데 문제점이 생길지?? 
			//cardInfo 2개를 cardImageInfo , cardInfo 로 수정
			io.emit('openCard', {sid: socket.id, cardImageInfo: cardImageInfo, cardInfo: users[idx].cardInfo});
			fn_turn(idx);
			console.log(cardDeck);
		}
	});
	
	socket.on('bell', function(data) {
		console.log('bell ' + socket.id);
		console.log(socket.userInfo);
		
		var idx = users.findIndex(item => item.sid === socket.id);
		var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
		
		//플래이어 체크 & 아웃여부 체크
		if(socket.userInfo.isPlayer == true && users[idx].userInfo.isOut == false){
			var result = fn_bellCheck(socket.id);
			
			//성공시
			if(result){
				for(var i=0;i<openCards.length;i++){
					openCards[i].openCard.cid = 0;
				}
				var length = cardDeck.length;
				//성공한 플레이어에게 카드덱(오픈된 카드&보너스)에 카드 추가
				for(var i=0;i<length;i++){
					var target = cardDeck.splice(Math.floor(0), 1)[0];
					console.log("target"+target);
					users[idx].cardInfo.cardList.enqueue(target);
					users[idx].cardInfo.cardCnt += 1;
				}
				console.log(users[idx].cardInfo.cardList);
				var outObj = new Array();
				
				//각 플레이어 오픈 카드 초기화 및 남은 카드 수 0인 플레이어 아웃처리
				for(var i=0; i<playerCnt; i++){
					console.log(users[i]);
					users[i].cardInfo.openCards = 0;
					if(users[i].cardInfo.cardCnt == 0){
						users[i].userInfo.isOut = true; 
						io.emit('out',  {sid: users[i].userInfo.sid});
						outObj.push(io.of("/").connected[users[i].userInfo.sid]);
					}
				}
				//성공한 플레이어가 턴이 아닐시 턴을 가져감
				if(!users[idx].userInfo.isTurn){
					var turnIdx = users.findIndex(item => item.userInfo.isTurn === true);
					users[turnIdx].userInfo.isTurn = false;
					users[idx].userInfo.isTurn = true;
				}
				
				//아웃된 플레이어 내쫓음
				for(var i=0; i<outObj.length; i++){
					outObj[i].disconnect();
				}
				io.emit('success', users);
				
				//보너스 초기화
				bonus = 0;
				io.emit('bonus', {bonus: bonus});
			}
			
			//실패시
			else{
				//카드수 0인 플레이어면 아웃
				if(users[idx].cardInfo.cardCnt == 0){
					users[idx].userInfo.isOut = true;
					io.emit('out',  {sid: socket.id});
					socket.disconnect();
				}
				else{
					//다른 플레이어에게 카드 1장씩 줌
					for(var i=0; i<playerCnt; i++){
						//자기 자신 제외
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
					//벨을 누른 플레이어가 턴이고 카드 수가 0이 되면 턴 넘김
					if(users[idx].cardInfo.cardCnt == 0 && users[idx].userInfo.isTurn){
						fn_turn(idx);
					}
				}
				io.emit('fail',  users);
			}
		}
		fn_end();
	});
});

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
		//각 플레이에게 1/n으로 랜덤하게 카드부여
		 for(var j=0;j<Math.floor(56/playerCnt);j++){
			 let target = cardDeck.splice(Math.floor(Math.random() * cardDeck.length), 1)[0];
		 	 cardInfo.cardCnt +=1;
			 cardInfo.cardList.enqueue(target);
		 }
		 users[i].cardInfo = cardInfo;
		 var sid = users[i].userInfo.sid;
		//각 플레이어에 오픈카드를 저장할 공간 생성
		 var openCard = {
			sid: sid,
			cid: 0
		};
		 openCards.push({openCard : openCard});
	 }
	//호스트에게 턴을 줌
	var num = users.findIndex(item => item.userInfo.sid === host);
	users[num].userInfo.isTurn = true;
	console.log(users[num].userInfo);
	
	// cid만 저장
	//users[0].cardList = [1,2,3,4,5,6,7,8,9,10,11,12,13,14];
}

function fn_turn(idx){
	users[idx].userInfo.isTurn = false;
	var turnIdx = idx;

  	/*for(var i = turnIdx;i<users.length+1;i++){
		turnIdx+=1;
		if(turnIdx >= users.length){
			//users크기보다 turnIdx 가 크면 처음부터 다시 찾는거로 추정됨  
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
			start = false;
			cardDeck = new Array();
			io.emit('end',  users[idx].userInfo);*/
	var playerCnt = (users.filter(users => users.userInfo.isPlayer)).length;
	//플레이어 수가 2명 미만시 게임종료
	if(playerCnt<2){
		start = false;
		cardDeck = new Array();
		io.emit('end',  users[idx].userInfo);
	}
	else{
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

		}
	}
}

function fn_end(){
	//이웃안된 플레이어가 1명일시 게임종료
	var survivor = (users.filter(users => !users.userInfo.isOut)).length;
	if(survivor == 1){
		start = false;
		var idx = users.findIndex(item => !item.userInfo.isOut);
		//카드덱, 오픈된 카드, 보너스 초기화
		cardDeck = new Array();
		openCards = new Array();
		bonus = 0;
		users[idx].userInfo.isTurn = false;
		io.emit('end',  users[idx].userInfo);
	}
}
//윤복 추가
function fn_hostSet(userInfo){
	userInfo.isHost = true;
	io.emit('host', userInfo);
	host = userInfo.sid;
}
function shuffle(array) { 
	var j, x, i;
	for (i = array.length; i; i -= 1) {
		j = Math.floor(Math.random() * i);
		x = array[i - 1];
		array[i - 1] = array[j];
		array[j] = x;
	} 
	return array;
}
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