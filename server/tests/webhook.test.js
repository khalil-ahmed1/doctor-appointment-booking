const crypto = require('crypto');
const { razorpayWebhook } = require('../src/controllers/webhook.controller');
const WebhookEvent = require('../src/models/WebhookEvent');
const paymentService = require('../src/services/payment.service');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

jest.mock('../src/services/payment.service', () => ({
  finalizePayment: jest.fn()
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Webhook Controller', () => {
  let req, res;
  
  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  afterEach(async () => {
    await WebhookEvent.deleteMany();
  });

  it('rejects invalid signature', async () => {
    const payload = JSON.stringify({ event: 'payment.captured', custom_event_id: 'ev_123' });
    req = {
      headers: {
        'x-razorpay-signature': 'invalid_signature'
      },
      body: Buffer.from(payload)
    };

    await razorpayWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid signature');
  });

  it('accepts valid signature, ensures idempotency and fires processing async', async () => {
    const payload = JSON.stringify({ 
      event: 'payment.captured', 
      custom_event_id: 'ev_123',
      payload: {
        payment: {
          entity: {
            order_id: 'order_123',
            id: 'pay_123'
          }
        }
      }
    });

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(payload))
      .digest('hex');

    req = {
      headers: {
        'x-razorpay-signature': validSignature
      },
      body: Buffer.from(payload)
    };

    // First call (Should Succeed)
    await razorpayWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');

    // Wait for the async process to settle (since it is fire-and-forget in controller)
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(paymentService.finalizePayment).toHaveBeenCalledWith('order_123', 'pay_123');

    const event = await WebhookEvent.findOne({ eventId: 'ev_123' });
    expect(event.status).toBe('PROCESSED');

    // Second call with same event_id (Should be Idempotent)
    jest.clearAllMocks();
    await razorpayWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    
    // ensure paymentService is NOT called again
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(paymentService.finalizePayment).not.toHaveBeenCalled();
  });
});
