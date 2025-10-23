const twilio = require('twilio');

// SMS Service Configuration
// You'll need to set these environment variables or add them to a config file
const SMS_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'your_twilio_account_sid',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'your_twilio_auth_token',
  fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890' // Your Twilio phone number
};

class SMSService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    
    // Initialize Twilio client if credentials are provided
    if (SMS_CONFIG.accountSid !== 'your_twilio_account_sid' && 
        SMS_CONFIG.authToken !== 'your_twilio_auth_token') {
      try {
        this.client = twilio(SMS_CONFIG.accountSid, SMS_CONFIG.authToken);
        this.isConfigured = true;
        console.log('SMS Service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize SMS service:', error.message);
      }
    } else {
      console.log('SMS Service not configured - using mock mode');
    }
  }

  // Format invoice for SMS
  formatInvoiceForSMS(invoiceData) {
    const { sale, items } = invoiceData;
    let message = `🏪 INVOICE ${sale.invoice_number}\n`;
    message += `📅 ${new Date(sale.created_at).toLocaleDateString()}\n`;
    message += `💰 Total: Rs ${sale.total_amount.toFixed(2)}\n`;
    message += `💳 Payment: ${sale.payment_type}\n\n`;
    
    message += `📋 ITEMS:\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   Qty: ${item.quantity} x Rs ${item.price.toFixed(2)}\n`;
      message += `   Subtotal: Rs ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n✅ Thank you for your purchase!`;
    return message;
  }

  // Send SMS
  async sendSMS(toNumber, message) {
    if (!this.isConfigured) {
      // Mock mode for development/testing
      console.log('📱 MOCK SMS SENT:');
      console.log(`To: ${toNumber}`);
      console.log(`Message: ${message}`);
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: SMS_CONFIG.fromNumber,
        to: toNumber
      });
      
      console.log('SMS sent successfully:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('Failed to send SMS:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send invoice via SMS
  async sendInvoice(toNumber, invoiceData) {
    const message = this.formatInvoiceForSMS(invoiceData);
    return await this.sendSMS(toNumber, message);
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
      return false;
    }
    
    // Add country code if not present (assuming Sri Lanka +94)
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return '+94' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '+94' + cleaned;
    } else if (cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return '+' + cleaned;
  }
}

module.exports = new SMSService();
