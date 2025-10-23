# SMS Configuration for Invoice Sending

## Twilio Setup (Recommended)

1. **Sign up for Twilio**: Go to https://www.twilio.com and create an account
2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Phone Number (for sending SMS)

3. **Set Environment Variables**:
   ```bash
   # Add these to your .env file or system environment
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_FROM_NUMBER=+1234567890
   ```

## Alternative SMS Services

### 1. TextLocal (Sri Lanka)
- Website: https://www.textlocal.com
- Good for Sri Lankan numbers
- Supports bulk SMS

### 2. SMSGlobal
- Website: https://www.smsglobal.com
- International SMS support
- Good pricing for business

### 3. Vonage (formerly Nexmo)
- Website: https://www.vonage.com
- Developer-friendly API
- Good documentation

## Current Implementation

The system currently uses Twilio but includes a **mock mode** for development/testing:

- **Mock Mode**: When Twilio credentials are not configured, SMS sending will be logged to console
- **Production Mode**: When credentials are configured, actual SMS will be sent

## SMS Message Format

The invoice SMS includes:
- 🏪 Invoice number
- 📅 Date
- 💰 Total amount
- 💳 Payment method
- 📋 Itemized list
- ✅ Thank you message

## Phone Number Validation

The system automatically:
- Formats Sri Lankan numbers (07XXXXXXXX → +947XXXXXXXX)
- Validates number length (10-15 digits)
- Adds country code if missing

## Testing

To test without real SMS:
1. Leave Twilio credentials unconfigured
2. Check console logs for mock SMS output
3. Verify phone number formatting

## Cost Considerations

- SMS costs vary by country (~$0.01-0.05 per message)
- Consider implementing SMS limits per customer
- Add SMS sending confirmation to prevent spam
