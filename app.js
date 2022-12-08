var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var Storage = require('memorystore')(session);
var logger = require('morgan');
var db = require('mysql');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var pageRouter = require('./routes/start');
var ImageRouter = require('./routes/Image')
var registerRouter = require('./routes/Register');
var translater = require('./public/javascripts/translate');
const { response, query } = require('express');
const { MemoryStore } = require('express-session');
const cors = require("cors");
const fs = require("fs");
const { Http2ServerRequest } = require('http2');

var client_id = '7HK9tPsLi9yFUjvwDzx1';
var client_secret = '6uWchEawHA';
var app = express();
var app2 = express();
let status = 0;
var https = require('https');
var http = require('http');
var sessionObject = {
  secret : 'Jello',
  resave : false,
  saveUninitialized : true,
  store : new MemoryStore({ checkPeriod : 1000 * 6000}),
  cookie : {
    maxAge : 1000 * 6000,
  }
};

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session(sessionObject));
app.use('/', (req,res,next) => {
	if(req.secure) {
		next();
} else {
	const to = `https://${req.hostname}$(req.url}`;
	res.redirect(to);

}
});
var isServiceWorkerSupported = 'serviceWorker' in navigator;
if (isServiceWorkerSupported)
{
  //브라우저에 Service Worker를 등록
  navigator.serviceWorker.register('service-worker.js', { scope: '/'})
    .then(function(registration)
    {
       console.log('[ServiceWorker] 등록 성공: ', registration.scope);
    })
    .catch(function(err) 
    {
       console.log('[ServiceWorker] 등록 실패: ', err);
    });
}
app.use('/users', usersRouter);
app.use('/start', pageRouter);
app.use('/Register',registerRouter);
app.use('/trans',translater);
app.use(cors());
app.use('/upload',express.static('upload'));
app.post('/Image',ImageRouter);

var db_info = {
  host : '127.0.0.1',
  port : '3306',
  user : 'root',
  password : 'altmxpfl12',
  database : 'Autor'
};
var socketId;

var connection = db.createConnection(db_info);
  connection.connect((err)=> {
    if(err) {
      console.log(err);
      return;
    }
    console.log("my sql connected");
  })

  const keyOption = {
    key: fs.readFileSync('./keys/rootca.key'),
    cert : fs.readFileSync('./keys/rootca.crt')
  };

const httpServer = http.createServer(app);
httpServer.listen(3000);
const httpsserver = https.createServer(keyOption, app).listen(443);

var io = require('socket.io')(httpsserver);
io.on('connection', function(socket) {
  socket.on('join',(room_id) => { 
    socket.join(room_id);
    console.log(room_id);
  })
  socket.on('message',function(chatRoom_id, user_id, msg){
    var sendUser = user_id;
    var currentTime = new Date();
    var current = currentTime.getFullYear() + '/' + currentTime.getMonth() + '/' + currentTime.getDate() + '/' + currentTime.getDay();
    connection.query('Insert into chat(chatUser_id,chatRoom_id,content,date) VALUES(?,?,?,?)',[sendUser, chatRoom_id, msg,current],function(err,data){
      if(err) throw err;
      io.emit('resultMessage',user_id, msg);
    })
  })
  socket.on('loadUser',function() {
    console.log(socket.id);
  })
  socket.on('disconnect',function () {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("퇴장하셨습니다.");
    })
  }) 
})
app.get('/home/tutoringList/ChatTest',function(req,res) {
  var user_id = req.session.displayName.id;
  var user = req.session.user;
  console.log(req.query);
  if(req.query.chatroom_id=="null") {
    connection.query('')
  }
  connection.query('Select * from chatRoom where id = ?',[req.query.chatroom_id],function(err,results,field) {
    if(err) throw err;
    if(results.length <=0) {
        connection.query('Insert into chatRoom(user1_id, user2_id, chatroom_id) values(?,?,?)',[req.query.user1, req.query.user2,req.query.chatroom_id], function(err,results2,field) {
            if(err) throw err;
            else {
              connection.query('Select * from chat where chatRoom_id = ?',[req.query.chatroom_id],function(err,results,field) {
                if(err) throw err;
                if(results.length > 0) {
                  res.render('Chat',{user_id : user_id, rows : results, user});
                } else {
                  res.render('Chat',{user_id : user_id, user});
                }
              })
            }
        })
    } else {
      connection.query('Select * from chat where chatRoom_id = ?',[req.query.chatroom_id],function(err,results,field) {
        if(err) throw err;
        if(results.length > 0) {
          res.render('Chat',{user_id : user_id, rows : results, user});
        } else {
          res.render('Chat',{user_id : user_id, user});
        }
      })
    }
  })
})

