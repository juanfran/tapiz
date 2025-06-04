import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'],
  port: Number(process.env['SMTP_PORT'] ?? 587),
  secure: process.env['SMTP_SECURE'] === 'true',
  auth: {
    user: process.env['SMTP_USER'],
    pass: process.env['SMTP_PASS'],
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  if (!process.env['SMTP_HOST']) {
    return;
  }

  await transporter.sendMail({
    from: process.env['SMTP_FROM'] ?? process.env['SMTP_USER'],
    to,
    subject,
    html,
  });
}

export function sendMentionNotificationEmail(
  to: string,
  boardId: string,
  boardName: string,
  mentionedBy: string,
  nodeId?: string,
) {
  let boardUrl = `${process.env['FRONTEND_URL']}/board/${boardId}`;
  if (nodeId) {
    boardUrl += `?nodeId=${nodeId}`;
  }
  const subject = `Tapiz - You were mentioned on ${boardName}`;
  const text = `${mentionedBy} mentioned you on the board <a href="${boardUrl}">${boardName}</a>.`;

  return sendMail(to, subject, text);
}

export function sendInvitationEmail(
  to: string,
  teamName: string,
  inviterName: string,
) {
  const subject = `Tapiz - You were invited to join ${teamName}`;
  const text = `${inviterName} invited you to join the team ${teamName}. Check your invites in <a href="${process.env['FRONTEND_URL']}">Tapiz</a>.`;

  return sendMail(to, subject, text);
}
