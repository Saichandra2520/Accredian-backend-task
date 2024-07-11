const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
require('dotenv').config();
var cors = require('cors');
const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET,REDIRECT_URI);
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN});





const app = express();
app.use(cors());
const prisma = new PrismaClient();

app.use(bodyParser.json());


app.get('/api/referrals', async (req, res) => {
    try {
      const referrals = await prisma.referral.findMany();
      console.log(referrals)
      res.status(200).json(referrals);
    } catch (error) {
      res.status(500).send({ error: 'An error occurred while fetching the referrals' });
    }
  });

app.post('/api/referrals', async (req, res) => {
  const {
    name,
    email,
    mobileNumber,
    courseInterested,
    referalId,
  } = req.body;

  if (!name || !email || !mobileNumber || !referalId || !courseInterested) {
    return res.status(400).send({ error: 'All fields are required' });
  }

  try {
    // Check if the referral already exists
    const existingReferral = await prisma.referral.findFirst({
        where: {
          email: email,
          referalId: referalId,
        },
      });
  
    if( existingReferral ){
        return res.status(400).send({ error: 'Email already exists' });
    }

    else{
    const referral = await prisma.referral.create({
      data: {
        name,
        mobileNumber,
        email,
        referalId,
        courseInterested
      },
    });

    // Send referral email
   async function sendMail(referral){
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'saichandra2520@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken
            }
        })

        const mailOptions = {
            from: 'Accredian Refer <saichandra2520@gmail.com>',
            to: email,
            subject: 'Regarding Accredian Referal',
            text:'Hello from accredian',
            html: `<p>You are referred to the course ${courseInterested}.Thank you for your interest in our courses.</p>`
        }

        const result = await transport.sendMail(mailOptions);
        return result;
    }
    catch (error){
            return error;
    }
   }
  
   sendMail().then((result) => console.log('Email sent...', result)).catch((error) => console.log(error));
  }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: 'An error occurred while processing your request' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
