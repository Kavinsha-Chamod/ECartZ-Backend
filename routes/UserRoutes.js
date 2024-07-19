const express = require('express');
const bcrypt = require('bcrypt');
const admin = require('../config/firebase');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Configure Nodemailer to use Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kavinshachamod11@gmail.com',
    pass: 'uulg zivz eqyd ckfe ',
  },
});

// Function to generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Function to encode email for Firebase key
const encodeEmailForFirebaseKey = (email) => {
  return encodeURIComponent(email.replace('.', '_dot_'));
};

// Endpoint to send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const otp = generateOTP();

    // Encode email for Firebase key
    const encodedEmail = encodeEmailForFirebaseKey(email);

    // Save OTP in the Realtime Database with encoded email as key
    await admin.database().ref(`otps/${encodedEmail}`).set({
      otp,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });

    // Send OTP via email
    const mailOptions = {
      from: '"E-Cartz App" no-replymail@gmail.com',
      to: email,
      subject: 'Email Verification Code',
      html: `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <p>Dear Valuable Customer,</p>
        <p>Your OTP code is <strong>${otp}</strong><br></br>If you didn’t ask to verify this address, you can ignore this email.</p>
        <p>Thanks,<br></br>E-Cartz App Team.</p>
      </body>
    </html>
  `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send('OTP sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending OTP');
  }
});

// Endpoint to verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email) {
    return res.status(400).send('Email cannot be empty');
  }
  if (!otp) {
    return res.status(400).send('OTP cannot be empty');
  }

  try {
    // Encode email for Firebase key
    const encodedEmail = encodeEmailForFirebaseKey(email);

    const otpSnapshot = await admin.database().ref(`otps/${encodedEmail}`).once('value');
    const otpData = otpSnapshot.val();

    if (!otpData) {
      return res.status(400).send('OTP code is invalid');
    }

    const now = Date.now();
    const otpTimestamp = otpData.timestamp;

    if (otp !== otpData.otp || (now - otpTimestamp) > 60000) { // OTP is valid for 1 minutes
      return res.status(400).send('Invalid or expired OTP');
    }

    res.status(200).send('OTP verified successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error verifying OTP');
  }
});

router.post('/send-reset-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send('Email cannot be empty');
  }

  try {
    // Check if email exists in Firebase Authentication
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (authError) {
      return res.status(404).send('Email is not registered before');
    }

    // Check if email exists in Realtime Database
    const encodedEmail = encodeEmailForFirebaseKey(email);
    const dbSnapshot = await admin.database().ref(`users/${userRecord.uid}`).once('value');
    if (!dbSnapshot.exists()) {
      return res.status(404).send('Email is not registered before');
    }

    const otp = generateOTP();

    // Save OTP in the Realtime Database with encoded email as key
    await admin.database().ref(`resetOtps/${encodedEmail}`).set({
      otp,
      timestamp: admin.database.ServerValue.TIMESTAMP,
    });

    // Send OTP via email
    const mailOptions = {
      from: '"E-Cartz App" <no-reply@mail.com>',
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
          <p>Dear Valuable Customer,</p>
            <p>Your OTP code for password reset is <strong>${otp}</strong><br></br>If you didn’t request this, you can ignore this email.</p>
            <p>Thanks,<br></br>E-Cartz App Team</p>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).send('OTP sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending OTP');
  }
});

router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email) {
    return res.status(400).send('Email cannot be empty');
  }
  if (!otp) {
    return res.status(400).send('OTP cannot be empty');
  }

  try {
    const encodedEmail = encodeEmailForFirebaseKey(email);

    const otpSnapshot = await admin.database().ref(`resetOtps/${encodedEmail}`).once('value');
    const savedOtp = otpSnapshot.val();

    if (!savedOtp || savedOtp.otp !== otp) {
      return res.status(400).send('Invalid OTP');
    }

    // OTP is valid, return success response
    res.status(200).send('OTP verified successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error verifying OTP');
  }
});

// router.post('/update-password', async (req, res) => {
//   const { email, password } = req.body;

