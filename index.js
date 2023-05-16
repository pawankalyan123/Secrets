require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const bcrypt=require('bcrypt');
const saltRounds=10;
const mongoose=require('mongoose');
const session=require('express-session');
const app=express();
const secretKey=process.env.SECRET;
const GOOGLE_CLIENT_ID=process.env.CLIENT_ID;
const GOOGLE_CLIENT_SECRET=process.env.CLIENT_SECRET;
const Mongo_Password=process.env.MongoPassword;
const PORT=process.env.PORT || 3000;
const jwt=require('jsonwebtoken');
const passport=require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
mongoose.set('strictQuery',false);

app.use(bodyParser.urlencoded({extended:false}));
app.use('/public',express.static('public'));
app.set('view engine','ejs');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(`mongodb+srv://venkatpwn:${Mongo_Password}@cluster0.vgde88u.mongodb.net/Secrets`);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}
const UserSchema=mongoose.Schema({
    Email:String,
    Password:String,
    googleId:String,
    Secret:String
});
UserSchema.plugin(findOrCreate);
app.use(session({
    secret:secretKey,
    resave:false,
    saveUninitialized:false,
    cookie:{
         maxAge:2592000000
    }
}));

const User=mongoose.model('User',UserSchema);

passport.serializeUser((user, done) => {
    done(null, user.id);
  });

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
});
  
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "https://perfect-pink-puppy.cyclic.app/auth/google/PostSecrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, profile);
    });
  }
));
app.get('/',(req,res)=>{
    res.render('home')
});
app.get('/register',(req,res)=>{
    res.render('register',{alert:""});
});
app.get('/login',(req,res)=>{
    res.render('login',{alert:""});
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'] }));

app.get('/auth/google/PostSecrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    User.findOne({googleId:req.user.id},(err,result)=>{
       if(err){console.log(err);}
       else{
        const token=jwt.sign({email:req.user.emails[0].value,id:result.id},secretKey);
        req.session.token=token;
        res.redirect('/PostSecrets');
       }
    })
});

app.get('/PostSecrets',(req,res)=>{
   res.render('PostSecrets',{alert:''});   
});
app.get('/secrets',(req,res)=>{
    User.find({"Secret":{$ne:null}},(err,users)=>{
        if(err){console.log(err);}
        else{
            res.render('secrets',{SecretsList:users});
        }
    })
})
app.post('/register',(req,res)=>{
    
    User.findOne({Email:req.body.email},(err,result)=>{
        if(err){console.log(err);}
        else if(result)
        {
            res.render('register',{alert:"EmailId is already registerd..Please Login"});
        }
        else if(req.body.password!=req.body.Confirm_password)
        {
            res.render('register',{alert:"Password and Confirm Password are not same!"});
        }
        else{
            bcrypt.hash(req.body.password,saltRounds,(err,hash)=>{
                const user=User({
                    Email:req.body.email,
                    Password:hash
                });
                user.save();
                res.redirect('/login');    
            })
            }    
    });
});
app.post('/login',(req,res)=>{

      User.findOne({Email:req.body.email},(err,result)=>{
        if(err){console.log(err);}
        else
        {
            if(!result){res.render('login',{alert:"EmailId is not Registered..Please Register"});}
            else{
            bcrypt.compare(req.body.password,result.Password,(err,result1)=>{
                if(result1)
                {
                    const token=jwt.sign({email:req.body.email,id:result.id},secretKey);
                    req.session.token=token;
                    res.redirect('/PostSecrets');
                }
                else{res.render('login',{alert:"Incorrect Password..Please try again."});}
            });}
        }
      })
    
});
app.post('/submit',(req,res)=>{
    
    jwt.verify(req.session.token,secretKey,(err,decoded)=>{
        if(err){console.log(err);
          res.render('PostSecrets',{alert:'You are not logged in,Please Login!'});}
        else{
            const SecretText=req.body.SecretText;
            
            User.findOneAndUpdate({_id:decoded.id},{$set:{Secret:SecretText}},(err,user)=>{
                if(err){console.log(err);}
                else{res.redirect('/secrets');}
            })   
            
            }
        })
});
app.get('/animations.js', function(req, res) {
    res.set('Content-Type', 'text/javascript');
    res.sendFile(__dirname + '/animations.js');
});
  
app.get('/logout',(req,res)=>{
    req.session.destroy();
    res.redirect('/login');
});
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("listening for requests");
    })
});