app.get('/start', function(req, res) {
  res.render('start.js')
})
app.get('/home/',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('SELECT * from post where nickname = ?',[user.nickname],function(err,results,field) {
    if(err) throw err;
    connection.query('SELECT * from post2 where nickname = ?',[user.nickname], function(err, results2, field) {
      if(err) throw err;
      connection.query('SELECT * from tutoring where tutorUser_id = ? OR tuteeUser_id = ?',[user.id, user.id], function(err, results3, field) {
        if(err) throw err;
        if(results.length > 0 && results2.length > 0 && results3.length > 0) {
          res.render('home',{lang : lang, user:user, post1 : results, post2 : results2, tutoring : results3});
        }
        else if(results.length <= 0 && results2.length > 0 && results3.length > 0) {
          res.render('home',{lang : lang, user:user, post2 : results2, tutoring : results3});
        }
        else if(results.length <= 0 && results2.length <= 0 && results3.length > 0) {
          res.render('home',{lang : lang, tutoring : results3});
        }
        else if(results.length > 0 && results2.length <= 0 && results3.length > 0) {
          res.render('home',{lang : lang, user:user, post1 : results, tutoring : results3});
        }
        else if(results.length > 0 && results2.length > 0 && results3.length <= 0) {
          res.render('home',{lang : lang, user:user, post1 : results, post2 : results2});
        } else {
          res.render('home',{lang : lang, user:user});
        }
      })
    })
  })
})
app.get('/home/myProfile/editProfile',function(req,res) {
  var user = req.session.user;
  res.render('editProfile',{user : user});
})
app.get('/home/myProfile/myTutorProfile',function(req,res) {
  var user = req.session.user;
  connection.query('SELECT * from tutorProfile where profileUser_id = ?',[user.id],function(err,results,field) {
    if(err) throw err;
    if(results.length > 0) {
      res.render('myTutorProfile',{tutorProfile : results[0], user : user});
    } else {
      res.render('myTutorProfile',{user : user});
    }
  })
})
app.get('/user/checkNickname',function(req,res) {
  var nickname = req.query.nickname;
  connection.query('SELECT * from user where nickname = ?',[nickname], function(err,results,field) {
    if(err) throw err;
    if(results.length <= 0) {
      res.send({status : 200, message : "일치하는 유저 없음"});
    } else {
      res.send({status : 500, message : "일치하는 유저 있음"});
    }
  })
})
app.get('/user/updateProfile',function(req,res) {
  var nickname = req.query.nickname;
  var profileImage = req.query.profileImage;
  var user = req.session.user;
  connection.query('UPDATE user set nickname = ?, profileImage = ? where id = ?',[nickname, profileImage, user.id], function(err, results) {
    if(err) throw err;
    else {
      req.session.user.nickname = nickname;
      req.session.user.profileImage = profileImage;
      res.send({status : 200, message : "프로필 수정 성공"});
    }
   }
  )
})
app.get('/user/updateTutorProfile',function(req,res) {
  var Introduce = req.query.Introduce;
  var tutorSector = req.query.tutorSector;
  var tutorDates = req.query.tutorDates;
  var preferenceCountry = req.query.preferenceCountry;
  var user = req.session.user;
  connection.query('UPDATE tutorProfile set introduce = ?, tutorSector = ? , tutorDates = ? , preferenceCountry = ? where profileUser_id = ?',[Introduce, tutorSector, tutorDates, preferenceCountry, user.id], function(err, results) {
    if(err) throw err;
    else {
      res.send({status : 200, message : "프로필 수정 성공"});
    }
   }
  )
})
app.get('/home/myProfile/editTutorProfile',function(req,res) {
  var user = req.session.user;
  connection.query('SELECT * from tutorProfile where profileUser_id = ?',[user.id],function(err,results,field) {
    if(err) throw err;
    if(results.length > 0) {
      res.render('editTutorProfile',{tutorProfile : results[0], user : user});
    } else {
      res.render('editTutorProfile',{user : user});
    }
  })
})
app.get('/home/post/',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('SELECT * FROM post', function(err, rows){
    if(err) throw err;
      res.render('post', {rows:rows, lang : lang, user : user, length : rows.length-1, page_num:5, pass: true});
  })
})
app.get('/home/findPost/',function(req,res){
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('SELECT id, title, content, nickname, count FROM post2',function(err, rows){
    if(err) throw err;
    res.render('findPost',{rows:rows, lang : lang, user : user});
  })
})
app.get('/home/post/postDetail',function(req,res) {
  var post_id = req.url.substring(req.url.indexOf('?')+1).split('=')[1];
  var username = req.session.user.nickname;
  var user = req.session.user;
  var lang = req.session.user.country;
  console.log(post_id);
  connection.query('SELECT id, title, content, nickname, count FROM post WHERE id = ?',[post_id], function(err, rows){
    if(err) throw err;
    connection.query('SELECT * from reply where post_id = ?',[post_id], function(err, results2) {
      if(err) throw err;
      
      if(results2.length > 0) {
        console.log(rows);
        res.render('post_Detail',{rows:rows, username : username, lang : lang, rows2 : results2, user : user});
      } else {
        res.render('post_Detail',{rows:rows, username : username, lang : lang, user : user});
      }
    })
  })
})

