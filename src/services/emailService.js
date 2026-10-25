import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';

const EMAILJS_SERVICE_ID = 'service_j06v7ml';
const EMAILJS_TEMPLATE_ID = 'template_ocbij1q'; // <-- Replace with copied ID from dashboard
const EMAILJS_PUBLIC_KEY = 'oPUQRf7L6PQ2KI5tj';  // <-- Replace with Public Key from Account tab

export const sendFeeEmailNotification = async ({ targetType, selectedStudentId, title, description, amount, dueDate }) => {
  let recipients = [];

  try {
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

    if (recipients.length === 0) {
      console.warn('No registered students with valid emails found.');
      return;
    }

    console.log(`Dispatching EmailJS notification to ${recipients.length} recipient(s)...`);

    const emailPromises = recipients.map((student) => {
      const templateParams = {
        to_email: student.email,
        to_name: student.full_name,
        subject: `📢 Fee Notice: ${title}`,
        fee_title: title,
        fee_amount: `₹${Number(amount).toLocaleString('en-IN')}`,
        fee_due_date: dueDate,
        fee_description: description || 'Scheduled college fee payment notice.'
      };

      return emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
    });

    await Promise.all(emailPromises);
    console.log('EmailJS notifications sent successfully!');
  } catch (err) {
    console.error('Error sending EmailJS notifications:', err);
  }
};