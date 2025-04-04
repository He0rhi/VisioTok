const fs = require("fs");
const express = require("express");
const https = require("https");
const cors = require("cors");

const SSL_KEY_PATH = "./ssl/localhost-key.pem";
const SSL_CERT_PATH = "./ssl/localhost.pem";

const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH),
};

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));
const users = new Map();

app.post('/register', (req,res)=>{
    const {nickname, webrtcID} = req.body;

    if(!nickname||!webrtcID){
        return res.status(400).json({error:'Потерян ник или id'});
    }

    users.set(nickname, webrtcID);
    console.log('Пользователь '+ nickname + ', WEBID ' + webrtcID+ ' вошел в приложение');
    console.log('Список пользователей '+'\n');
    users.forEach((a)=> console.log(a));
    res.json({success:true});
})
app.delete('/register',(req,res)=>{
  
    const { nickname } = req.body; 
    if(users.has(nickname)){
        users.delete(nickname);
        console.log('Пользователь '+nickname+' вышел из приложения');
        console.log('Список пользователей '+'\n');
        users.forEach((a)=> console.log(a));

        return res.json({success:true});

    }
    else{
        console.log('Пользователя нет')
    }
    res.status(404).json('Пользователь не найден');

})
app.get('/register',(req,res)=>{
    try{        

   let nickname = req.query.nickname;
   console.log('Поиск пользователя ' +nickname)
   console.log('из списка пользователей ')
   users.forEach((a)=>{
    console.log(a)

   })

    webrtcID = users.get(nickname.toString());
    if(webrtcID){
        console.log('Пользователь ' +nickname + ' найден')

      return res.json({nickname, webrtcID});
    }
    return res.json("Пользователь с никнеймом " + nickname+" не в сети");

}
catch(e){
console.log(e.toString());
}
})

const PORT = 5001;
https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
  console.log(`Nickname server is running on https://0.0.0.0:${PORT}`);
});
