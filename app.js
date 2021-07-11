require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const mongoose = require("mongoose");
const pickupLines = require("./pickup");
const dbConnect = require("./dbConnect");
const http = require("http");

const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const app = express();
const PORT = process.env.PORT || 3000;

const { Schema } = mongoose;

const timeDiff = process.env.TIME_DIFF;
const dayToSend = process.env.DAY_TO_SEND;

let sendMailTimer;

const indexSchema = new Schema({
    index: {
        type: "Number",
    },
    last: {
        type: "Number",
    },
});

const Index = mongoose.model("index", indexSchema);

dbConnect.then(() => {
    sendMailTimer = setInterval(() => {
        const thisDay = new Date();
        if (thisDay.getDay() == dayToSend) {
            calculateTiming();
        }
    }, process.env.INTERVAL_TIME);
});

function getMyTimeNow() {
    return Math.floor(Date.now() / 1000);
}

function isMailTime(rightNow, lastTime) {
    const newDiff = rightNow - lastTime;
    if (newDiff >= timeDiff) {
        return true;
    }
    return false;
}

async function calculateTiming() {
    const lastPickup = await Index.find({}, (err, indexes) => {
        if (err) {
            console.log(err);
        } else {
            return indexes;
        }
    });

    const lastIndex = lastPickup[0].index;
    const lastTime = lastPickup[0].last;

    let rightNow = getMyTimeNow();
    let bSend = isMailTime(rightNow, lastTime);

    if (lastIndex < pickupLines.length - 1) {
        if (bSend) {
            let line = pickupLines[lastIndex + 1];
            sendMyMail(line, lastIndex, rightNow);
        }
    } else {
        clearInterval(sendMailTimer);
    }
}

async function sendMyMail(line, lastIndex, rightNow) {
    try {
        const accessToken = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.SENDER,
                clientId: process.env.CLIENT_ID,
                clientSecret: process.env.CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        const mailOptions = {
            from: process.env.SENDER,
            to: process.env.RECEIVER,
            subject: "PickupLine " + (lastIndex + 2) + "👼",
            html: '<h3 style="color:#ba070d">Dear ' + process.env.NAME + " !👸❣</h3><p><strong>" + line + "</strong> 👼<p>",
        };

        transporter.sendMail(mailOptions, function (err, info) {
            if (err) console.log(err);
            else {
                console.log(info);
                Index.replaceOne({ index: lastIndex }, { index: lastIndex + 1, last: rightNow }, (err, res) => {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
}

app.get("/", (req, res) => {
    return res.send({
        status: "Healthy",
    });
});

//prevent dyno from sleeping
function startKeepAlive() {
    setInterval(function () {
        let options = {
            host: "love-mailer.herokuapp.com",
            port: 80,
            path: "/",
        };
        http.get(options, function (res) {
            res.on("data", function (chunk) {
                try {
                    // console.log("HEROKU RESPONSE: " + chunk);
                } catch (err) {
                    console.log(err.message);
                }
            });
        }).on("error", function (err) {
            console.log("Error: " + err.message);
        });
    }, 20 * 60 * 1000);
}

app.listen(PORT, () => {
    console.log("Server started listening on port : ", PORT);
    startKeepAlive();
});
