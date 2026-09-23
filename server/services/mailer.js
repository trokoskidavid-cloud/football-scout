const nodemailer = require('nodemailer');

/**
 * E-mail notifications (nodemailer).
 * If SMTP_HOST is configured, real SMTP is used (e.g. Gmail app password, Mailtrap, Brevo…).
 * Otherwise a JSON transport is used and the message is only logged – handy for local dev.
 */
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || 'FootballScout <no-reply@footballscout.mk>',
      to,
      subject,
      html,
    });
    if (!process.env.SMTP_HOST) console.log(`[mail] (dev, not sent) to=${to} subject="${subject}"`);
    return info;
  } catch (err) {
    // e-mail must never break the main request
    console.error('[mail] failed:', err.message);
    return null;
  }
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const appUrl = () =>process.env.APP_URL || 'http://localhost:3000';

const templates = {
  welcome: (user) => ({
    subject: 'Добредојде во FootballScout ⚽',
    html: `<h2>Здраво ${esc(user.fullName || user.username)}!</h2>
      <p>Твојот скаутски профил <b>${user.username}</b> е успешно креиран.</p>
      <p>Започни со следење играчи: <a href="${appUrl()}/players">${appUrl()}/players</a></p>`,
  }),
  newComment: (report, comment, author) => ({
    subject: `Нов коментар на твојот извештај за ${report.player?.firstName || ''} ${report.player?.lastName || ''}`,
    html: `<p><b>${author.username}</b> коментираше:</p><blockquote>${esc(comment.text)}</blockquote>
      <p><a href="${appUrl()}/reports/${report._id}">Отвори го извештајот</a></p>`,
  }),
  playerRecommended: (player, scout) => ({
    subject: `Нова препорака: ${player.firstName} ${player.lastName}`,
    html: `<p>Скаутот <b>${scout.username}</b> препорача потпишување на <b>${player.firstName} ${player.lastName}</b>.</p>
      <p><a href="${appUrl()}/players/${player._id}">Профил на играчот</a></p>`,
  }),
};

module.exports = { sendMail, templates };
