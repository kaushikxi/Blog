const express = require("express");
const app = express();
const userModel = require(`./models/user`);
const postModel = require(`./models/post`);
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");





app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());





app.get("/", (req,res)=>{
    res.render("index");
})




app.get("/login", (req,res)=>{
    res.render("login");
})




app.post("/register",async (req,res)=>{
    let {username,name,age,email,password} = req.body;

    let user = await userModel.findOne({email});
    if(user) return res.status(500).send("User already registered");

    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async (err,hash)=>{
            let user = await userModel.create({
                username,
                name,
                age,
                email,
                password: hash,
            });

            let token = jwt.sign({email:email, userid: user._id},'shhh');
            res.cookie("token",token);
            res.send("Registered");
        })
    })
})



app.post("/post",isLoggedin,async (req,res)=>{        //protected route
    let user = await userModel.findOne({email: req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user: user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});



app.get("/profile", isLoggedin,async (req,res)=>{        //protected route
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile",{user});
})



app.get("/like/:userid", isLoggedin,async (req,res)=>{        //protected route
    let post = await postModel.findOne({_id: req.params.userid}).populate("user");
    
     //console.log(req.user) to find out userid
    if(post.likes.indexOf(req.user.userid)===-1){ // if a user hasn't like a post before
        post.likes.push(req.user.userid); 
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1); // splice means to remove the userid from the post by 1 like
    }
    await post.save();
    res.redirect("/profile");
})






app.get("/edit/:userid", isLoggedin,async (req,res)=>{        
    let post = await postModel.findOne({_id: req.params.userid}).populate("user");
    
    res.render("edit", {post}); 
})






app.post("/update/:userid", isLoggedin,async (req,res)=>{        
    let post = await postModel.findOneAndUpdate({_id: req.params.userid},{content:req.body.content});
    
    res.redirect("/profile");
})






app.post("/login",async (req,res)=>{

    let {email,password} = req.body;
    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something went wrong");

    bcrypt.compare(password,user.password, (err,result)=>{
        
        if(result){
             let token = jwt.sign({email:email, userid: user._id},'shhh');
             res.cookie("token",token);
             res.status(200).redirect("/profile");
        }
        else res.redirect("/login");
    })

})


app.get("/logout",(req,res)=>{
    res.cookie("token","");
    res.redirect("/login");
})


function isLoggedin(req,res,next){
    if(req.cookies.token === ""){
        res.status(500).redirect("/login");
    }
    else{
        let data = jwt.verify(req.cookies.token,'shhh');
        req.user = data; // this data contains the user email and userid from the browserand sends it to req.user
        next();
    }
}


app.listen(3000);