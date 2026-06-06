interface ReferralRedemptionEmailParams {
  to: string;
  name: string | null;
  amount: number;
}

export async function sendReferralRedemptionEmail(
  params: ReferralRedemptionEmailParams
) {
  const { to, name, amount } = params;
  const displayName = name || "there";
  const subject = "Your Swiftdroom referral earnings are ready";
  const body = `Hi ${displayName},

Great news — your referral commission of $${amount.toFixed(2)} is now eligible for payout.

To receive your earnings, reply to this email with your preferred payment details (PayPal email, bank transfer info, or other method). Our team processes payouts on the 3rd of each month.

Thank you for spreading the word about Swiftdroom!

— The Swiftdroom team`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Swiftdroom <noreply@swiftdroom.com>";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, text: body }),
      });
      if (!res.ok) {
        console.error("Resend email failed:", await res.text());
      }
      return;
    } catch (err) {
      console.error("Resend email error:", err);
    }
  }

  console.log(`[referral-email] To: ${to} | Subject: ${subject}\n${body}`);
}
