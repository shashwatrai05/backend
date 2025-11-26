import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendEmail = async (to, subject, text) => {
    const response = await transporter.sendMail({
        from: process.env.SENDER_EMAIL, // sender address
        to,
        subject,
        html: text,
    });
    return response;
};

export default sendEmail;