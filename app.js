var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
const mongoose = require('mongoose');
var mongodb = require('mongodb');
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;
var MongoClient = require('mongodb').MongoClient;
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var db = mongoose.connection;
const port = 3000;
const flash = require('connect-flash');
const { ensureAuthenticated } = require('./views/config/auth');
var User = require('./lib/User.js');
var session = require('express-session');
require('./views/config/passport')(passport);
urldb = 'mongodb://admin:admin123@ds237955.mlab.com:37955/umslhack';
const staticDir = '/Users/micah1711/Programming/sluhumslhack/views'

const locateIntruder = require('./intruderAnalytics.js').locateIntruder

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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

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

passport.serializeUser(function(user, done) {
done(null, user.id);
});

passport.deserializeUser(function(id, done) {
User.findById(id, function(err, user) {
  done(err, user);
});
});

///location socket stuff BEGIN
var locationDataList = [];
var timeout = 5;
var open = true;

io.on('connection', function(socket) {

  socket.on('locationUpdate', function(locationData) {

    if (locationDataList.length == 0) {
      setTimeout(function() {
        console.log('started')
        open = false;
        var intruderUpdate = locateIntruder(locationDataList);
        io.emit('intruderUpdate', intruderUpdate);
      }, 5000);
    }

    if (locationData.answer == 'yes' && open) {
      io.emit('markerUpdate', locationData);
      locationDataList.push([locationData.latitude, locationData.longitude]);
      console.log('data pushed');
    }
  });
});
///location socket stuff END



// login
app.post('/login', (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;
console.log(email);
console.log(password);

  User.getUserByUsername(email, (err, user) => {
    if(err) throw err;
    if(!user) {
      return res.json({success: false, msg: 'User not found'});
    }

    User.comparePassword(password, user.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        return res.send({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email
          }
        })
      } else {
        return res.send({success: false, msg: 'Wrong password'});
      }
    });
  });
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
app.use('/staticfiles', express.static(staticDir + '/pages'));


app.get('/', function(req, res) {
    res.render('pages/index');
});

// register post req
app.post('/register', function (req, res) {
    var email = req.body.email;
    console.log(email + " Just Registered!")
    var password = req.body.password;

    var newuser = new User({
      email: email,
      password: password,
    });

    // User.find({
    //   email: email
    // }).then(doc => {
    //   console.log(doc);
    //   if(doc.length > 0) {
    //     // user already exists
    //     res.status(200).json({
    //       success: false,
    //       message: 'User already exists'
    //     })
    //   } else {
    //     newuser.save(function(err,savedUser) {
    //       if(err){
    //         console.log(err);
    //         return res.status(500).send();
    //       }
    //       return res.status(200).send();
    //     })
    //   }
    // })

    User.addUser(newuser,(err =>{
      if(err){
        res.json({success:false,msg:"Something went wrong"})
      }else{
        res.json({success:true,msg:"Registered"})

      }
    }))

});

// register get req
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+'/register.ejs'));
});

app.get('/studentView', function(req, res) {
  res.render('pages/studentView.ejs')
})

app.get('/adminView', function(req, res) {
  res.render('pages/adminView.ejs')
})

app.get('/', ensureAuthenticated, (req, res) =>
  res.render('pages/index.ejs', {
    user: req.user
})
);

// app.get('/',function(req,res){
//   res.render('pages/index.ejs');
//   user: req.user
// });

app.get('/login', (req, res, next) => {
  res.render('pages/login.ejs');
});


app.get('/map', (req, res, next) => {
  res.render('pages/map.ejs');
});

app.get('/register', (req, res, next) => {
  res.render('pages/register.ejs');
})



app.get('/search', (req, res, next) => {
  res.render('pages/search.ejs');
})

//needed to run correctly
app.use(express.urlencoded({extended: false}));
app.use(express.json());


app.get('/map', (req, res, next) => {
  res.render('pages/map.ejs');
});

app.get('/register', (req, res, next) => {
  res.render('pages/register.ejs');
})

app.get('/contact', (req, res, next) => {
  res.render('pages/contact.ejs');
})

app.get('/home', (req, res, next) => {
  res.render('pages/home.ejs');
})

app.get('/info', (req, res, next) => {
  res.render('pages/info.ejs');
})

app.get('/dashboard', (req, res, next) => {
  res.render('pages/dashboard.ejs');
})

// server listen
server.listen(port, '127.0.0.1', function() {
  console.log('Listening on ' + port)
});

module.exports = app;
