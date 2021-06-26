require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const pickupLines = require("./pickup");
const dbConnect = require("./dbConnect");

const app = express();  
const PORT = process.env.PORT || 3000; 

const { Schema } = mongoose;

const timeDiff = 3600*24*6;
let sendMailTimer;

const indexSchema = new Schema({
    "index": {
        "type": "Number"
    },
    "last" : {
        "type" : "Number"
    }
});

const Index = mongoose.model("index", indexSchema);


const transporter = nodemailer.createTransport({
 service: 'gmail',
 
 auth: {
        user: process.env.SENDER,
        pass: process.env.USERPASSWORD
    }
});

dbConnect.then(() => {

    sendMailTimer = setInterval(()=> {
        const thisDay = new Date();
        if(thisDay.getDay() == 6) {
            calculateTiming();
        }
    }, 21600000);
    
});


function getMyTimeNow() {
    return Math.floor(Date.now()/1000);
}

function isMailTime(rightNow, lastTime) {
    const newDiff = rightNow - lastTime; 
    if(newDiff >= timeDiff) {
      return true; 
    } 
    return false;
}


async function calculateTiming() {
    const lastPickup = await Index.find({},(err, indexes) => {
        if(err) {
            console.log(err);
        } else {
            console.log(indexes);
            return indexes;
        }
    });

    const lastIndex = lastPickup[0].index;
    const lastTime = lastPickup[0].last;

    console.log(lastPickup,lastIndex,lastTime);
    let rightNow = getMyTimeNow();
    let bSend = isMailTime(rightNow, lastTime);

    if (lastIndex < 180) {          
        if(bSend) {
            let line = pickupLines[lastIndex + 1];
            sendMyMail(line, lastIndex, rightNow);
        }    
    } else {
        clearInterval(sendMailTimer);
    }
}



function sendMyMail(line, lastIndex, rightNow) {

    const mailOptions = {
        from: process.env.SENDER, 
        to: process.env.RECEIVER, 
        subject: 'PicKupLine '+(lastIndex + 1)+'👼', 
        html: '<h3 style="color:#ba070d">Dear '+ process.env.Name +' !👸❣</h3><p><strong>'+ line +'</strong> 👼<p>'
      };

      transporter.sendMail(mailOptions, function (err, info) {
         if(err)
           console.log(err)
         else {
            console.log(info);
            Index.replaceOne({index : lastIndex}, {index : lastIndex + 1, last : rightNow}, (err, res)=> {
                if(err) {
                    console.log(err);
                }
            });  
         } 
      });
      
}


app.get("/", (req, res) => {  

  return res.send({
    status: "Healthy",
  });

});

app.listen(PORT, () => {
  console.log("Server started listening on port : ", PORT);
});