//   if (!email) {
//     return res.status(400).send('Email cannot be empty');
//   }
//   if (!password || password.length < 6) {
//     return res.status(400).send('Password must be at least 6 characters long');
//   }

//   try {
//     const userRecord = await admin.auth().getUserByEmail(email);
//     const encodedEmail = encodeEmailForFirebaseKey(email);

//     // Update password in Firebase Authentication
//     await admin.auth().updateUser(userRecord.uid, { password });

//     // Update password in Realtime Database (optional, for your own user management)
//     await admin.database().ref(`users/${userRecord.uid}`).update({ password });

//     // Remove the OTP from the Realtime Database
//     await admin.database().ref(`resetOtps/${encodedEmail}`).remove();

//     res.status(200).send('Password reset successfully');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error resetting password');
//   }
// });


router.post('/update-password', async (req, res) => {
  const saltRounds = 10; 
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).send('Email cannot be empty');
  }
  if (!password || password.length < 6) {
    return res.status(400).send('Password must be at least 6 characters long');
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const encodedEmail = encodeEmailForFirebaseKey(email);

    // Update password in Firebase Authentication
    await admin.auth().updateUser(userRecord.uid, { password });

    // Hash the password before storing it in the Realtime Database
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password in Realtime Database (optional, for your own user management)
    await admin.database().ref(`users/${userRecord.uid}`).update({ password: hashedPassword });

    // Remove the OTP from the Realtime Database
    await admin.database().ref(`resetOtps/${encodedEmail}`).remove();

    res.status(200).send('Password reset successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error resetting password');
  }
});

// Signup endpoint
router.post('/signup', async (req, res) => {
  const { email, password, name, number, otp } = req.body;

  try {
    // Encode email for Firebase key
    const encodedEmail = encodeEmailForFirebaseKey(email);

    const otpSnapshot = await admin.database().ref(`otps/${encodedEmail}`).once('value');
    const otpData = otpSnapshot.val();

    if (!otpData) {
      return res.status(400).send('OTP not found');
    }

    const now = Date.now();
    const otpTimestamp = otpData.timestamp;

    if (otp !== otpData.otp || (now - otpTimestamp) > 300000) { // OTP is valid for 5 minutes
      return res.status(400).send('Invalid or expired OTP');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Save user details in Realtime Database
    await admin.database().ref(`users/${userRecord.uid}`).set({
      name,
      email,
      number,
      password: hashedPassword,
    });

    // Optionally delete the OTP document
    await admin.database().ref(`otps/${encodedEmail}`).remove();

    res.status(201).send('User created successfully');
  } catch (error) {
    console.error(error);
    if (error.code === 'auth/email-already-exists') {
      return res.status(409).send('Email already exists.');
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).send('The password must be at least 6 characters.');
    }
    if (error.code === 'auth/invalid-email') {
      return res.status(400).send('Email is invalid.');
    }
    if (error.code === 'auth/operation-not-allowed') {
      return res.status(400).send('Email/Password accounts are not enabled.');
    }
    if (error.code === 'auth/email-already-in-use') {
      return res.status(400).send('Email is already in use.');
    }
    res.status(500).send('Error creating new user');
  }
});



// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).send('Email cannot be empty');
  }
  if (!password) {
    return res.status(400).send('Password cannot be empty');
  }

  try {
    // Get the user from Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(email);

    // Get the user details from Realtime Database
    const userSnapshot = await admin.database().ref(`users/${userRecord.uid}`).once('value');
    const userData = userSnapshot.val();

    // Compare the password
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      return res.status(401).send('Invalid password');
    }

    // Generate JWT token
    const token = jwt.sign({
      uid: userRecord.uid,
      email: userRecord.email
    }, 'userToken');

    // Send token in response
    res.status(200).json({ token });

  } catch (error) {
    console.error(error);
    if (error.code === 'auth/user-not-found') {
      return res.status(404).send('User not found');
    }
    res.status(500).send('Error logging in');
  }
});

module.exports = router;
