// Déclarations de type pour les composants du tableau de bord prestataire

declare module '../components/dashboard/ProfileSection' {
  interface ProfileSectionProps {
    profile: any;
    onProfileUpdate: () => void;
  }
  const ProfileSection: React.FC<ProfileSectionProps>;
  export default ProfileSection;
}

declare module '../components/dashboard/PortfolioSection' {
  interface PortfolioSectionProps {
    userId: string | undefined;
  }
  const PortfolioSection: React.FC<PortfolioSectionProps>;
  export default PortfolioSection;
}

declare module '../components/dashboard/ServicesSection' {
  interface ServicesSectionProps {
    userId: string | undefined;
  }
  const ServicesSection: React.FC<ServicesSectionProps>;
  export default ServicesSection;
}

declare module '../components/dashboard/BookingsSection' {
  interface BookingsSectionProps {
    userId: string | undefined;
  }
  const BookingsSection: React.FC<BookingsSectionProps>;
  export default BookingsSection;
}

declare module '../components/dashboard/AvailabilitySection' {
  interface AvailabilitySectionProps {
    userId: string | undefined;
  }
  const AvailabilitySection: React.FC<AvailabilitySectionProps>;
  export default AvailabilitySection;
}

declare module '../components/dashboard/StatsSection' {
  interface StatsSectionProps {
    userId: string | undefined;
  }
  const StatsSection: React.FC<StatsSectionProps>;
  export default StatsSection;
}

declare module '../components/dashboard/SettingsSection' {
  interface SettingsSectionProps {
    userId: string | undefined;
  }
  const SettingsSection: React.FC<SettingsSectionProps>;
  export default SettingsSection;
}

// Déclarations pour les modules FullCalendar
declare module '@fullcalendar/react' {
  import { ComponentType } from 'react';
  
  export interface FullCalendarProps {
    plugins?: any[];
    initialView?: string;
    headerToolbar?: {
      left?: string;
      center?: string;
      right?: string;
    };
    locale?: any;
    events?: any[];
    businessHours?: any[];
    height?: string | number;
    nowIndicator?: boolean;
    slotMinTime?: string;
    slotMaxTime?: string;
    allDaySlot?: boolean;
    slotDuration?: string;
    eventTimeFormat?: {
      hour?: string;
      minute?: string;
      hour12?: boolean;
    };
  }
  
  const FullCalendar: ComponentType<FullCalendarProps>;
  export default FullCalendar;
}

declare module '@fullcalendar/daygrid' {
  const plugin: any;
  export default plugin;
}

declare module '@fullcalendar/timegrid' {
  const plugin: any;
  export default plugin;
}

declare module '@fullcalendar/interaction' {
  const plugin: any;
  export default plugin;
}

declare module '@fullcalendar/core/locales/fr' {
  const locale: any;
  export default locale;
}
