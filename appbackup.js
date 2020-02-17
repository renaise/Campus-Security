var express = require('express');
var app = express();
var io = require('socket.io')(server);
var path = require('path');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
var mongodb = require('mongodb');
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var MongoClient = require('mongodb').MongoClient;
var server = require('http').createServer(app);
var db = mongoose.connection;
const port = 3007;
const flash = require('connect-flash');
const { ensureAuthenticated } = require('./views/config/auth');
var User = require('./lib/User.js');
var session = require('express-session');

require('./views/config/passport')(passport);
urldb = 'mongodb://admin:admin123@ds237955.mlab.com:37955/umslhack';

// db.myusers.find({"skills":{"$in":["bevel"]}})

// connect to database
mongoose.connect(urldb, {
  useNewUrlParser: true
}).then(() => {
  console.log('Connected')
}).catch(err => {
  console.error(err);
  process.exit(1);
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


// express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// use flash
app.use(flash());

// global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});


//passport authentication
// passport.use(new LocalStrategy(
//   function(email, password, done) {
//     User.findOne({ email: email }, function(err, user) {
//       if (err) {
//         return done(err);
//       }
//       if (!user) {
//         return done(null, false, { message: 'Incorrect Email.' });
//       }
//       if (!user.validPassword(password)) {
//         return done(null, false, { message: 'Incorrect password.' });
//       }
//       return done(null, user);
//     });
//   }
// ));


passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
  done(err, user);
});
});

// login
app.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// logout
app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/login');
});

app.use(passport.initialize());
app.use(passport.session());


// login post req
// app.post('/login', passport.authenticate('local', {successRedirect:'/', failureRedirect:'/login'}),
//  function(req, res){
//    res.redirect('/');
//     email = req.body.email;
//     password = req.body.password;
// // MongoClient.connect(urldb, function(err, db){
// //     var dbo = db.db('UserSystem');
// //     var query = {email: email, password: password}
// //     dbo.collection('myusers').findOne(query, function(err, user){
// //       if(err){
// //         throw err;
// //       }
// //       if(!user){
// //         console.log('Not found');
// //       }
// //       else {
// //         console.log('Found!');
// //         res.redirect('/');
// //       }
// //   })
// //     db.close();
// //   })
// });

// necessary to operate
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/views'));
app.get('/views/js',function(req,res){
    res.sendFile(path.join(__dirname + '/js'));
});


app.get('/', function(req, res) {
    res.render('pages/index');
});

// register post req
app.post('/register', function (req, res) {
    var email = req.body.email;
    console.log(email + " Just Registered!")
    var password = req.body.password;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    var skills = req.body.skills;

    var newuser = new User({
      email: email,
      password: password,
      firstname: firstname,
      lastname: lastname,
      skills: JSON.parse(skills)
    });

    User.find({
      email: email
    }).then(doc => {
      console.log(doc);
      if(doc.length > 0) {
        // user already exists
        res.status(200).json({
          success: false,
          message: 'User already exists'
        })
      } else {
        newuser.save(function(err,savedUser) {
          if(err){
            console.log(err);
            return res.status(500).send();
          }
          return res.status(200).send();
        })
      }
    })

});

// register get req
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/register.ejs'));
});


app.get('/', ensureAuthenticated, (req, res) =>
  res.render('pages/dashboard.ejs', {
    user: req.user
})
);

app.get('/news', (req, res, next) => {
  res.render('pages/news.ejs');
});

app.get('/contact', (req, res, next) => {
  res.render('pages/contact.ejs');
});

app.get('/login', (req, res, next) => {
  res.render('pages/login.ejs');
});

app.get('/register', (req, res, next) => {
  res.render('pages/register.ejs');
})

app.get('/dashboard', (req, res, next) => {
  res.render('pages/dashboard.ejs');
})

app.get('/search', (req, res, next) => {
  res.render('pages/search.ejs');
})

//needed to run correctly
app.use(express.urlencoded({extended: false}));
app.use(express.json());

// namespaces and room assignments
var nspDefault = io.of('/default');

nspDefault.on('connection', function(socket) {
  console.log('Client has connected');
  socket.emit('roomQuery');
  socket.on('room', function(roomAssignment) {
    console.log(roomAssignment)
    socket.join(roomAssignment);
    socket.room = roomAssignment;
  })

  socket.on('message', function(messageData) {
    console.log(messageData);
    console.log(socket.room)
    nspDefault.in(socket.room).emit('message', messageData);
  })
})

nspDefault.on('message', function(messageData) {
  nspDefault.to('')
})

// server listen
server.listen(port, '127.0.0.1', function() {
  console.log('Listening on ' + port)
});

module.exports = app;
