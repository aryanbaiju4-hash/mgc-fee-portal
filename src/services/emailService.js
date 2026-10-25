// src/services/emailService.js
import { supabase } from '../supabaseClient';

export const sendFeeEmailNotification = async ({ targetType, selectedStudentId, title, description, amount, dueDate }) => {
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.warn("Resend API key missing. Skipping email notification.");
    return;
  }

  let recipients = [];

  // 1. Fetch targeted student email addresses from Supabase
  if (targetType === 'specific' && selectedStudentId) {
    const { data: student } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', selectedStudentId)
      .single();

    if (student?.email) recipients.push(student);
  } else if (targetType === 'all') {
    const { data: students } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'student');

    if (students) recipients = students;
  }

  // 2. Dispatch email to each student in list
  for (const student of recipients) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Mar Gregorios College <onboarding@resend.dev>', // Replace with your domain once verified
          to: [student.email],
          subject: `📢 New Fee Notice: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px;">
              <h2 style="color: #1e3a8a; margin-bottom: 2px;">Mar Gregorios College, Punnapra</h2>
              <p style="color: #64748b; font-size: 12px; margin-top: 0;">Online Fee Management Portal</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
              
              <p>Dear <strong>${student.full_name}</strong>,</p>
              <p>A new fee statement has been published to your account:</p>
              
              <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #0f172a;">${title}</h3>
                <p style="margin: 4px 0; color: #475569; font-size: 13px;">${description || 'College Fee Payment Notice'}</p>
                <p style="margin: 4px 0; font-size: 15px;"><strong>Amount:</strong> ₹${Number(amount).toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #b91c1c;"><strong>Due Date:</strong> ${dueDate}</p>
              </div>

              <p>Please log in to your student dashboard to complete the payment online.</p>
              <a href="https://mgc-fee-portal.vercel.app" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;">Pay Online Now</a>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 12px 0;" />
              <p style="font-size: 11px; color: #94a3b8; text-align: center;">Mar Gregorios College of Arts & Science, Punnapra, Alappuzha, Kerala - 688004</p>
            </div>
          `,
        }),
      });
    } catch (err) {
      console.error(`Failed sending email to ${student.email}:`, err);
    }
  }
};