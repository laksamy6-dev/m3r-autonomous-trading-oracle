import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_AUTH_TOKEN!);
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

export class OTPService {
  static async sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[OTP DEBUG] Sending to ${phone} with SID: ${process.env.TWILIO_SID?.substring(0, 10)}...`);
      
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications
        .create({ to: formattedPhone, channel: 'sms' });
      
      console.log(`[OTP SUCCESS] Sent to ${formattedPhone}, SID: ${verification.sid}`);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error: any) {
      console.error('[OTP ERROR]', error.message, error.code);
      return { success: false, message: `Twilio error: ${error.message}` };
    }
  }
  
  static async verifyOTP(phone: string, code: string): Promise<{ success: boolean; token?: string; message: string }> {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const verificationCheck = await client.verify.v2
        .services(verifyServiceSid)
        .verificationChecks
        .create({ to: formattedPhone, code });
      
      if (verificationCheck.status === 'approved') {
        return { success: true, token: 'dummy-token', message: 'Verified successfully' };
      }
      return { success: false, message: 'Invalid code' };
    } catch (error: any) {
      console.error('[OTP VERIFY ERROR]', error.message);
      return { success: false, message: `Verification failed: ${error.message}` };
    }
  }
}
