import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'en' | 'am';

interface Translations {
  [key: string]: { en: string; am: string };
}

const translations: Translations = {
  // App
  'app.name': { en: 'Alehegne Sewnet Apartment', am: 'አለኸኝ ሰውነት አፓርትመንት' },
  'app.short': { en: 'AS Apt.', am: 'AS Apt.' },
  'app.powered': { en: 'Powered by NUN Tech', am: 'በNUN Tech የተሰራ' },
  'app.copyright': { en: `© ${new Date().getFullYear()} NUN Tech. All rights reserved.`, am: `© ${new Date().getFullYear()} NUN Tech. መብቱ በህግ የተጠበቀ ነው.` },
  
  // Index
  'index.adminLogin': { en: 'Admin Login', am: 'የአስተዳዳሪ መግቢያ' },
  'index.tenantLogin': { en: 'Tenant Login', am: 'የተከራይ መግቢያ' },
  'index.chooseRole': { en: 'Choose how you want to sign in', am: 'እንዴት መግባት እንደሚፈልጉ ይምረጡ' },

  // Auth
  'auth.login': { en: 'Login', am: 'ግባ' },
  'auth.register': { en: 'Register', am: 'ተመዝገብ' },
  'auth.email': { en: 'Email', am: 'ኢሜይል' },
  'auth.password': { en: 'Password', am: 'የይለፍ ቃል' },
  'auth.fullName': { en: 'Full Name', am: 'ሙሉ ስም' },
  'auth.loginBtn': { en: 'Sign In', am: 'ግባ' },
  'auth.registerBtn': { en: 'Create Account', am: 'መለያ ፍጠር' },
  'auth.noAccount': { en: "Don't have an account?", am: 'መለያ የለህም?' },
  'auth.hasAccount': { en: 'Already have an account?', am: 'መለያ አለህ?' },
  'auth.pending': { en: 'Your account is pending approval', am: 'መለያህ እየተጠበቀ ነው' },
  'auth.rejected': { en: 'Your account has been rejected', am: 'መለያህ ተቀባይነት አላገኘም' },
  'auth.rememberMe': { en: 'Remember me', am: 'አስታውሰኝ' },
  'auth.forgotPassword': { en: 'Forgot password?', am: 'የይለፍ ቃል ረሱ?' },
  'auth.sendResetLink': { en: 'Send Reset Link', am: 'የዳግም ማስጀመሪያ ልክ ላክ' },
  'auth.backToLogin': { en: 'Back to Login', am: 'ወደ መግቢያ ተመለስ' },
  'auth.newPassword': { en: 'New Password', am: 'አዲስ የይለፍ ቃል' },
  'auth.updatePassword': { en: 'Update Password', am: 'የይለፍ ቃል አዘምን' },
  'auth.logout': { en: 'Logout', am: 'ውጣ' },

  // Tenant
  'tenant.login': { en: 'Tenant Login', am: 'የተከራይ መግቢያ' },
  'tenant.register': { en: 'Tenant Registration', am: 'የተከራይ ምዝገባ' },
  'tenant.portal': { en: 'Tenant Portal', am: 'የተከራይ ፖርታል' },
  'tenant.selectApartment': { en: 'Select Your Apartment', am: 'አፓርትመንትዎን ይምረጡ' },
  'tenant.phone': { en: 'Phone Number', am: 'ስልክ ቁጥር' },
  'tenant.enterPhone': { en: 'Please enter your phone number', am: 'እባክዎ ስልክ ቁጥርዎን ያስገቡ' },
  'tenant.phoneNotFound': { en: 'No apartment found for this phone number', am: 'ለዚህ ስልክ ቁጥር አፓርትመንት አልተገኘም' },
  'tenant.tenantFound': { en: 'Tenant found!', am: 'ተከራይ ተገኝቷል!' },
  'tenant.apartment': { en: 'Apartment', am: 'አፓርትመንት' },
  'tenant.lookupFirst': { en: 'Please look up your phone number first', am: 'እባክዎ መጀመሪያ ስልክ ቁጥርዎን ይፈልጉ' },
  'tenant.accountCreated': { en: 'Account created! Please check your email to confirm.', am: 'መለያ ተፈጥሯል! እባክዎ ኢሜልዎን ያረጋግጡ።' },
  'tenant.backToHome': { en: 'Back to Home', am: 'ወደ ዋና ገጽ ተመለስ' },
  'tenant.dashboard': { en: 'Dashboard', am: 'ዳሽቦርድ' },
  'tenant.bills': { en: 'Bills', am: 'ሂሳቦች' },
  'tenant.payment': { en: 'Payment', am: 'ክፍያ' },
  'tenant.history': { en: 'History', am: 'ታሪክ' },
  'tenant.welcome': { en: 'Welcome', am: 'እንኳን ደህና መጡ' },
  'tenant.rentStatus': { en: 'Rent Status', am: 'የኪራይ ሁኔታ' },
  'tenant.dueDate': { en: 'Due Date', am: 'የክፍያ ቀን' },
  'tenant.pendingElec': { en: 'Pending Electricity', am: 'ያልተከፈለ ኤሌክትሪክ' },
  'tenant.pendingWater': { en: 'Pending Water', am: 'ያልተከፈለ ውሃ' },
  'tenant.pendingSecurity': { en: 'Pending Security', am: 'ያልተከፈለ ጥበቃ' },
  'tenant.rent': { en: 'Rent', am: 'ኪራይ' },
  'tenant.rentPayment': { en: 'Rent Payment', am: 'የኪራይ ክፍያ' },
  'tenant.utilityPayment': { en: 'Utility Payment', am: 'የመገልገያ ክፍያ' },
  'tenant.uploadProof': { en: 'Upload Payment Proof', am: 'የክፍያ ማረጋገጫ ያስገቡ' },
  'tenant.billType': { en: 'Bill Type', am: 'የሂሳብ ዓይነት' },
  'tenant.screenshot': { en: 'Payment Screenshot', am: 'የክፍያ ቅጽበታዊ ምስል' },
  'tenant.submitProof': { en: 'Submit Payment Proof', am: 'የክፍያ ማረጋገጫ ያስገቡ' },
  'tenant.proofSubmitted': { en: 'Payment proof submitted successfully!', am: 'የክፍያ ማረጋገጫ በተሳካ ሁኔታ ገብቷል!' },
  'tenant.rentPayments': { en: 'Rent Payments', am: 'የኪራይ ክፍያዎች' },
  'tenant.submittedProofs': { en: 'Submitted Proofs', am: 'የቀረቡ ማረጋገጫዎች' },
  'tenant.noProofs': { en: 'No payment proofs submitted yet', am: 'እስካሁን ምንም የክፍያ ማረጋገጫ አልቀረበም' },
  'tenant.submitted': { en: 'Submitted', am: 'ቀርቧል' },
  'tenant.rejected': { en: 'Rejected', am: 'ውድቅ ሆኗል' },
  'tenant.months': { en: 'months', am: 'ወራት' },

  // Nav
  'nav.dashboard': { en: 'Dashboard', am: 'ዳሽቦርድ' },
  'nav.apartments': { en: 'Apartments', am: 'አፓርትመንቶች' },
  'nav.electricity': { en: 'Electricity', am: 'ኤሌክትሪክ' },
  'nav.water': { en: 'Water', am: 'ውሃ' },
  'nav.security': { en: 'Security', am: 'ጥበቃ' },
  'nav.rent': { en: 'Rent Billing', am: 'የኪራይ ሂሳብ' },
  'nav.revenue': { en: 'Revenue', am: 'ገቢ' },
  'nav.users': { en: 'User Management', am: 'የተጠቃሚ አስተዳደር' },
  'nav.settings': { en: 'Settings', am: 'ቅንብሮች' },

  // Dashboard
  'dash.totalApts': { en: 'Total Apartments', am: 'ጠቅላላ አፓርትመንቶች' },
  'dash.occupied': { en: 'Occupied', am: 'የተያዙ' },
  'dash.vacant': { en: 'Vacant', am: 'ክፍት' },
  'dash.revenue': { en: 'Total Revenue', am: 'ጠቅላላ ገቢ' },
  'dash.overview': { en: 'Apartment Overview', am: 'የአፓርትመንት አጠቃላይ' },
  'dash.pendingUsers': { en: 'Pending Users', am: 'በመጠበቅ ላይ ያሉ ተጠቃሚዎች' },

  // Apartments
  'apt.floor': { en: 'Floor', am: 'ፎቅ' },
  'apt.tenant': { en: 'Tenant', am: 'ተከራይ' },
  'apt.phone': { en: 'Phone', am: 'ስልክ' },
  'apt.moveIn': { en: 'Move-in Date', am: 'የገቡበት ቀን' },
  'apt.rent': { en: 'Monthly Rent', am: 'ወርሃዊ ኪራይ' },
  'apt.status': { en: 'Status', am: 'ሁኔታ' },
  'apt.daysLeft': { en: 'Days Left', am: 'ቀናት ቀርተዋል' },
  'apt.overdue': { en: 'Overdue', am: 'ያለፈ' },
  'apt.edit': { en: 'Edit', am: 'አርትዕ' },
  'apt.save': { en: 'Save', am: 'አስቀምጥ' },
  'apt.cancel': { en: 'Cancel', am: 'ሰርዝ' },
  'apt.vacant': { en: 'Vacant', am: 'ክፍት' },
  'apt.addTenant': { en: 'Add Tenant', am: 'ተከራይ ጨምር' },
  'apt.removeTenant': { en: 'Remove Tenant', am: 'ተከራይ አስወግድ' },
  'apt.paidMonths': { en: 'Paid Months', am: 'የተከፈሉ ወራት' },

  // Bills
  'bill.month': { en: 'Month', am: 'ወር' },
  'bill.year': { en: 'Year', am: 'ዓመት' },
  'bill.kwh': { en: 'kWh', am: 'kWh' },
  'bill.rate': { en: 'Rate', am: 'ተመን' },
  'bill.total': { en: 'Total', am: 'ጠቅላላ' },
  'bill.paid': { en: 'Paid', am: 'ተከፍሏል' },
  'bill.unpaid': { en: 'Unpaid', am: 'ያልተከፈለ' },
  'bill.markPaid': { en: 'Mark as Paid', am: 'ተከፍሏል ምልክት አድርግ' },
  'bill.add': { en: 'Add Bill', am: 'ሂሳብ ጨምር' },
  'bill.amount': { en: 'Amount (Birr)', am: 'መጠን (ብር)' },
  'bill.generatePdf': { en: 'Generate PDF', am: 'PDF ፍጠር' },

  // Users
  'user.approve': { en: 'Approve', am: 'አጽድቅ' },
  'user.reject': { en: 'Reject', am: 'ውድቅ አድርግ' },
  'user.pending': { en: 'Pending', am: 'በመጠበቅ ላይ' },
  'user.approved': { en: 'Approved', am: 'ጸድቋል' },
  'user.rejected': { en: 'Rejected', am: 'ውድቅ ሆኗል' },

  // Settings
  'settings.title': { en: 'Settings', am: 'ቅንብሮች' },
  'settings.profileInfo': { en: 'Profile Information', am: 'የመገለጫ መረጃ' },
  'settings.changePassword': { en: 'Change Password', am: 'የይለፍ ቃል ቀይር' },
  'settings.confirmPassword': { en: 'Confirm Password', am: 'የይለፍ ቃል ያረጋግጡ' },
  'settings.saveProfile': { en: 'Save Profile', am: 'መገለጫ አስቀምጥ' },
  'settings.profileUpdated': { en: 'Profile updated!', am: 'መገለጫ ተዘምኗል!' },
  'settings.passwordUpdated': { en: 'Password updated!', am: 'የይለፍ ቃል ተዘምኗል!' },
  'settings.passwordMismatch': { en: 'Passwords do not match', am: 'የይለፍ ቃሎቹ አይገጣጠሙም' },
  'settings.passwordTooShort': { en: 'Password must be at least 6 characters', am: 'የይለፍ ቃል ቢያንስ 6 ቁምፊዎች መሆን አለበት' },

  // Admin tenant management
  'admin.tenants': { en: 'Tenant Accounts', am: 'የተከራይ መለያዎች' },
  'admin.paymentReview': { en: 'Payment Review', am: 'የክፍያ ግምገማ' },
  'admin.reviewPayment': { en: 'Review Payment', am: 'ክፍያ ይገምግሙ' },
  'admin.approve': { en: 'Approve', am: 'አጽድቅ' },
  'admin.reject': { en: 'Reject', am: 'ውድቅ' },
  'admin.approved': { en: 'Approved', am: 'ጸድቋል' },
  'admin.rejected': { en: 'Rejected', am: 'ውድቅ ሆኗል' },
  'admin.pending': { en: 'Pending', am: 'በመጠበቅ ላይ' },
  'admin.all': { en: 'All', am: 'ሁሉም' },
  'admin.noPayments': { en: 'No payment submissions found', am: 'ምንም የክፍያ ማረጋገጫ አልተገኘም' },
  'admin.paymentApproved': { en: 'Payment approved!', am: 'ክፍያ ጸድቋል!' },
  'admin.paymentRejected': { en: 'Payment rejected', am: 'ክፍያ ውድቅ ሆኗል' },
  'admin.notes': { en: 'Notes', am: 'ማስታወሻ' },
  'admin.notesPlaceholder': { en: 'Add a note (optional)', am: 'ማስታወሻ ያስገቡ (አማራጭ)' },
  'admin.submittedAt': { en: 'Submitted', am: 'የቀረበበት ቀን' },
  'nav.paymentReview': { en: 'Payments', am: 'ክፍያዎች' },
  'admin.deleteTenant': { en: 'Delete Account', am: 'መለያ ሰርዝ' },
  'admin.resetPassword': { en: 'Reset Password', am: 'የይለፍ ቃል ዳግም አስጀምር' },
  'admin.deleteConfirm': { en: 'Are you sure you want to delete this tenant account?', am: 'የዚህን ተከራይ መለያ ለመሰረዝ እርግጠኛ ነዎት?' },
  'admin.resetConfirm': { en: 'Send password reset for this tenant?', am: 'ለዚህ ተከራይ የይለፍ ቃል ዳግም ማስጀመሪያ ይላክ?' },
  'admin.deleted': { en: 'Tenant account deleted', am: 'የተከራይ መለያ ተሰርዟል' },
  'admin.resetSent': { en: 'Password reset initiated', am: 'የይለፍ ቃል ዳግም ማስጀመሪያ ተልኳል' },
  'auth.forgotPasswordMsg': { en: 'Enter your email to receive a reset link', am: 'የዳግም ማስጀመሪያ ሊንክ ለመቀበል ኢሜይልዎን ያስገቡ' },
  'auth.resetLinkSent': { en: 'Reset link sent! Check your email.', am: 'የዳግም ማስጀመሪያ ሊንክ ተልኳል! ኢሜይልዎን ይፈትሹ.' },

  // Common
  'common.birr': { en: 'Birr', am: 'ብር' },
  'common.days': { en: 'days', am: 'ቀናት' },
  'common.confirm': { en: 'Are you sure?', am: 'እርግጠኛ ነህ?' },
  'common.delete': { en: 'Delete', am: 'ሰርዝ' },
  'common.loading': { en: 'Loading...', am: 'በመጫን ላይ...' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className={language === 'am' ? 'font-amharic' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
