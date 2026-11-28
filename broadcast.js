// broadcast.js
require('dotenv').config();
const nodemailer = require('nodemailer');
const db = require('./src/config/db');

// ==========================================
// EDIT YOUR EMAIL HERE
// ==========================================
const EMAIL_SUBJECT = '🚨 Price Drop Alert: Your favorite WhatsApp numbers are now cheaper!';
const EMAIL_HTML = `
  <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center;">
    <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155;">
      
      <h2 style="color: #ffffff; margin-bottom: 20px;">Price Drop Alert! 🚨</h2>
      
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">Hey there,</p>
      
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
        We’ve got some exciting news that’s going to make your day (and your wallet) very happy! 🎉
        <br><br>
        We just slashed the prices on our most popular WhatsApp numbers to say thank you for rocking with us.
      </p>
      
      <div style="background-color: #0f172a; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
        <p style="margin: 0; color: #ffffff; font-size: 16px;">🇺🇸 <strong>USA WhatsApp:</strong> <span style="text-decoration: line-through; color: #ef4444;">₦3,300</span> ➔ <span style="color: #22c55e; font-weight: bold;">₦2,999</span></p>
        <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">🇩🇪 <strong>Germany WhatsApp:</strong> <span style="text-decoration: line-through; color: #ef4444;">₦6,699</span> ➔ <span style="color: #22c55e; font-weight: bold;">₦6,150</span></p>
      </div>
      
      <p style="color: #94a3b8; font-size: 16px; line-height: 1.5;">
        Same instant delivery. Same high success rate. Just cheaper for you. 🚀
      </p>
      
      <a href="https://otp360.store/dashboard/rent" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px;">
        Rent a Number Now
      </a>
      
      <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
        Hurry though—these promo prices won't last forever.<br><br>
        Need help? <a href="https://wa.me/2347040763069" style="color: #3b82f6;">Chat with us on WhatsApp</a>.
      </p>
    </div>
  </div>
`;

// ==========================================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendBroadcast() {
  console.log('Fetching users from database...');
  
  try {
    // 1. Get all user emails
    const { rows } = await db.query('SELECT email FROM public.users');
    
    if (rows.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }

    console.log(`Found ${rows.length} users. Starting broadcast...`);

    let successCount = 0;
    let failCount = 0;

    // 2. Loop through and send (with a 1-second delay between each to prevent Gmail blocking you)
    for (const user of rows) {
      try {
        await transporter.sendMail({
          from: '"OTP360 Team" <otpreseller360@gmail.com>',
          to: user.email,
          subject: EMAIL_SUBJECT,
          html: EMAIL_HTML,
        });
        
        successCount++;
        console.log(`✅ Sent to ${user.email}`);
        
        // Wait 1 second before sending the next one
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        failCount++;
        console.error(`❌ Failed to send to ${user.email}:`, err.message);
      }
    }

    console.log('\n========================================');
    console.log(`BROADCAST COMPLETE!`);
    console.log(`Successfully sent: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('========================================');
    
    process.exit(0);
    
  } catch (err) {
    console.error('Database error:', err.message);
    process.exit(1);
  }
}

sendBroadcast();