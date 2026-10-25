import emailjs from '@emailjs/browser';
import { supabase } from '../supabaseClient';

const EMAILJS_SERVICE_ID = 'service_j06v7ml';
const EMAILJS_TEMPLATE_ID = 'template_ochijiq';
const EMAILJS_PUBLIC_KEY = 'oPUQRf7L6PQ2KI5tj';

export const sendFeeEmailNotification = async ({
  targetType,
  selectedStudentId,
  title,
  description,
  amount,
  dueDate
}) => {
  try {
    let recipients = [];

    if (targetType === 'specific' && selectedStudentId) {
      const { data: student, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', selectedStudentId)
        .single();

      if (error) throw error;
      if (student?.email) recipients.push(student);
    } else if (targetType === 'all') {
      const { data: students, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'student');

      if (error) throw error;
      if (students) recipients = students.filter((student) => student.email);
    }

    if (recipients.length === 0) {
      console.warn('No student emails found to dispatch notices to.');
      return;
    }

    const emailPromises = recipients.map((student) => {
      const templateParams = {
        to_email: student.email,
        to_name: student.full_name,
        subject: `📢 Fee Update: ${title}`,
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
    console.log(`Dispatched emails to ${recipients.length} student(s).`);
  } catch (err) {
    console.error('Error dispatching fee emails:', err);
    throw err;
  }
};
