export interface GreetingInfo {
  title: string;
  subtitle: string;
  loginToast: string;
}

export function getDynamicGreeting(locale: string, name: string): GreetingInfo {
  const firstName = name.split(' ')[0] || name || 'Friend';
  const hour = new Date().getHours();
  const isAr = locale === 'ar';

  if (hour >= 5 && hour < 12) {
    // Morning
    return {
      title: isAr
        ? `صباح الفل والياسمين يا ${firstName}! ☕`
        : `Good morning, ${firstName}! ☕`,
      subtitle: isAr
        ? `يا فتاح يا عليم.. جاهز لشوية الشغل العنب دول النهاردة؟ 🚀`
        : `Fresh coffee & a brand new day! Let's crush these tasks 🚀`,
      loginToast: isAr
        ? `صباح القشطة يا ${firstName}! نورت مساحة العمل ☀️`
        : `Good morning ${firstName}! Workspace ready ☀️`,
    };
  } else if (hour >= 12 && hour < 18) {
    // Afternoon
    return {
      title: isAr
        ? `مساء الورد والروقان يا ${firstName}! ☀️`
        : `Good afternoon, ${firstName}! ☀️`,
      subtitle: isAr
        ? `عاش يا بطل! كمل شغال الله ينور ومفيش حاجة هتوقفنا 💥`
        : `Keep up the awesome momentum! You're killing it 💥`,
      loginToast: isAr
        ? `منور يا حبيبنا ${firstName}! شد حيلك 💪`
        : `Welcome back, ${firstName}! Let's make magic happen 💪`,
    };
  } else if (hour >= 18 && hour < 23) {
    // Evening
    return {
      title: isAr
        ? `مساء الفل والعسل يا ${firstName}! 🌙`
        : `Good evening, ${firstName}! 🌙`,
      subtitle: isAr
        ? `يا لهوي! كل دي مهمات ووراك شغل للركب يا باشا! 🔥`
        : `Oh my goodness! Look at all these tasks waiting for you! 🔥`,
      loginToast: isAr
        ? `يا هلا والله بـ ${firstName}! خطوة عزيزة ✨`
        : `Good evening ${firstName}! Great to see you ✨`,
    };
  } else {
    // Night (11pm - 4am)
    return {
      title: isAr
        ? `إيه يا ${firstName} يا بني إنت مانمتش ليه لحد دلوقتي! 🦉`
        : `Night owl mode activated, ${firstName}! 🦉`,
      subtitle: isAr
        ? `يا لهوي كل دي رسايل ومهمات فوق دماغك بالليل كدة! البس الخوذة بقى 🚀`
        : `Oh my god, look at all these messages and tasks you have! 🚀`,
      loginToast: isAr
        ? `إيه السهر ده يا ${firstName}! منور يا بطل الليل 🌙`
        : `Burning the midnight oil, ${firstName}? Welcome back! 🌙`,
    };
  }
}