app.get('/home/post/deletePost',function(req,res){
  var post_id = req.query.post_id;

  connection.query('DELETE FROM post where id = ?',[post_id], function(err, rows){
    if(err) throw err;
    connection.query('DELETE from reply where post_id = ?',[post_id],function(err, rows) {
      if(err) throw err;
      else
        res.send({status : 200, message : "삭제 성공!"});
    })
  })
})

app.get('/home/findPost/deletePost',function(req,res){
  var post_id = req.query.post_id;

  connection.query('DELETE FROM post2 where id = ?',[post_id], function(err, rows){
    if(err) throw err;
    connection.query('DELETE from reply2 where post_id = ?',[post_id],function(err, rows) {
      if(err) throw err;
      else
        res.send({status : 200, message : "삭제 성공!"});
    })
  })
})

app.get('/home/findPost/postDetail',function(req,res) {
  var post_id = req.url.substring(req.url.indexOf('?')+1).split('=')[1];
  var username = req.session.user.nickname;
  var lang = req.session.user.country;
  var user = req.session.user;
  console.log(username);
  console.log(post_id);
  connection.query('SELECT id, title, content, nickname, count FROM post2 WHERE id = ?',[post_id], function(err, rows){
    if(err) throw err;
    connection.query('SELECT * from reply2 where post_id = ?',[post_id], function(err, results2) {
      if(err) throw err;
      
      if(results2.length > 0) {
        console.log(rows);
        res.render('findPost_Detail',{rows:rows, username : username, lang : lang, rows2 : results2, user : user});
      } else {
        res.render('findPost_Detail',{rows:rows, username : username, lang : lang, user : user});
      }
    })
  })
})
app.get('/home/tutorList/',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('select A.department, A.id, A.profileImage, A.nickname, A.name, A.email, A.country ,B.Introduce, B.tutorSector, preferenceCountry from user A inner join tutorProfile B on A.id = B.profileUser_id where A.role = "TUTOR"', function(err, rows){
    if(err) throw err;
    res.render('tutorList', {rows:rows, lang : lang, user:user});
  })
})

app.get('/home/tutorList/tutorDetail', function(req, res) {
  const user_id = req.url.substring(req.url.indexOf('?')+1).split('=')[1];
  var user = req.session.user;
  var lang = req.session.user.country;
  connection.query('select A.profileImage, A.nickname, A.name, A.email, A.country ,B.Introduce, B.tutorSector, B.tutorDates, preferenceCountry from user A inner join tutorProfile B on A.id = B.profileUser_id where A.role = "TUTOR" AND A.id = ?',[user_id],function(err,rows){
    if(err) throw err;
    res.render('tutorDetail',{rows:rows, lang : lang, user: user});
  })
})

app.get('/user/checkGmail',function(req,res) {
  const user_email = req.query.email;
  connection.query('select password from user where email = ?',[user_email], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      res.send({status : 200, password : results[0].password});
    }
    else res.send({status : 500});
  })
})


app.get('/home/post/write',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  res.render('post_write',{lang : lang, user : user});
})
app.get('/home/findPost/write',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  res.render('findPost_write',{lang : lang, user : user});
})

app.get('/home/tutoringList/meeting',function(req, res) {
  var lang = req.session.user.country;
  var user = req.session.user;
  res.render('meetingPage',{lang : lang, user : user});
})

app.get('/Register', function(req, res) {
  res.render('Register.js');
})

