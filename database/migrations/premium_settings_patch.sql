-- DATABASE MIGRATIONS FOR PREMIUM MODULES & WEBSITE/EMAIL CONFIGURATIONS
USE mobile_repair_system;

-- 1. Seed dynamic settings for SMTP & Templates
INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('smtp_host', 'sandbox.smtp.mailtrap.io', 'SMTP mail server host name'),
('smtp_port', '2525', 'SMTP mail server port number'),
('smtp_user', 'default_smtp_username_here', 'SMTP mail server authenticate username'),
('smtp_pass', 'default_smtp_password_here', 'SMTP mail server authenticate password'),
('smtp_sender', 'no-reply@repairsystem.com', 'SMTP mail sender address'),
('welcome_email_template', 'Hello {name},\n\nWelcome to SHREE RAAM MOBILE repair & learning portal! Your registration was successful.\n\nBest Regards,\nSHREE RAAM MOBILE Team', 'Welcome message email template text'),
('payment_email_template', 'Hello {name},\n\nWe have successfully received your payment proof for course "{course_title}". Our support staff will verify and enroll you shortly.\n\nBest Regards,\nSHREE RAAM MOBILE Team', 'Payment confirmation email template text'),
('course_approval_email_template', 'Hello {name},\n\nCongratulations! Your enrollment request for "{course_title}" has been approved. You can now access all learning videos and materials in your dashboard.\n\nHappy Learning,\nSHREE RAAM MOBILE Team', 'Course enrollment approval template text'),
('reset_password_email_template', 'Hello {name},\n\nYou requested a password reset. Please use the following temporary password to log in and change your details:\n\nTemporary Password: {temp_password}\n\nBest Regards,\nSHREE RAAM MOBILE Team', 'Password reset email template text');

-- 2. Seed website settings for Homepage dynamic blocks
INSERT IGNORE INTO website_settings (setting_key, setting_value) VALUES
('hero_title', 'SHREE RAAM MOBILE'),
('hero_subtitle', 'Professional Chip-level Device Repair & Training Institute'),
('theme_color', '#10b981'),
('contact_email', 'contact@repairsystem.com'),
('contact_phone', '+91 95522 10333'),
('contact_address', '123 Shree Raam Street, Pune, Maharashtra'),
('social_links', '{"facebook": "https://facebook.com", "instagram": "https://instagram.com", "whatsapp": "https://wa.me/919552210333"}'),
('faqs', '[{"q": "How can I track my device status?", "a": "You can check status instantly by scanning the QR code on your repair request card or typing the tracking code at the live tracker block."}, {"q": "Do you provide warranties on repairs?", "a": "Yes, standard chip level replacements cover 3 to 6 months shop warranty."}]'),
('testimonials', '[{"name": "Vinayak Kumbhar", "role": "Technician Student", "comment": "The IC level diagnostics course module is highly practical and comprehensive."}, {"name": "Sanjay Kumbhar", "role": "Shop Customer", "comment": "Fast screen repair services and clear tracking logs. Highly recommended!"}]'),
('google_map_embed', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.38883262453!2d73.854084!3d18.511394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDMwJzQxLjAiTiA3M8KwNTEnMTQuNyJFCg!5e0!3m2!1sen!2sin!4v1657800000000!5m2!1sen!2sin');
