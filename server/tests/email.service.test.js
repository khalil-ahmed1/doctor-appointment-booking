const { sendEmail } = require('../src/services/email.service');
const EmailLog = require('../src/models/EmailLog');
const nodemailer = require('nodemailer');

jest.mock('nodemailer');

describe('Email Service', () => {
  let sendMailMock;

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an EmailLog and send an email successfully', async () => {
    const to = 'test@example.com';
    const subject = 'Test Email';
    const templateName = 'verifyEmail';
    const data = { name: 'John Doe', token: '12345' };

    const result = await sendEmail(to, subject, templateName, data);

    expect(result).toBe(true);

    const log = await EmailLog.findOne({ to });
    expect(log).toBeDefined();
    expect(log.status).toBe('SENT');
    expect(log.subject).toBe(subject);
    expect(log.template).toBe(templateName);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to,
        subject,
      }),
    );
  });

  it('should log FAILED if sending fails and not throw', async () => {
    sendMailMock.mockRejectedValueOnce(new Error('SMTP error'));

    const to = 'fail@example.com';
    const result = await sendEmail(to, 'Failed test', 'verifyEmail', { name: 'Fail', token: 'x' });

    expect(result).toBe(false);

    const log = await EmailLog.findOne({ to });
    expect(log).toBeDefined();
    expect(log.status).toBe('FAILED');
    expect(log.error).toBe('SMTP error');
  });
});
