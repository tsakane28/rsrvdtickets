# Paynow Integration Production Deployment Guide

This guide provides instructions for switching the Paynow integration from test mode to production mode for live payments.

## Prerequisites

1. Paynow merchant account with live integration credentials
2. Access to the application's deployment environment (e.g., Vercel)
3. Access to environment variables configuration

## Environment Variables

Update the following environment variables in your production environment:

```env
# Paynow Production Credentials (replace with your actual values)
PAYNOW_INTEGRATION_ID=YOUR_PRODUCTION_INTEGRATION_ID
PAYNOW_INTEGRATION_KEY=YOUR_PRODUCTION_INTEGRATION_KEY
MERCHANT_EMAIL=your-business-email@example.com

# Application URLs (update with your production domain)
NEXT_PUBLIC_SITE_URL=https://rsrvdtickets.com
NEXT_PUBLIC_BASE_URL=https://rsrvdtickets.com

# Security (generate secure random values for these)
INTERNAL_API_KEY=your-secure-api-key
QR_SIGNATURE_KEY=your-secure-qr-signature-key
SESSION_SECRET=your-secure-session-secret

# This must be set to "production"
NODE_ENV=production
```

## Deployment Steps

1. **Obtain Production Credentials** from your Paynow merchant dashboard:
   - Navigate to Settings > Integration
   - Note your Integration ID and Integration Key

2. **Update Environment Variables**:
   - In your hosting platform (e.g., Vercel), update the environment variables with production values
   - Ensure `NODE_ENV` is set to `production`

3. **Deploy the Production Branch**:
   ```bash
   # From your local development environment
   git checkout production
   git push origin production
   ```

4. **Configure Deployment in Vercel/Hosting Platform**:
   - Set the production branch as the source for your production environment
   - Ensure all environment variables are properly set

## Verification Steps

After deployment, verify the integration is working correctly:

1. **Test a Small Transaction**:
   - Make a small payment using a real payment method
   - Verify the payment is processed correctly
   - Check database records to ensure payment status is updated

2. **Verify Webhooks**:
   - Make sure Paynow's callback to your application is working
   - Check logs for successful webhook processing

3. **Check Security Measures**:
   - Verify hash signature validation is active
   - Ensure sensitive data is not exposed in responses

## Troubleshooting

If you encounter issues with your production deployment:

1. **Check Logs**:
   - Review application logs for any errors
   - Look for issues in your payment processing endpoints

2. **Verify Credentials**:
   - Double-check that your Paynow integration credentials are correct
   - Ensure the environment variables are properly set

3. **Test Mode Interference**:
   - Ensure test mode is properly disabled in the production environment
   - Verify `NODE_ENV` is set to `production`

4. **Contact Paynow Support**:
   - If issues persist, contact Paynow support at support@paynow.co.zw
   - Provide detailed error logs and transaction references

## Important URLs

- **Payment Status Endpoint**: `https://yourdomain.com/api/paynow/check-payment?id=PAYMENT_ID`
- **Paynow Callback URL**: `https://yourdomain.com/api/paynow/update`
- **Return URL**: `https://yourdomain.com/events/${eventId}/checkout/status?reference=${reference}`

## Security Best Practices

1. **Hash Validation**:
   - Always validate the hash signature from Paynow callbacks
   - The code now enforces this in production mode

2. **Encryption**:
   - Sensitive data in cookies and sessions is encrypted
   - Ensure `SESSION_SECRET` is a strong, random value

3. **Regular Monitoring**:
   - Set up alerts for failed payments
   - Regularly audit payment records

4. **Secure Environment Variables**:
   - Restrict access to production environment variables
   - Rotate keys periodically

## Rollback Plan

If critical issues arise in production:

1. Revert to previous stable deployment
2. Switch back to test mode temporarily if necessary
3. Address issues in a development environment before redeploying

## Reference Documentation

For more information, refer to the [Paynow Integration Documentation](https://developers.paynow.co.zw/docs/quickstart.html). 