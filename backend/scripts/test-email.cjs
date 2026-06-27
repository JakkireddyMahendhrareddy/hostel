// Quick SMTP check. Usage:
//   node scripts/test-email.cjs               -> sends to EMAIL_USER
//   node scripts/test-email.cjs you@email.com -> sends to that address
const nodemailer = require('nodemailer');
require('dotenv').config();

(async () => {
  console.log(`SMTP user: ${process.env.EMAIL_USER}`);
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection OK (credentials accepted)');

    const to = process.argv[2] || process.env.EMAIL_USER;
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: 'HostelHub SMTP test',
      text: 'If you can read this, your email setup works. 🎉',
    });
    console.log(`✅ Test email sent to ${to}  (id: ${info.messageId})`);
  } catch (err) {
    console.error('❌ SMTP failed:', err.message);
    console.error('\nMost common fix: use a Gmail APP PASSWORD (not your normal password).');
    process.exit(1);
  }
})();
