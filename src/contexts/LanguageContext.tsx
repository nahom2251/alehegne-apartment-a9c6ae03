import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'en' | 'am';

interface Translations {
  [key: string]: { en: string; am: string };
}

const translations: Translations = {
  // App
  'app.name': { en: 'Alehegne Sewnet Apartment', am: 'አለኸኝ ሰውነት አፓርትመንት' },
  'app.short': { en: 'AS Apt.', am: 'AS Apt.' },
  'app.powered': { en: 'Powered by NUN Tech', am: 'በNUN Tech ቴክ የተሰራ' },
  
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
  'auth.logout': { en: 'Logout', am: 'ውጣ' },

  // Nav
  'nav.dashboard': { en: 'Dashboard', am: 'ዳሽቦርድ' },
  'nav.apartments': { en: 'Apartments', am: 'አፓርትመንቶች' },
  'nav.electricity': { en: 'Electricity', am: 'ኤሌክትሪክ' },
  'nav.water': { en: 'Water', am: 'ውሃ' },
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