app.get('/home/sendList/',function(req,res) {
  var user_id = req.session.user.id;
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('select B.nickname as targetUser, C.nickname as sendUser, A.content from tutoringRequest A join user B on A.targetUser_id = B.id join user C on A.sendUser_id = C.id where A.sendUser_id = ?',[user_id],function(err,results,field){
    if(err) throw err;
    if(results.length > 0) {
      res.render('sendList',{rows:results, lang : lang, user : user});
    } else {
      res.render('sendList',{lang : lang, user : user});
    }
  })
})

app.get('/Register/tutorProfile',function(req,res) {
  res.render('tutorProfile')
})

app.get('/trans', function (req, res) {
  res.render('translate.js')
});

app.get('/home/requestList/',function(req,res) {
  var user_id = req.session.user.id;
  var user = req.session.user;
  var lang = req.session.user.country;
  console.log(user_id);
  connection.query('select B.nickname as targetUser, C.nickname as sendUser, A.content from tutoringRequest A join user B on A.targetUser_id = B.id join user C on A.sendUser_id = C.id where A.targetUser_id = ?',[user_id],function(err,results,field){
    if(err) throw err;
    if(results.length > 0) {
      res.render('requestList',{rows:results,lang : lang,user : user});
    } else {
      res.render('requestList',{lang : lang, user : user});
    }
  })
})

app.get('/reply/write',function(req,res) {
  var post_id = req.query.post_id;
  var username = req.session.user.nickname;
  var currentTime = new Date();
  var current = currentTime.getFullYear() + '/' + currentTime.getMonth() + '/' + currentTime.getDate() + '/' + currentTime.getDay();
  console.log(JSON.stringify(currentTime));
  connection.query('INSERT INTO reply (content,date,nickname,post_id) VALUES(?,?,?,?)',[req.query.content, current, username, post_id], function(err,results,field) {
    if(err) throw err;
    res.send({status : 200});
  })
})
app.get('/reply/delete',function(req,res) {
  var reply_id = req.query.reply_id;

  connection.query('Delete from reply where id = ?',[reply_id],function(err, rows) {
    if(err) throw err;
    else res.send({status : 200, message : "삭제 성공"});
  })
})

app.get('/reply2/write',function(req,res) {
  var post_id = req.query.post_id;
  var username = req.session.user.nickname;
  var currentTime = new Date();
  var current = currentTime.getFullYear() + '/' + currentTime.getMonth() + '/' + currentTime.getDate() + '/' + currentTime.getDay();
  console.log(JSON.stringify(currentTime));
  connection.query('INSERT INTO reply2 (content,date,nickname,post_id) VALUES(?,?,?,?)',[req.query.content, current, username, post_id], function(err,results,field) {
    if(err) throw err;
    res.send({status : 200});
  })
})

app.get('/reply2/delete',function(req,res) {
  var reply_id = req.query.reply_id;

  connection.query('Delete from reply2 where id = ?',[reply_id],function(err, rows) {
    if(err) throw err;
    else res.send({status : 200, message : "삭제 성공"});
  })
})

app.get('/home/myProfile',function(req,res) {
  var user = req.session.user;
  res.render('myProfile',{userData : user});
})


app.get('/post/updateCount',function(req,res){
  var post_id = req.query.post_id;
  connection.query('UPDATE post SET count = count+1 WHERE id = ?',[post_id],function(err,results,field) {
    if(err) throw err;
    console.log(results);
  })
})
app.get('/findpost/updateCount',function(req,res){
  var post_id = req.query.post_id;
  connection.query('UPDATE post2 SET count = count+1 WHERE id = ?',[post_id],function(err,results,field) {
    if(err) throw err;
    console.log(results);
  })
})
app.get('/home/tutoringList/updateMeeting', function(req,res) {
  console.log(req.query.id);
  connection.query('update meeting SET status = "DO" WHERE tutoring_id = ?',[req.query.id], function(err,results) {
    if(err) throw err;
    else
      res.send({status : 200, message : "미팅 요청 수락에 성공했습니다."});
  })
})
app.get('/home/tutoringList/',function(req,res){
  var user_id = req.session.user.id;
  var username = req.session.user.nickname;
  var lang = req.session.user.country;
  var user = req.session.user;
  connection.query('select A.chatroom_id, A.id as id, A.tutorUser_id as targetUser_id, A.tuteeUser_id as sendUser_id, B.nickname as targetUser, C.nickname as sendUser, A.content from tutoring A left join user B on A.tutorUser_id = B.id left join user C on A.tuteeUser_id = C.id WHERE ? = B.id or ? = C.id or ? = B.id or ? = C.id;',[user_id,user_id,user_id,user_id], function(err,results,field){
    if(err) throw err;
    if(results.length>0) {
          res.render('tutoringList',{rows:results, lang : lang, username : username, user : user});
    } else {
      res.render('tutoringList',{lang : lang , username : username, user : user});
    }
  })
})
app.get('/home/tutoringList/getMeeting',function(req,res) {
  connection.query('select * from meeting where tutoring_id = ?',[req.query.id], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      res.send({status : 200, results : results});
    } else {
      res.send({status : 500});
    }
  })
})

