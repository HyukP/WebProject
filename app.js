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
var registerRouter = require('./routes/Register');
var translater = require('./public/javascripts/translate');
const { response } = require('express');
const { MemoryStore } = require('express-session');

var client_id = '7HK9tPsLi9yFUjvwDzx1';
var client_secret = '6uWchEawHA';
var app = express();
let status = 0;

var sessionObject = {
  secret : 'Jello',
  resave : false,
  saveUninitialized : true,
  store : new MemoryStore({ checkPeriod : 1000 * 60}),
  cookie : {
    maxAge : 1000 * 60,
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
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/start', pageRouter);
app.use('/Register',registerRouter);
app.use('/trans',translater);

var db_info = {
  host : 'localhost',
  port : '3306',
  user : 'root',
  password : '@Altmxpfl12',
  database : 'Autor'
};

var connection = db.createConnection(db_info);
  connection.connect((err)=> {
    if(err) {
      console.log(err);
      return;
    }
    console.log("my sql connected");
  })

app.get('/start', function(req, res) {
  res.render('start.js')
})
app.get('/home/',function(req, res) {
  res.render('home');
})

app.get('/home/post/',function(req, res) {
  connection.query('SELECT title, content, nickname, count FROM post', function(err, rows){
    if(err) throw err;
    res.render('post', {rows:rows});
  })
})
app.get('/home/tutorList/',function(req, res) {
  connection.query('select A.nickname, A.name, A.email, A.country ,B.Introduce, B.tutorSector, preferenceCountry from user A inner join tutorProfile B on A.id = B.profileUser_id where A.role = "TUTOR"', function(err, rows){
    if(err) throw err;
    res.render('tutorList', {rows:rows});
  })
})

app.get('/home/tutorList/tutorDetail', function(req, res) {
  const user_id = req.url.substring(req.url.indexOf('?')+1).split('=')[1];
  connection.query('select A.nickname, A.name, A.email, A.country ,B.Introduce, B.tutorSector, preferenceCountry from user A inner join tutorProfile B on A.id = B.profileUser_id where A.role = "TUTOR" AND A.id = ?',[user_id],function(err,rows){
    if(err) throw err;
    res.render('tutorDetail',{rows:rows});
  })
})

app.get('/home/post/write',function(req, res) {
  res.render('post_write');
})

app.get('/Register', function(req, res) {
  res.render('Register.js')
})

app.get('/Register/tutorProfile',function(req,res) {
  res.render('tutorProfile')
})

app.get('/trans', function (req, res) {
  res.render('translate.js')
});

app.get('/home/requestList/',function(req,res) {
  var user_id = req.session.user.id;
  console.log(user_id);
  connection.query('select B.nickname as targetUser, C.nickname as sendUser, A.content from tutoringRequest A left join user B on ? = B.id left join user C on A.sendUser_id = C.id WHERE A.sendUser_id != ?;',[user_id,user_id],function(err,results,field){
    if(err) throw err;
    if(results.length>0) {
      res.render('requestList',{rows:results});
    } else {
      res.render('requestList');
    }
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
app.get('/detect', function (req, res) {
   var api_url = 'https://openapi.naver.com/v1/papago/detectLangs';
   var request = require('request');
   var options = {
       url: api_url,
       form: {'query': req.query},
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
  var email = request.query.email;

  connection.query('SELECT id FROM user WHERE email = ?',[email], function(err, results, field) {
    if(err) throw err;
    if(results.length > 0) {
      response.send({status : 200, User_id : results[0].id});
    } else {
      response.send({status : 500, message : '조회 실패!'});
    }
  })
})

app.get('/tutoring/request/accept', function(request, response){
  var targetUser = request.session.user.id;

  connection.query("SELECT id FROM user WHERE nickname = ?",[request.query.sendUser], function(err, results, field){
    if(err) throw err;
    if(results.length > 0){
      console.log(targetUser, results[0].id, request.query.content);
      connection.query('INSERT INTO tutoring (tutorUser_id, tuteeUser_id, content) VALUES(?,?,?)',[targetUser, results[0].id, request.query.content], function(err, data){
        status = 200;
        response.send({status : status, message : "요청 성공"});
      })
      connection.query('DELETE FROM tutoringRequest WHERE targetUser_id = ?',[targetUser]);
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
app.get('/auth/SignUp',async function (request, response) {
  var query = request.query;
    connection.query('SELECT * FROM user WHERE email = ?', [query.email], function(err, results, field) {
      if(err) throw err;
      if(results.length <= 0) {
        connection.query('INSERT INTO user (nickname, name, password, email, country, department, profileImage, role) VALUES(?,?,?,?,?,?,?,?)',[query.nickname, query.name, query.password, query.email, query.country,"null","null",query.role], function(err, data){
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
      connection.query('INSERT INTO user (nickname, name, password, email, country, department, profileImage, role) VALUES(?,?,?,?,?,?,?,?)',[query.nickname, query.name, query.password, query.email, query.country,"null","null",query.role], function(err, data){
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
      response.send({status : 200, message : "로그인에 성공"});
      console.log(request.session);
    } else {
      response.send({status : 500, message : "로그인에 실패"});
    }
  })
})

module.exports = app;
