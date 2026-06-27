export type Lang = 'en' | 'te';

// UI string dictionary. Data (names, amounts, etc.) is always stored in English
// in the DB — only the interface chrome is translated.
export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Sidebar / brand
    'brand.name': 'Hostel Manager',
    'nav.dashboard': 'Dashboard',
    'nav.hostels': 'Hostels',
    'nav.owners': 'Owners',
    'nav.rooms': 'Rooms',
    'nav.students': 'Students',
    'nav.monthlyFees': 'Monthly Fees',
    'nav.collections': 'Collections',
    'nav.incomes': 'Incomes',
    'nav.expenses': 'Expenses',
    'nav.reports': 'Reports',
    'nav.googleForm': 'Google Form',
    'nav.settings': 'Settings',
    'common.logout': 'Logout',
    'role.owner': 'Hostel Owner',
    'role.admin': 'Main Admin',

    // Settings header
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your app experience',
    'settings.mobile': 'Mobile',
    'settings.web': 'Web',
    'settings.tab.preferences': 'Preferences',
    'settings.tab.account': 'Account',
    'settings.tab.security': 'Security',
    'settings.tab.about': 'About',

    // Language
    'settings.language': 'Language',
    'settings.language.desc': 'Choose your preferred language',
    'lang.english': 'English',
    'lang.telugu': 'Telugu',

    // Theme
    'settings.theme': 'Theme Mode',
    'settings.theme.desc': 'Switch between light and dark mode',
    'settings.theme.light': 'Light',
    'settings.theme.lightDesc': 'Light theme',
    'settings.theme.dark': 'Dark',
    'settings.theme.darkDesc': 'Dark theme',

    // Primary color
    'settings.color': 'Primary Color',
    'settings.color.desc': 'Choose your favorite color theme',

    // Font
    'settings.font': 'Font Settings',
    'settings.font.desc': 'Customize text size and font style',
    'settings.font.size': 'Font Size',
    'settings.font.family': 'Font Family',
    'settings.font.preview': 'Preview',

    // Additional options
    'settings.options': 'Additional Options',
    'settings.opt.reduceMotion': 'Reduce Motion',
    'settings.opt.reduceMotion.desc': 'Minimize animations and transitions',
    'settings.opt.highContrast': 'High Contrast',
    'settings.opt.highContrast.desc': 'Increase contrast for better visibility',
    'settings.opt.compact': 'Show Compact Mode',
    'settings.opt.compact.desc': 'Display more content in less space',
    'settings.opt.haptic': 'Enable Haptic Feedback',
    'settings.opt.haptic.desc': 'Vibration feedback for actions',
    'settings.opt.keepScreen': 'Keep Screen On',
    'settings.opt.keepScreen.desc': 'Prevent screen from turning off',

    // Note
    'settings.note': 'Note:',
    'settings.note.text':
      'All changes are applied immediately and saved automatically. Your preferences will persist across sessions and devices.',

    // Feature cards
    'settings.features.title': "Additional Features You'll Love",
    'settings.feat.backup': 'Backup & Sync',
    'settings.feat.backup.desc': 'Sync your preferences across all your devices',
    'settings.feat.reset': 'Reset to Default',
    'settings.feat.reset.desc': 'Easily reset all settings to default values',
    'settings.feat.cross': 'Cross Platform',
    'settings.feat.cross.desc': 'Settings work seamlessly on mobile and web',
    'settings.feat.secure': 'Secure & Private',
    'settings.feat.secure.desc': 'Your preferences are encrypted and secure',
    'settings.feat.instant': 'Instant Apply',
    'settings.feat.instant.desc': 'All changes are applied instantly without restart',
    'settings.version': 'Version 1.0.0 • Hostel Manager',

    // Account / Security / About tabs
    'account.title': 'Account Information',
    'account.fullName': 'Full Name',
    'account.email': 'Email',
    'account.phone': 'Phone',
    'account.role': 'Role',
    'security.title': 'Security',
    'security.changePassword': 'Change Password',
    'security.current': 'Current Password',
    'security.new': 'New Password',
    'security.confirm': 'Confirm New Password',
    'security.update': 'Update Password',
    'about.title': 'About',
    'about.appName': 'Hostel Manager',
    'about.desc': 'A modern hostel management system for owners and administrators.',
    'common.reset': 'Reset to Default',
  },

  te: {
    // Sidebar / brand
    'brand.name': 'హాస్టల్ మేనేజర్',
    'nav.dashboard': 'డాష్‌బోర్డ్',
    'nav.hostels': 'హాస్టళ్లు',
    'nav.owners': 'యజమానులు',
    'nav.rooms': 'గదులు',
    'nav.students': 'విద్యార్థులు',
    'nav.monthlyFees': 'నెలవారీ ఫీజులు',
    'nav.collections': 'వసూళ్లు',
    'nav.incomes': 'ఆదాయం',
    'nav.expenses': 'ఖర్చులు',
    'nav.reports': 'నివేదికలు',
    'nav.googleForm': 'గూగుల్ ఫారం',
    'nav.settings': 'సెట్టింగ్‌లు',
    'common.logout': 'లాగ్ అవుట్',
    'role.owner': 'హాస్టల్ యజమాని',
    'role.admin': 'ప్రధాన అడ్మిన్',

    // Settings header
    'settings.title': 'సెట్టింగ్‌లు',
    'settings.subtitle': 'మీ యాప్ అనుభవాన్ని అనుకూలీకరించండి',
    'settings.mobile': 'మొబైల్',
    'settings.web': 'వెబ్',
    'settings.tab.preferences': 'ప్రాధాన్యతలు',
    'settings.tab.account': 'ఖాతా',
    'settings.tab.security': 'భద్రత',
    'settings.tab.about': 'గురించి',

    // Language
    'settings.language': 'భాష',
    'settings.language.desc': 'మీకు నచ్చిన భాషను ఎంచుకోండి',
    'lang.english': 'ఇంగ్లీష్',
    'lang.telugu': 'తెలుగు',

    // Theme
    'settings.theme': 'థీమ్ మోడ్',
    'settings.theme.desc': 'లైట్ మరియు డార్క్ మోడ్ మధ్య మారండి',
    'settings.theme.light': 'లైట్',
    'settings.theme.lightDesc': 'లైట్ థీమ్',
    'settings.theme.dark': 'డార్క్',
    'settings.theme.darkDesc': 'డార్క్ థీమ్',

    // Primary color
    'settings.color': 'ప్రాథమిక రంగు',
    'settings.color.desc': 'మీకు ఇష్టమైన రంగు థీమ్‌ను ఎంచుకోండి',

    // Font
    'settings.font': 'ఫాంట్ సెట్టింగ్‌లు',
    'settings.font.desc': 'టెక్స్ట్ పరిమాణం మరియు ఫాంట్ శైలిని అనుకూలీకరించండి',
    'settings.font.size': 'ఫాంట్ పరిమాణం',
    'settings.font.family': 'ఫాంట్ ఫ్యామిలీ',
    'settings.font.preview': 'ప్రివ్యూ',

    // Additional options
    'settings.options': 'అదనపు ఎంపికలు',
    'settings.opt.reduceMotion': 'మోషన్ తగ్గించు',
    'settings.opt.reduceMotion.desc': 'యానిమేషన్లు మరియు ట్రాన్సిషన్లను తగ్గించండి',
    'settings.opt.highContrast': 'హై కాంట్రాస్ట్',
    'settings.opt.highContrast.desc': 'మెరుగైన దృశ్యమానత కోసం కాంట్రాస్ట్ పెంచండి',
    'settings.opt.compact': 'కాంపాక్ట్ మోడ్',
    'settings.opt.compact.desc': 'తక్కువ స్థలంలో ఎక్కువ కంటెంట్ చూపించండి',
    'settings.opt.haptic': 'హాప్టిక్ ఫీడ్‌బ్యాక్',
    'settings.opt.haptic.desc': 'చర్యలకు వైబ్రేషన్ ఫీడ్‌బ్యాక్',
    'settings.opt.keepScreen': 'స్క్రీన్ ఆన్‌లో ఉంచు',
    'settings.opt.keepScreen.desc': 'స్క్రీన్ ఆఫ్ కాకుండా నిరోధించండి',

    // Note
    'settings.note': 'గమనిక:',
    'settings.note.text':
      'అన్ని మార్పులు వెంటనే వర్తింపజేయబడతాయి మరియు ఆటోమేటిక్‌గా సేవ్ చేయబడతాయి. మీ ప్రాధాన్యతలు సెషన్‌లు మరియు పరికరాల్లో కొనసాగుతాయి.',

    // Feature cards
    'settings.features.title': 'మీకు నచ్చే అదనపు ఫీచర్లు',
    'settings.feat.backup': 'బ్యాకప్ & సింక్',
    'settings.feat.backup.desc': 'మీ అన్ని పరికరాల్లో మీ ప్రాధాన్యతలను సింక్ చేయండి',
    'settings.feat.reset': 'డిఫాల్ట్‌కు రీసెట్ చేయి',
    'settings.feat.reset.desc': 'అన్ని సెట్టింగ్‌లను డిఫాల్ట్ విలువలకు సులభంగా రీసెట్ చేయండి',
    'settings.feat.cross': 'క్రాస్ ప్లాట్‌ఫారం',
    'settings.feat.cross.desc': 'సెట్టింగ్‌లు మొబైల్ మరియు వెబ్‌లో సజావుగా పనిచేస్తాయి',
    'settings.feat.secure': 'సురక్షితం & ప్రైవేట్',
    'settings.feat.secure.desc': 'మీ ప్రాధాన్యతలు ఎన్‌క్రిప్ట్ చేయబడ్డాయి మరియు సురక్షితం',
    'settings.feat.instant': 'తక్షణ వర్తింపు',
    'settings.feat.instant.desc': 'అన్ని మార్పులు రీస్టార్ట్ లేకుండా తక్షణమే వర్తింపజేయబడతాయి',
    'settings.version': 'వెర్షన్ 1.0.0 • హాస్టల్ మేనేజర్',

    // Account / Security / About tabs
    'account.title': 'ఖాతా సమాచారం',
    'account.fullName': 'పూర్తి పేరు',
    'account.email': 'ఇమెయిల్',
    'account.phone': 'ఫోన్',
    'account.role': 'పాత్ర',
    'security.title': 'భద్రత',
    'security.changePassword': 'పాస్‌వర్డ్ మార్చు',
    'security.current': 'ప్రస్తుత పాస్‌వర్డ్',
    'security.new': 'కొత్త పాస్‌వర్డ్',
    'security.confirm': 'కొత్త పాస్‌వర్డ్‌ను నిర్ధారించండి',
    'security.update': 'పాస్‌వర్డ్ నవీకరించు',
    'about.title': 'గురించి',
    'about.appName': 'హాస్టల్ మేనేజర్',
    'about.desc': 'యజమానులు మరియు నిర్వాహకుల కోసం ఆధునిక హాస్టల్ నిర్వహణ వ్యవస్థ.',
    'common.reset': 'డిఫాల్ట్‌కు రీసెట్ చేయి',
  },
};