app.get('/home/tutoringList/deleteMeeting',function(req,res) {
  connection.query('delete from meeting WHERE tutoring_id = ?',[req.query.id], function(err,results) {
    if(err) throw err;
    else
      res.send({status : 200, message : "미팅 종료에 성공했습니다."});
  })
})
app.get('/translate', function (req, res) {
  var api_url = 'https://openapi.naver.com/v1/papago/n2mt';
  var request = require('request');
  console.log(req.query)
  var options = {
      url: api_url,
      form: {'source':'ko', 'target': req.query.target, 'text':req.query.text},
      headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
   };
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      res.end(body);
    } else {
      res.status(response.statusCode).end();
      console.log('error = ' + response.statusCode);
    }
  });
});
app.get('/innerTranslate', function (req, res) {
  var api_url = 'https://openapi.naver.com/v1/papago/n2mt';
  var request = require('request');
  console.log(req.query)
  var options = {
      url: api_url,
      form: {'source': req.query.source , 'target': req.query.target, 'text':req.query.text},
      headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
   };
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
      res.end(body);
    } else {
      res.status(response.statusCode).end();
      console.log('error = ' + response.statusCode);
    }
  });
});

app.get('/detect', function (req, res) {
   var api_url = 'https://openapi.naver.com/v1/papago/detectLangs';
   var request = require('request');
   var options = {
       url: api_url,
       form: {'query': req.query.text},
       headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    };
   request.post(options, function (error, response, body) {
     if (!error && response.statusCode == 200) {
       res.writeHead(200, {'Content-Type': 'text/json;charset=utf-8'});
       res.end(body);
     } else {
       res.status(response.statusCode).end();
       console.log('error = ' + response.statusCode);
     }
   });
 });

app.get('/user/getUserId', function(request, response) {
  var user_id = request.query.id;

  connection.query('SELECT id FROM user WHERE id = ?',[user_id], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      response.send({status : 200, User_id : results[0].id});
    } else {
      response.send({status : 500, message : '조회 실패!'});
    }
  })
})
app.get('/home/tutoring/meeting/sendMeeting', function(request, response) {
  var sendUser = request.session.user.nickname;
  connection.query('SELECT * from meeting where sendUser = ? AND targetUser = ?',[sendUser, request.query.targetUser], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      response.send({status : 500, message : "이미 요청한 미팅이 존재합니다"});
    } else {
      connection.query('Insert into meeting(meetingDate, meetingContent, meetingPlace, meetingLocation, sendUser, targetUser, tutoring_id, status) VALUES(?,?,?,?,?,?,?,?)',[request.query.meetingDate, request.query.meetingContent, request.query.meetingPlace, request.query.meetingLocation, sendUser, request.query.targetUser, request.query.tutoring_id,'WAIT'], function(err, data) {
        response.send({status : 200, message : "요청 성공!"});
      })
    }
  })
})
app.get('/tutoring/request/accept', function(request, response){
  var targetUser = request.session.user.id;
  var currentTime = new Date();
  var current = currentTime.getFullYear() + '/' + currentTime.getMonth() + '/' + currentTime.getDate() + '/' + currentTime.getDay();

  connection.query("SELECT id FROM user WHERE nickname = ?",[request.query.sendUser], function(err, results, field){
    if(err) throw err;
    if(results.length > 0){
      console.log(targetUser, results[0].id, request.query.content);
      connection.query('INSERT INTO tutoring (tutorUser_id, tuteeUser_id, content, chatroom_id, meeting_id, startDate) VALUES(?,?,?,?,?,?)',[targetUser, results[0].id, request.query.content,results[0].id+ targetUser, results[0].id+ targetUser, current], function(err, data){
        if(err) throw err;
        status = 200;
        connection.query('DELETE FROM tutoringRequest WHERE targetUser_id = ?',[targetUser]);
        response.send({status : status, message : "요청 성공"});
      })
    } else {
        status = 500;
        response.send({status : status, message : "요청 실패"});
    }
  })
})
app.get('/tutoring/request', function(request, response) {
  var query = request.query;
  console.log(query);
  connection.query('SELECT * from user WHERE id = ?',[query.targetUser], function(err,results,field) {
    if(err) throw err;
    if(results.length > 0){
      connection.query('INSERT INTO tutoringRequest (sendUser_id, targetUser_id, content) VALUES(?,?,?)',[request.session.user.id, query.targetUser, query.comment], function(err, data){
        status = 200;
        response.send({status : status, message : "요청 성공"});
      })
    } else {
        status = 500;
        response.send({status : status, message : "요청 실패"});
    }
    }
  )
})

app.get('/board/write', function (request, response) {
  var username= request.session.user.nickname;
  console.log(username);
  connection.query('SELECT * FROM user WHERE nickname = ?', [username], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      connection.query('INSERT INTO post (nickname, title, content, count) VALUES(?,?,?,?)',[username, request.query.title, request.query.content, 0], function(err, data){
        status = 200;
        response.send({status : 200, message : "게시글 작성 성공!"});
      })
    } else {
      response.send({status : 500, message : "정보가 확인되지 않은 User가 접근했습니다!"});
    }
  }
)
})
app.get('/board2/write', function (request, response) {
  var username= request.session.user.nickname;

  connection.query('SELECT * FROM user WHERE nickname = ?', [username], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      connection.query('INSERT INTO post2 (nickname, title, content, count) VALUES(?,?,?,?)',[username, request.query.title, request.query.content, 0], function(err, data){
        status = 200;
        response.send({status : 200, message : "게시글 작성 성공!"});
      })
    } else {
      response.send({status : 500, message : "정보가 확인되지 않은 User가 접근했습니다!"});
    }
  }
)
})
app.get('/auth/SignUp',async function (request, response) {
  var query = request.query;
    connection.query('SELECT * FROM user WHERE email = ?', [query.email], function(err, results, field) {
      if(err) throw err;
      if(results.length <= 0) {
        connection.query('INSERT INTO user (nickname, name, password, email, country, department, profileImage, role) VALUES(?,?,?,?,?,?,?,?)',[query.nickname, query.name, query.password, query.email, query.country,query.department,query.profileImage,query.role], function(err, data){
          status = 200;
          response.send({status : 200, message : "사용자 정보 생성 완료"});
        })
      } else {
          status = 500;
          response.send({status : 500, message : "생성 실패"});
      }
    })
    connection.query('SELECT id FROM user WHERE email = ?', [query.email], function(err, results, field) {
      if(err) throw err;
      if(results.length > 0) {
        console.log(results);
      }})
})

app.get('/auth/SignUp2',async function (request, response) {
  var query = request.query;
  
  connection.query('SELECT * FROM user WHERE email = ?', [query.email], function(err, results, field) {
    if(err) throw err;
    if(results.length <= 0) {
      connection.query('INSERT INTO user (nickname, name, password, email, country, department, profileImage, role) VALUES(?,?,?,?,?,?,?,?)',[query.nickname, query.name, query.password, query.email, query.country,query.department,query.profileImage,query.role], function(err, data){
        status = 200;

      })
    } else {
        status = 500;

    }
  })
  connection.query('SELECT id FROM user WHERE email = ?', [query.email], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      console.log("이거 맞냐?");
      connection.query('INSERT INTO tutorProfile (profileUser_id, introduce, tutorSector, preferenceCountry, tutorDates) VALUES(?,?,?,?,?)',[results[0].id, query.Introduce, query.tutorSector, query.preferenceCountry, "null"], function(err, data){
        status = 200;
        response.send({status : 200, message : "사용자 정보 생성 완료"});
      })
    } else {
      status = 500;
      response.send({status : 500, message : "생성 실패"});
    }  
  })
})


app.get('/auth/SignIn',async function (request, response) {
  var query = request.query;
  connection.query('SELECT * FROM user WHERE email = ? AND password = ?', [query.email, query.password], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      request.session.user = results[0];
      request.session.displayName = results[0];
      request.session.save();
      response.send({status : 200, message : "로그인에 성공"});
        console.log(request.session);
    } else {
      response.send({status : 500, message : "로그인에 실패"});
    }
  })
})

module.exports = app;
