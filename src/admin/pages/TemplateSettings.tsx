import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Mail,
  Smartphone,
  Save,
  Sparkles,
  RefreshCw,
  Info,
  Check,
  BellRing,
  Send,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Activity,
  X,
  CheckCircle,
  Clock,
  Search
} from 'lucide-react';
import Swal from 'sweetalert2';
import axiosClient from '../../../axiosinstance';

interface TemplateItem {
  id: string;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email';
  templateId?: string; // for whatsapp
  subject?: string; // for email
  body: string;
  status?: number; // 1 = enabled, 0 = disabled
  category?: string; // trigger category, e.g. ACCOUNT_CREATION
  templateCode?: string; // raw code
}

interface EventTrigger {
  id: string;
  name: string;
  description: string;
  category: 'lead' | 'visit' | 'booking' | 'broker' | 'commission';
  variables: { name: string; label: string; mockValue: string }[];
  whatsappTemplateId: string; // references TemplateItem.id
  whatsappEnabled: boolean;
  smsTemplateId: string; // references TemplateItem.id
  smsEnabled: boolean;
  emailTemplateId: string; // references TemplateItem.id
  emailEnabled: boolean;
  apiSettingId?: number; // DB row ID
}

// Initial Content Templates Library
const initialTemplates: TemplateItem[] = [
  {
    id: 'wa_lead_welcome',
    name: 'Lead Welcome WA',
    channel: 'whatsapp',
    templateId: 'lead_registration_client_v1',
    body: 'Hello {{customer_name}}, thank you for choosing BrokerConnect! Your lead profile has been successfully registered by our certified partner {{broker_name}} (Ref: {{lead_id}}). Our executive will reach out to you shortly to discuss your property requirements.'
  },
  {
    id: 'sms_lead_welcome',
    name: 'Lead Welcome SMS',
    channel: 'sms',
    body: 'BrokerConnect: Hello {{customer_name}}, your lead has been registered by broker {{broker_name}}. Ref ID: {{lead_id}}. Contact us: support@brokerconnect.io'
  },
  {
    id: 'email_lead_welcome',
    name: 'Lead Welcome Email',
    channel: 'email',
    subject: 'BrokerConnect - Lead Profile Registered (Ref: {{lead_id}})',
    body: 'Dear {{customer_name}},\n\nWelcome to BrokerConnect!\n\nWe are pleased to inform you that your property search profile has been successfully registered in our system by our broker partner {{broker_name}}.\n\nYour Lead Reference: {{lead_id}}\nBroker Consultant: {{broker_name}}\n\nWhat happens next?\nOur dedicated customer relationship officer will contact you within the next 24 hours to help match your requirements with our active projects like Elysium Towers.\n\nThank you for choosing BrokerConnect!\n\nBest regards,\nBrokerConnect Team\nwww.brokerconnect.io'
  },
  {
    id: 'wa_visit_pass',
    name: 'Visit Pass WA',
    channel: 'whatsapp',
    templateId: 'site_visit_pass_v3',
    body: 'Hi {{customer_name}}! 🚀 Your digital Site Visit Pass for {{project_name}} has been generated.\n\nDate: {{visit_date}}\nAccess Pass Code: {{pass_code}}\n\nPlease present this entry code at the site reception desk upon arrival. We look forward to showing you your dream home!'
  },
  {
    id: 'sms_visit_pass',
    name: 'Visit Pass SMS',
    channel: 'sms',
    body: 'Your Site Visit Pass for {{project_name}} is ready. Code: {{pass_code}} on {{visit_date}}. Map link: https://maps.google.com/?q=Elysium. BrokerConnect.'
  },
  {
    id: 'email_visit_pass',
    name: 'Visit Pass Email',
    channel: 'email',
    subject: 'Your Digital Entry Pass for {{project_name}} (Code: {{pass_code}})',
    body: 'Dear {{customer_name}},\n\nYour site visit registration is complete! We look forward to welcoming you to the site.\n\nEntry Details:\nProject: {{project_name}}\nScheduled Date: {{visit_date}}\nDigital Pass Code: {{pass_code}}\n\nHow to get there:\nLocation Link: https://maps.google.com/?q=Elysium+Pune\n\nPlease keep this email or pass code ready at the entry gate/reception for a seamless check-in experience.\n\nIf you have any questions or need to reschedule, please contact your partner broker.\n\nWarm regards,\nSite Operations Team\nBrokerConnect'
  },
  {
    id: 'wa_booking_confirmed',
    name: 'Booking Confirmed WA',
    channel: 'whatsapp',
    templateId: 'booking_confirmation_v2',
    body: 'Congratulations {{customer_name}}! 🎉 Your booking is officially confirmed for Unit {{unit_number}} at {{project_name}}.\n\nAgreement Value: {{agreement_value}}\nBooking Deposit Received: {{booking_amount}}\n\nThank you for choosing BrokerConnect. Welcome to the elite family!'
  },
  {
    id: 'sms_booking_confirmed',
    name: 'Booking Confirmed SMS',
    channel: 'sms',
    body: 'Congratulations {{customer_name}}! Booking confirmed for Unit {{unit_number}} at {{project_name}}. Value: {{agreement_value}}. Receipt: BrokerConnect.'
  },
  {
    id: 'email_booking_confirmed',
    name: 'Booking Confirmed Email',
    channel: 'email',
    subject: 'Booking Confirmation: Unit {{unit_number}}, {{project_name}}',
    body: 'Dear {{customer_name}},\n\nCongratulations on purchasing your new residence with BrokerConnect!\n\nWe are delighted to confirm that your booking has been processed successfully. Below is the summary of your transaction:\n\nBooking Summary:\nProject: {{project_name}}\nUnit Number: {{unit_number}}\nAgreement Value: {{agreement_value}}\nBooking Deposit Paid: {{booking_amount}}\n\nNext Steps:\nOur customer support manager will get in touch with you within the next 48 hours to share the sale agreement draft and schedule the registration process.\n\nShould you have any urgent queries, feel free to reply directly to this mail.\n\nWelcome home!\n\nBest regards,\nCustomer CRM Department\nBrokerConnect'
  },
  {
    id: 'wa_broker_verified',
    name: 'Broker Verification WA',
    channel: 'whatsapp',
    templateId: 'broker_onboard_v1',
    body: 'Hello {{broker_name}}! 🤝 We are excited to welcome you to our network. Your partner account representing {{agency_name}} has been verified and activated by BrokerConnect.\n\nYour assigned Relationship Manager is {{rm_name}}. You can now log into your broker portal to submit leads and start earning commissions!'
  },
  {
    id: 'sms_broker_verified',
    name: 'Broker Verification SMS',
    channel: 'sms',
    body: 'Welcome {{broker_name}}! Your BrokerConnect Partner portal account for {{agency_name}} is now active. Start registering leads. RM: {{rm_name}}.'
  },
  {
    id: 'email_broker_verified',
    name: 'Broker Verification Email',
    channel: 'email',
    subject: 'Welcome to BrokerConnect Partner Network - Account Activated',
    body: 'Dear {{broker_name}},\n\nWelcome to BrokerConnect\'s Broker Partner Network!\n\nWe are pleased to inform you that your registration representing {{agency_name}} has been reviewed and verified by our partner relations department.\n\nYour account is now fully active, allowing you to:\n1. Register client leads and secure commission tracking\n2. Issue entry site visit passes instantly\n3. Track booking progress and payout claims in real-time\n\nAssigned Relationship Manager:\nName: {{rm_name}}\nSupport Contact: partnersupport@brokerconnect.io\n\nTo log in, please visit: https://portal.brokerconnect.io/login\n\nWe look forward to a mutually beneficial partnership.\n\nWarm regards,\nPartner Relations Team\nBrokerConnect'
  },
  {
    id: 'wa_commission_paid',
    name: 'Commission Payout WA',
    channel: 'whatsapp',
    templateId: 'payout_processed_v1',
    body: 'Hello {{broker_name}}! 💰 Your commission payout of {{amount}} for booking at {{project_name}} has been processed. Trans Ref: {{transaction_ref}}.'
  },
  {
    id: 'sms_commission_paid',
    name: 'Commission Payout SMS',
    channel: 'sms',
    body: 'BrokerConnect Payout: Commission of {{amount}} for {{project_name}} has been sent. Transaction Ref: {{transaction_ref}}. Thank you, Partner!'
  },
  {
    id: 'email_commission_paid',
    name: 'Commission Payout Email',
    channel: 'email',
    subject: 'Commission Payout Processed - {{project_name}} (Ref: {{transaction_ref}})',
    body: 'Dear {{broker_name}},\n\nWe are pleased to inform you that your commission payout request has been processed and disbursed to your registered bank account.\n\nTransaction Details:\nProject: {{project_name}}\nPayout Amount: {{amount}}\nBank Reference ID: {{transaction_ref}}\nStatus: Disbursed\n\nThe payout amount should be credited to your account within 24 working hours.\n\nThank you for your valuable contribution and partnership with BrokerConnect.\n\nSincerely,\nFinance Department\nBrokerConnect'
  }
];

// Initial Event triggers mapping
const initialEvents: EventTrigger[] = [
  {
    id: 'broker_verified',
    name: 'ACCOUNT_CREATION',
    description: 'When an admin verifies and activates a new broker registration',
    category: 'broker',
    variables: [
      { name: '{{broker_name}}', label: 'Broker Name', mockValue: 'Rajesh Kulkarni' },
      { name: '{{agency_name}}', label: 'Agency Name', mockValue: 'Apex Real Estate' },
      { name: '{{rm_name}}', label: 'RM Name', mockValue: 'Vikram Mehta' }
    ],
    whatsappTemplateId: 'wa_broker_verified',
    whatsappEnabled: true,
    smsTemplateId: 'sms_broker_verified',
    smsEnabled: true,
    emailTemplateId: 'email_broker_verified',
    emailEnabled: true
  },
  {
    id: 'booking_confirmed',
    name: 'BOOKING_CREATED',
    description: 'When a lead booking application is approved by admin',
    category: 'booking',
    variables: [
      { name: '{{customer_name}}', label: 'Customer Name', mockValue: 'Sanjay Singhania' },
      { name: '{{project_name}}', label: 'Project Name', mockValue: 'Elysium Towers' },
      { name: '{{unit_number}}', label: 'Unit Number', mockValue: 'A-1203' },
      { name: '{{agreement_value}}', label: 'Agreement Value', mockValue: '₹85,00,000' },
      { name: '{{booking_amount}}', label: 'Booking Amount', mockValue: '₹5,00,000' }
    ],
    whatsappTemplateId: 'wa_booking_confirmed',
    whatsappEnabled: true,
    smsTemplateId: 'sms_booking_confirmed',
    smsEnabled: true,
    emailTemplateId: 'email_booking_confirmed',
    emailEnabled: true
  },
  {
    id: 'visit_pass_generated',
    name: 'VISIT_SCHEDULED',
    description: 'When a digital entry pass is created for a customer site visit',
    category: 'visit',
    variables: [
      { name: '{{customer_name}}', label: 'Customer Name', mockValue: 'Aarti Patil' },
      { name: '{{project_name}}', label: 'Project Name', mockValue: 'Elysium Towers' },
      { name: '{{visit_date}}', label: 'Visit Date', mockValue: 'June 25, 2026' },
      { name: '{{pass_code}}', label: 'Pass Code', mockValue: 'VP-4012' }
    ],
    whatsappTemplateId: 'wa_visit_pass',
    whatsappEnabled: true,
    smsTemplateId: 'sms_visit_pass',
    smsEnabled: true,
    emailTemplateId: 'email_visit_pass',
    emailEnabled: true
  }
];

const fallbackPlaceholders: Record<string, { key: string; description: string }[]> = {
  GLOBAL: [
    { key: "{{CustomerName}}", description: "Customer Name" },
    { key: "{{CustomerMobile}}", description: "Customer Mobile Number" },
    { key: "{{CustomerEmail}}", description: "Customer Email" },
    { key: "{{ProjectName}}", description: "Project Name" }
  ],
  ACCOUNT_CREATION: [
    { key: "{{CustomerName}}", description: "Customer Name" },
    { key: "{{CustomerMobile}}", description: "Customer Mobile Number" },
    { key: "{{CustomerEmail}}", description: "Customer Email" }
  ],
  BOOKING_CREATED: [
    { key: "{{CustomerName}}", description: "Customer Name" },
    { key: "{{CustomerMobile}}", description: "Customer Mobile Number" },
    { key: "{{CustomerEmail}}", description: "Customer Email" },
    { key: "{{ProjectName}}", description: "Project Name" },
    { key: "{{BookingDate}}", description: "Booking Date" },
    { key: "{{BookingUnitNumber}}", description: "Booking Unit Number" },
    { key: "{{BookingTower}}", description: "Booking Tower" },
    { key: "{{BookingFloor}}", description: "Booking Floor" },
    { key: "{{BookingAmount}}", description: "Booking Amount" }
  ],
  VISIT_SCHEDULED: [
    { key: "{{CustomerName}}", description: "Customer Name" },
    { key: "{{CustomerMobile}}", description: "Customer Mobile Number" },
    { key: "{{CustomerEmail}}", description: "Customer Email" },
    { key: "{{ProjectName}}", description: "Project Name" },
    { key: "{{VisitScheduledDate}}", description: "Visit Scheduled Date" },
    { key: "{{VisitScheduledTime}}", description: "Visit Scheduled Time" }
  ]
};

export const TemplateSettings: React.FC = () => {
  // Navigation Tab State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'events' | 'templates'>('events');
  const [selectedChannelTab, setSelectedChannelTab] = useState<'whatsapp' | 'sms' | 'email'>('email');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleChannelTabChange = (channel: 'whatsapp' | 'sms' | 'email') => {
    setSelectedChannelTab(channel);
    setCurrentPage(1); // Reset page on tab change
    const firstOfChannel = templates.find(t => t.channel === channel);
    if (firstOfChannel) {
      setSelectedTemplateId(firstOfChannel.id);
    }
  };

  // Core Data States
  const [templates, setTemplates] = useState<TemplateItem[]>(() => {
    const saved = localStorage.getItem('message_templates_lib');
    return saved ? JSON.parse(saved) : initialTemplates;
  });

  const [events, setEvents] = useState<EventTrigger[]>(initialEvents);
  const [loading, setLoading] = useState(true);

  // Selected item inside Template Library
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem('message_templates_lib');
    const list = saved ? JSON.parse(saved) : initialTemplates;
    const firstEmail = list.find((t: any) => t.channel === 'email');
    return firstEmail ? firstEmail.id : (list[0] ? list[0].id : '');
  });

  // Template Editing Local States
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingTemplateChannel, setEditingTemplateChannel] = useState<'whatsapp' | 'sms' | 'email'>('email');
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [editingTemplateSubject, setEditingTemplateSubject] = useState('');
  const [editingTemplateBody, setEditingTemplateBody] = useState('');
  const [activeInputId, setActiveInputId] = useState<string>('template-body');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingTemplateCode, setEditingTemplateCode] = useState('');
  const [editingTemplateCategory, setEditingTemplateCategory] = useState('');

  // Modal Preview States
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  const [apiPlaceholders, setApiPlaceholders] = useState<Record<string, { key: string; description: string }[]>>(fallbackPlaceholders);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const previewEvent = events.find(e => e.id === previewEventId);

  // Match and fetch placeholder list for trigger category, showing GLOBAL by default
  const getPlaceholdersForCategory = (category: string) => {
    const globalList = apiPlaceholders['GLOBAL'] || [];
    let catList: { key: string; description: string }[] = [];

    if (category) {
      const normalized = category.toUpperCase().replace(/\s+/g, '_');
      if (apiPlaceholders[normalized]) {
        catList = apiPlaceholders[normalized];
      } else {
        const foundKey = Object.keys(apiPlaceholders).find(k =>
          k.includes(normalized) || normalized.includes(k)
        );
        if (foundKey) {
          catList = apiPlaceholders[foundKey];
        }
      }
    }

    // Merge globalList and catList, deduplicating by 'key'
    const merged = [...globalList];
    catList.forEach(item => {
      if (!merged.some(m => m.key === item.key)) {
        merged.push(item);
      }
    });

    return merged;
  };

  // Replace standard placeholders with realistic mock values in simulator preview
  const renderPreviewBody = (bodyText: string, category: string) => {
    if (!bodyText) return '';
    let output = bodyText;

    const placeholders = getPlaceholdersForCategory(category);

    placeholders.forEach(p => {
      const label = p.key.replace(/[{}]/g, '');
      const mockVal = `[${label}]`;
      output = output.split(p.key).join(mockVal);
      // Also check standard lowercase formats
      const lowKey = p.key.toLowerCase();
      output = output.split(lowKey).join(mockVal);
    });

    return output;
  };

  // Fetch placeholders from server API
  useEffect(() => {
    const fetchPlaceholders = async () => {
      try {
        const response = await axiosClient.get('/templates/placeholders');
        if (response.data && response.data.success && response.data.data) {
          setApiPlaceholders(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load placeholders from server API:', err);
      }
    };
    fetchPlaceholders();
  }, []);

  // Fetch settings from server API and map to local states
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/templates/settings');
        if (response.data && response.data.settings) {
          const apiSettings = response.data.settings;

          // Map API settings categories to corresponding local trigger metadata
          const mapped = apiSettings.map((s: any) => {
            let baseEvent = initialEvents.find(e => {
              if (s.category === 'ACCOUNT_CREATION') return e.id === 'broker_verified';
              if (s.category === 'BOOKING_CREATED') return e.id === 'booking_confirmed';
              if (s.category === 'VISIT_SCHEDULED') return e.id === 'visit_pass_generated';
              return false;
            });

            if (!baseEvent) {
              baseEvent = {
                id: s.category.toLowerCase(),
                name: s.category.replace('_', ' '),
                description: `Outgoing template trigger config for category ${s.category}`,
                category: 'lead',
                variables: [
                  { name: '{{customer_name}}', label: 'Customer Name', mockValue: 'Rohan Sharma' }
                ],
                whatsappTemplateId: 'wa_lead_welcome',
                whatsappEnabled: s.whatsappEnabled,
                smsTemplateId: 'sms_lead_welcome',
                smsEnabled: s.smsEnabled,
                emailTemplateId: 'email_lead_welcome',
                emailEnabled: s.emailEnabled
              };
            }

            return {
              ...baseEvent,
              id: s.category, // Use API category string as ID for direct comparison
              name: s.category,
              apiSettingId: s.id,
              whatsappEnabled: s.whatsappEnabled,
              smsEnabled: s.smsEnabled,
              emailEnabled: s.emailEnabled
            };
          });

          setEvents(mapped);
        }
      } catch (error) {
        console.error('Failed to load settings from server API:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [activeSettingsTab]);

  // Fetch email templates from backend API
  useEffect(() => {
    if (activeSettingsTab !== 'templates') return;
    const fetchEmailTemplates = async () => {
      try {
        const response = await axiosClient.get('/templates/email');
        if (response.data && response.data.templates) {
          const apiEmailTemplates = response.data.templates.map((t: any) => ({
            id: `email_${t.id}`,
            name: t.templateName,
            channel: 'email',
            subject: t.subject,
            body: t.templateBody,
            templateId: t.templateCode,
            templateCode: t.templateCode,
            category: t.category,
            status: t.status
          }));

          setTemplates(prev => {
            const nonEmail = prev.filter(item => item.channel !== 'email');
            return [...nonEmail, ...apiEmailTemplates];
          });
        }
      } catch (err) {
        console.error('Error fetching email templates:', err);
      }
    };

    fetchEmailTemplates();
  }, [activeSettingsTab]);

  // Fetch SMS templates from backend API
  useEffect(() => {
    if (activeSettingsTab !== 'templates') return;
    const fetchSmsTemplates = async () => {
      try {
        const response = await axiosClient.get('/templates/sms');
        if (response.data && response.data.templates) {
          const apiSmsTemplates = response.data.templates.map((t: any) => ({
            id: `sms_${t.id}`,
            name: t.templateName,
            channel: 'sms',
            body: t.templateBody,
            templateId: t.templateCode,
            templateCode: t.templateCode,
            category: t.category,
            status: t.status
          }));

          setTemplates(prev => {
            const nonSms = prev.filter(item => item.channel !== 'sms');
            return [...nonSms, ...apiSmsTemplates];
          });
        }
      } catch (err) {
        console.error('Error fetching SMS templates:', err);
      }
    };

    fetchSmsTemplates();
  }, [activeSettingsTab]);

  // Ensure robust selectedTemplateId selection on list updates
  useEffect(() => {
    if (templates.length > 0) {
      const exists = templates.some(t => t.id === selectedTemplateId);
      if (!exists) {
        const firstOfTab = templates.find(t => t.channel === selectedChannelTab) || templates[0];
        if (firstOfTab) {
          setSelectedTemplateId(firstOfTab.id);
        }
      }
    }
  }, [templates, selectedChannelTab, selectedTemplateId]);

  // Sync selectedChannelTab when selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      setSelectedChannelTab(selectedTemplate.channel);
    }
  }, [selectedTemplateId]);

  // Sync editor fields when selected template changes
  useEffect(() => {
    if (selectedTemplate && !isCreatingNew) {
      setEditingTemplateName(selectedTemplate.name);
      setEditingTemplateChannel(selectedTemplate.channel);
      setEditingTemplateId(selectedTemplate.templateId || '');
      setEditingTemplateSubject(selectedTemplate.subject || '');
      setEditingTemplateBody(selectedTemplate.body);
      setEditingTemplateCode(selectedTemplate.templateCode || selectedTemplate.templateId || '');
      setEditingTemplateCategory(selectedTemplate.category || '');
      setActiveInputId('template-body');
    }
  }, [selectedTemplateId, activeSettingsTab, isCreatingNew]);

  // Insert placeholder at cursor helper
  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById(activeInputId) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!textarea) {
      if (activeInputId === 'template-subject') {
        setEditingTemplateSubject(prev => prev + placeholder);
      } else {
        setEditingTemplateBody(prev => prev + placeholder);
      }
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + placeholder + after;

    if (activeInputId === 'template-subject') {
      setEditingTemplateSubject(newValue);
    } else {
      setEditingTemplateBody(newValue);
    }

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Handle single backspace deleting entire placeholder block (e.g. {{CustomerName}})
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, field: 'subject' | 'body') => {
    if (e.key === 'Backspace') {
      const target = e.currentTarget;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;

      // Only run custom backspace logic if there's no active highlight selection
      if (start === end && start > 0) {
        const text = target.value;
        const textBeforeCursor = text.substring(0, start);

        // Match standard variable format ending at the cursor
        const match = textBeforeCursor.match(/\{\{[A-Za-z0-9_]+\}\}$/);
        if (match) {
          e.preventDefault();
          const placeholderLength = match[0].length;
          const newStart = start - placeholderLength;
          const newValue = text.substring(0, newStart) + text.substring(start);

          if (field === 'subject') {
            setEditingTemplateSubject(newValue);
          } else {
            setEditingTemplateBody(newValue);
          }

          // Restore cursor index position on next event loop tick
          setTimeout(() => {
            target.focus();
            target.setSelectionRange(newStart, newStart);
          }, 0);
        }
      }
    }
  };

  // Toggle/Change event triggers directly from grid & save to Server API
  const handleSaveEventMapping = async (eventId: string, updates: Partial<EventTrigger>) => {
    // 1. Update local state
    const updatedEvents = events.map(ev => {
      if (ev.id === eventId) {
        return { ...ev, ...updates };
      }
      return ev;
    });
    setEvents(updatedEvents);

    // 2. Persist to server API
    const targetEvent = updatedEvents.find(ev => ev.id === eventId);
    if (targetEvent) {
      try {
        await axiosClient.put(`/templates/settings/${eventId}`, {
          whatsappEnabled: targetEvent.whatsappEnabled,
          smsEnabled: targetEvent.smsEnabled,
          emailEnabled: targetEvent.emailEnabled
        });

        // Show a mini subtle toast on the right
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true,
          title: 'Settings updated successfully',
          icon: 'success'
        });
      } catch (error) {
        console.error('Failed to sync setting update to Server API:', error);
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          title: 'Failed to update settings',
          icon: 'error'
        });
      }
    }
  };

  // Save/Update template content in Library
  const handleSaveTemplateContent = async () => {
    if (!editingTemplateName.trim()) {
      Swal.fire('Error', 'Template Name is required', 'error');
      return;
    }

    // Check if it is a server email template
    const dbIdMatch = selectedTemplateId.match(/^email_(\d+)$/);
    if (dbIdMatch) {
      const dbId = dbIdMatch[1];
      try {
        await axiosClient.put(`/templates/email/${dbId}`, {
          templateName: editingTemplateName,
          subject: editingTemplateSubject,
          templateBody: editingTemplateBody,
          status: selectedTemplate.status !== undefined ? selectedTemplate.status : 1,
          templateCode: editingTemplateCode || "",
          category: editingTemplateCategory || ""
        });
      } catch (err) {
        console.error('Failed to save email template to server:', err);
        Swal.fire('Error', 'Failed to save template to server API', 'error');
        return;
      }
    }

    // Check if it is a server SMS template
    const smsDbIdMatch = selectedTemplateId.match(/^sms_(\d+)$/);
    if (smsDbIdMatch) {
      const dbId = smsDbIdMatch[1];
      try {
        await axiosClient.put(`/templates/sms/${dbId}`, {
          templateName: editingTemplateName,
          templateBody: editingTemplateBody,
          status: selectedTemplate.status !== undefined ? selectedTemplate.status : 1,
          templateCode: editingTemplateCode || "",
          category: editingTemplateCategory || ""
        });
      } catch (err) {
        console.error('Failed to save SMS template to server:', err);
        Swal.fire('Error', 'Failed to save template to server API', 'error');
        return;
      }
    }

    const updated = templates.map(t => {
      if (t.id === selectedTemplateId) {
        return {
          ...t,
          name: editingTemplateName,
          channel: editingTemplateChannel,
          templateId: editingTemplateChannel === 'whatsapp' ? editingTemplateId : t.templateId,
          subject: editingTemplateChannel === 'email' ? editingTemplateSubject : undefined,
          body: editingTemplateBody,
          templateCode: editingTemplateCode,
          category: editingTemplateCategory
        };
      }
      return t;
    });

    setTemplates(updated);
    localStorage.setItem('message_templates_lib', JSON.stringify(updated));

    Swal.fire({
      title: 'Saved!',
      text: 'Template content successfully saved in Library.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  // Create new template in Library (opens inline editor modal in create mode)
  const handleCreateNewTemplate = () => {
    setIsCreatingNew(true);
    setEditingTemplateName('');
    setEditingTemplateChannel(selectedChannelTab);
    setEditingTemplateId('');
    setEditingTemplateSubject('');
    setEditingTemplateBody('');
    setEditingTemplateCode('');
    // Default to the first available category, or ACCOUNT_CREATION
    setEditingTemplateCategory(events[0]?.id || 'ACCOUNT_CREATION');
    setIsEditorOpen(true);
  };

  // Perform backend POST API template creation from editor modal inputs
  const handleCreateNewTemplateFromModal = async () => {
    if (!editingTemplateName.trim()) {
      Swal.fire('Error', 'Template Name is required', 'error');
      return;
    }
    if (!editingTemplateCode.trim()) {
      Swal.fire('Error', 'Template Code is required', 'error');
      return;
    }
    if (!editingTemplateBody.trim()) {
      Swal.fire('Error', 'Template Body is required', 'error');
      return;
    }

    if (editingTemplateChannel === 'email') {
      if (!editingTemplateSubject.trim()) {
        Swal.fire('Error', 'Subject Line is required for Email template', 'error');
        return;
      }

      try {
        const payload = {
          templateName: editingTemplateName,
          templateCode: editingTemplateCode,
          category: editingTemplateCategory,
          subject: editingTemplateSubject,
          templateBody: editingTemplateBody,
          status: 1
        };

        const response = await axiosClient.post('/templates/email', payload);
        if (response.data && response.data.template) {
          const newT = response.data.template;
          const newTemplateItem: TemplateItem = {
            id: `email_${newT.id}`,
            name: newT.templateName,
            channel: 'email',
            subject: newT.subject,
            body: newT.templateBody,
            templateId: newT.templateCode,
            templateCode: newT.templateCode,
            category: newT.category,
            status: newT.status
          };

          setTemplates(prev => [...prev, newTemplateItem]);
          setSelectedTemplateId(newTemplateItem.id);
          setIsCreatingNew(false); // Switch to edit mode smoothly

          Swal.fire({
            title: 'Created!',
            text: 'Email template created successfully on server.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (err) {
        console.error('Failed to create email template on server:', err);
        Swal.fire('Error', 'Failed to create template on server API', 'error');
      }
    } else if (editingTemplateChannel === 'sms') {
      try {
        const payload = {
          templateName: editingTemplateName,
          templateCode: editingTemplateCode,
          category: editingTemplateCategory,
          templateBody: editingTemplateBody,
          status: 1
        };

        const response = await axiosClient.post('/templates/sms', payload);
        if (response.data && response.data.template) {
          const newT = response.data.template;
          const newTemplateItem: TemplateItem = {
            id: `sms_${newT.id}`,
            name: newT.templateName,
            channel: 'sms',
            body: newT.templateBody,
            templateId: newT.templateCode,
            templateCode: newT.templateCode,
            category: newT.category,
            status: newT.status
          };

          setTemplates(prev => [...prev, newTemplateItem]);
          setSelectedTemplateId(newTemplateItem.id);
          setIsCreatingNew(false); // Switch to edit mode smoothly

          Swal.fire({
            title: 'Created!',
            text: 'SMS template created successfully on server.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (err) {
        console.error('Failed to create SMS template on server:', err);
        Swal.fire('Error', 'Failed to create template on server API', 'error');
      }
    } else {
      // WhatsApp or custom fallback
      const newId = `template_${Date.now()}`;
      const newTemplateItem: TemplateItem = {
        id: newId,
        name: editingTemplateName,
        channel: editingTemplateChannel,
        templateId: editingTemplateId || editingTemplateCode,
        templateCode: editingTemplateCode,
        category: editingTemplateCategory,
        body: editingTemplateBody,
        status: 1
      };

      const updated = [...templates, newTemplateItem];
      setTemplates(updated);
      localStorage.setItem('message_templates_lib', JSON.stringify(updated));
      setSelectedTemplateId(newId);
      setIsCreatingNew(false);

      Swal.fire({
        title: 'Created!',
        text: 'New template added to library. Start editing now.',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false
      });
    }
  };

  // Delete template from Library
  const handleDeleteTemplate = () => {
    Swal.fire({
      title: 'Delete Template?',
      text: 'This will remove the template from the library. Triggers using this template will fallback.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Yes, delete it'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = templates.filter(t => t.id !== selectedTemplateId);
        setTemplates(updated);
        localStorage.setItem('message_templates_lib', JSON.stringify(updated));
        if (updated.length > 0) {
          setSelectedTemplateId(updated[0].id);
        }

        Swal.fire('Deleted!', 'Template has been deleted.', 'success');
      }
    });
  };

  // Restore factory defaults (API settings should be reset on backend, locally we reset template content)
  const handleResetAllFactoryDefaults = () => {
    Swal.fire({
      title: 'Restore Factory Defaults?',
      text: 'This will reset templates library back to default content layouts.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'Yes, restore all!'
    }).then((result) => {
      if (result.isConfirmed) {
        setTemplates(initialTemplates);
        localStorage.removeItem('message_templates_lib');
        setSelectedTemplateId(initialTemplates[0].id);
        Swal.fire('Restored!', 'Templates library successfully reset.', 'success');
      }
    });
  };

  const handleSendTestNotification = (channel: 'whatsapp' | 'sms' | 'email', templateBody: string, templateSubject?: string) => {
    Swal.fire({
      title: `Send Test ${channel.toUpperCase()}`,
      html: `
        <div class="text-left space-y-3 p-1">
          <label class="text-xs font-bold text-slate-600 block">Recipient Address</label>
          <input id="test-recipient" type="text" class="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none" placeholder="${channel === 'email' ? 'e.g. user@domain.com' : 'e.g. +91 9999988888'}" />
          <p class="text-[10px] text-slate-400 mt-1 font-sans">Dispatches simulated notification utilizing mock event parameters values.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send Simulation',
      confirmButtonColor: '#2563EB',
      cancelButtonColor: '#94A3B8',
      preConfirm: () => {
        const val = (document.getElementById('test-recipient') as HTMLInputElement).value;
        if (!val) {
          Swal.showValidationMessage('Recipient input required');
        }
        return val;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Dispatched!', `Simulated notification sent to ${result.value}.`, 'success');
      }
    });
  };

  const getMappedTemplateForEvent = (event: EventTrigger, channel: 'whatsapp' | 'sms' | 'email') => {
    const defaultId = channel === 'whatsapp' ? event.whatsappTemplateId :
      channel === 'sms' ? event.smsTemplateId : event.emailTemplateId;

    // First try by exact ID match
    let found = templates.find(t => t.id === defaultId);
    if (found) return found;

    // Next try by active template with matching channel and category (event.name is the category, e.g. ACCOUNT_CREATION)
    found = templates.find(t => t.channel === channel && t.category === event.name && t.status === 1);
    if (found) return found;

    // Next try by any template with matching channel and category
    found = templates.find(t => t.channel === channel && t.category === event.name);
    if (found) return found;

    // Fallback: see if we can find by old local ID prefixes
    const legacyMap: Record<string, string> = {
      'ACCOUNT_CREATION': 'broker_verified',
      'BOOKING_CREATED': 'booking_confirmed',
      'VISIT_SCHEDULED': 'visit_pass_generated'
    };
    const legacyId = legacyMap[event.name] || event.id;
    const fallbackId = `${channel === 'whatsapp' ? 'wa' : channel}_${legacyId}`;
    found = templates.find(t => t.id === fallbackId);
    if (found) return found;

    // Last resort: find any template for that channel
    return templates.find(t => t.channel === channel);
  };

  const renderMockBody = (bodyText: string, eventVariables: { name: string; mockValue: string }[]) => {
    let output = bodyText;
    eventVariables.forEach(v => {
      output = output.split(v.name).join(v.mockValue);
    });
    return output;
  };



  // Toggle template status (enable/disable)
  const handleToggleTemplateStatus = async (templateId: string, isEnabled: boolean) => {
    const nextStatus = isEnabled ? 1 : 0;

    // 1. Update local state
    const updated = templates.map(t => {
      if (t.id === templateId) {
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTemplates(updated);
    localStorage.setItem('message_templates_lib', JSON.stringify(updated));

    // 2. Persist email template status update to Server API
    const dbIdMatch = templateId.match(/^email_(\d+)$/);
    if (dbIdMatch) {
      const dbId = dbIdMatch[1];
      const target = updated.find(t => t.id === templateId);
      if (target) {
        try {
          await axiosClient.put(`/templates/email/${dbId}`, {
            templateName: target.name,
            subject: target.subject || "",
            templateBody: target.body,
            status: nextStatus,
            templateCode: target.templateCode || target.templateId || "",
            category: target.category || ""
          });

          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
            title: `Template ${isEnabled ? 'Enabled' : 'Disabled'}`,
            icon: 'success'
          });
        } catch (err) {
          console.error('Failed to update email template status on server:', err);
          // Rollback local state
          setTemplates(templates);
          localStorage.setItem('message_templates_lib', JSON.stringify(templates));
          Swal.fire('Error', 'Failed to update template status on server API', 'error');
        }
      }
    }

    // 3. Persist SMS template status update to Server API
    const smsDbIdMatch = templateId.match(/^sms_(\d+)$/);
    if (smsDbIdMatch) {
      const dbId = smsDbIdMatch[1];
      const target = updated.find(t => t.id === templateId);
      if (target) {
        try {
          await axiosClient.put(`/templates/sms/${dbId}`, {
            templateName: target.name,
            templateBody: target.body,
            status: nextStatus,
            templateCode: target.templateCode || target.templateId || "",
            category: target.category || ""
          });

          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500,
            title: `Template ${isEnabled ? 'Enabled' : 'Disabled'}`,
            icon: 'success'
          });
        } catch (err) {
          console.error('Failed to update SMS template status on server:', err);
          // Rollback local state
          setTemplates(templates);
          localStorage.setItem('message_templates_lib', JSON.stringify(templates));
          Swal.fire('Error', 'Failed to update template status on server API', 'error');
        }
      }
    }
  };

  // Open interactive mock preview modal for an event
  const openEventPreviewModal = (eventId: string) => {
    setPreviewEventId(eventId);
    setPreviewChannel('whatsapp');
  };

  return (
    <div className="flex flex-col min-h-full gap-6 text-left relative">



      {/* Main Settings Tabs selector */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200/60 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] anim-fade-up w-full">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSettingsTab('events')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition cursor-pointer focus:outline-none ${activeSettingsTab === 'events'
              ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Triggers</span>
          </button>
          <button
            onClick={() => setActiveSettingsTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition cursor-pointer focus:outline-none ${activeSettingsTab === 'templates'
              ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Templates</span>
          </button>
        </div>
      </div>

      {/* CORE WORKSPACES */}
      {activeSettingsTab === 'events' ? (
        /* ==================== 1. PRESTIGE SAAS UNIFIED TRIGGERS GRID ==================== */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.02)] overflow-hidden anim-fade-up stagger-1">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-slate-400">Loading settings from server API...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6 min-w-[280px]">Event Activity Trigger</th>
                    <th className="py-4 px-4 min-w-[200px] text-center">
                      <span className="inline-flex items-center gap-2 text-emerald-600">
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Alert
                      </span>
                    </th>
                    <th className="py-4 px-4 min-w-[200px] text-center">
                      <span className="inline-flex items-center gap-2 text-amber-600">
                        <Smartphone className="w-3.5 h-3.5" /> SMS Text Msg
                      </span>
                    </th>
                    <th className="py-4 px-4 min-w-[220px] text-center">
                      <span className="inline-flex items-center gap-2 text-blue-600">
                        <Mail className="w-3.5 h-3.5" /> Transactional Email
                      </span>
                    </th>
                    <th className="py-4 px-6 text-center w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {events.map(ev => (
                    <tr key={ev.id} className="hover:bg-slate-50/40 transition-colors">

                      {/* Trigger Event details */}
                      <td className="py-4 px-6 text-left space-y-2">
                        <div className="flex items-center">
                          <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/40 text-[10px] font-bold tracking-wide">
                            {ev.name}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed max-w-[260px]">
                          {ev.description}
                        </p>
                      </td>

                      {/* WhatsApp Channel Cell */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex items-center cursor-pointer scale-100 transition-transform hover:scale-105 active:scale-95">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={ev.whatsappEnabled}
                              onChange={(e) => handleSaveEventMapping(ev.id, { whatsappEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                          </label>
                        </div>
                      </td>

                      {/* SMS Channel Cell */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex items-center cursor-pointer scale-100 transition-transform hover:scale-105 active:scale-95">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={ev.smsEnabled}
                              onChange={(e) => handleSaveEventMapping(ev.id, { smsEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                          </label>
                        </div>
                      </td>

                      {/* Email Channel Cell */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <label className="relative inline-flex items-center cursor-pointer scale-100 transition-transform hover:scale-105 active:scale-95">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={ev.emailEnabled}
                              onChange={(e) => handleSaveEventMapping(ev.id, { emailEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                          </label>
                        </div>
                      </td>

                      {/* Quick Preview & Actions */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openEventPreviewModal(ev.id)}
                          className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200/55 hover:border-blue-100 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center press"
                          title="Open Live Preview & Test Simulations"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ==================== 2. TEMPLATE LIBRARY MANAGER VIEW (FULL WIDTH) ==================== */
        (() => {
          const filteredTemplates = templates
            .filter(t => t.channel === selectedChannelTab)
            .filter(t => {
              if (!searchQuery.trim()) return true;
              const q = searchQuery.toLowerCase();
              return (
                t.name.toLowerCase().includes(q) ||
                (t.templateCode || '').toLowerCase().includes(q) ||
                (t.category || '').toLowerCase().includes(q) ||
                t.body.toLowerCase().includes(q)
              );
            });

          const itemsPerPage = 8;
          const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage) || 1;
          const paginatedTemplates = filteredTemplates.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.02)] anim-fade-up w-full space-y-6">
              {/* Top Action Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-base font-extrabold text-slate-800">Templates Library</h2>
                  {/* Channel Tabs */}
                  <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/30">
                    <button
                      onClick={() => handleChannelTabChange('email')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedChannelTab === 'email'
                        ? 'bg-white text-blue-600 shadow-xs border border-slate-100/50'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={() => handleChannelTabChange('sms')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedChannelTab === 'sms'
                        ? 'bg-white text-amber-600 shadow-xs border border-slate-100/50'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </button>
                    <button
                      onClick={() => handleChannelTabChange('whatsapp')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${selectedChannelTab === 'whatsapp'
                        ? 'bg-white text-emerald-600 shadow-xs border border-slate-100/50'
                        : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1 md:flex-initial">
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full md:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-700"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  {/* Create Template */}
                  <button
                    onClick={handleCreateNewTemplate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.25)]"
                  >
                    <Plus className="w-4 h-4" /> Create Template
                  </button>
                </div>
              </div>

              {/* Table list of templates */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">Template Name</th>
                      <th className="py-3 px-5">Code</th>
                      <th className="py-3 px-5">Category</th>
                      <th className="py-3 px-5 text-center w-[120px]">Status</th>
                      <th className="py-3 px-5 text-center w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedTemplates.map(t => (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          setIsCreatingNew(false);
                          setIsEditorOpen(true);
                        }}
                      >
                        <td className="py-3.5 px-5 font-semibold text-slate-700">{t.name}</td>
                        <td className="py-3.5 px-5 font-mono text-[10.5px] text-slate-500">{t.templateCode || t.templateId || 'N/A'}</td>
                        <td className="py-3.5 px-5">
                          {t.category ? (
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg border border-slate-200/40 text-[10px] font-bold">
                              {t.category}
                            </span>
                          ) : 'N/A'}
                        </td>
                        <td className="py-3.5 px-5 text-center" onClick={e => e.stopPropagation()}>
                          <label className="relative inline-flex items-center cursor-pointer scale-75">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={t.status !== 0}
                              onChange={(e) => handleToggleTemplateStatus(t.id, e.target.checked)}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                          </label>
                        </td>
                        <td className="py-3.5 px-5 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedTemplateId(t.id);
                              handleDeleteTemplate();
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Delete Template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedTemplates.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-semibold">
                          No templates found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] text-slate-400 font-bold">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTemplates.length)} of {filteredTemplates.length} templates
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Modify Template Editor Overlay Modal */}
      {isEditorOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-40 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col anim-scale-in text-left">

            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>
                    {isCreatingNew ? (
                      'Create New Template'
                    ) : (
                      <>Modify Template: <span className="text-blue-400 ml-1">{selectedTemplate.name}</span></>
                    )}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isCreatingNew
                    ? 'Define a new reusable template layout mapped to a trigger event.'
                    : 'Edit reusable template body. Apply parameters like {{customer_name}} in layout.'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Template Status Toggle */}
                {!isCreatingNew && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase select-none text-white/90">
                      {selectedTemplate.status !== 0 ? 'Enabled' : 'Disabled'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer scale-75">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={selectedTemplate.status !== 0}
                        onChange={(e) => handleToggleTemplateStatus(selectedTemplate.id, e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4 shadow-3xs after:shadow-2xs"></div>
                    </label>
                  </div>
                )}

                {/* Delete Button */}
                {!isCreatingNew && (
                  <button
                    onClick={() => {
                      handleDeleteTemplate();
                      setIsEditorOpen(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-extrabold transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split view layout */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* Left Column: Form Inputs */}
              <div className="lg:col-span-7 space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Template Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-semibold text-slate-700"
                    value={editingTemplateName}
                    onChange={(e) => setEditingTemplateName(e.target.value)}
                    placeholder="e.g. Lead Welcome SMS"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Template Code
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-mono text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-65"
                      value={editingTemplateCode}
                      onChange={(e) => setEditingTemplateCode(e.target.value)}
                      placeholder="e.g. EMAIL_BOOKING_02"
                      disabled={!isCreatingNew}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Trigger Category
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none font-semibold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-65"
                      value={editingTemplateCategory}
                      onChange={(e) => setEditingTemplateCategory(e.target.value)}
                      disabled={!isCreatingNew}
                    >
                      {events.length > 0 ? (
                        events.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.id}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="ACCOUNT_CREATION">ACCOUNT_CREATION</option>
                          <option value="BOOKING_CREATED">BOOKING_CREATED</option>
                          <option value="VISIT_SCHEDULED">VISIT_SCHEDULED</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {editingTemplateChannel === 'whatsapp' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Meta Registered Template ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-mono"
                      value={editingTemplateId}
                      onChange={(e) => setEditingTemplateId(e.target.value)}
                      placeholder="e.g. lead_registration_client_v1"
                    />
                  </div>
                )}

                {editingTemplateChannel === 'email' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                      Default Subject Line
                    </label>
                    <input
                      id="template-subject"
                      type="text"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-bold text-slate-800"
                      value={editingTemplateSubject}
                      onChange={(e) => setEditingTemplateSubject(e.target.value)}
                      onFocus={() => setActiveInputId('template-subject')}
                      onKeyDown={(e) => handleKeyDown(e, 'subject')}
                      placeholder="Subject Line"
                    />
                  </div>
                )}

                {/* Placeholders helper widget */}
                <div className="p-3.5 bg-blue-50/30 rounded-xl border border-blue-100/60">
                  <span className="text-[9.5px] text-blue-500 font-extrabold uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-3 h-3 text-blue-500" /> Standard variables tags for {editingTemplateCategory || 'General'} (Click to Insert)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {getPlaceholdersForCategory(editingTemplateCategory).map(placeholder => (
                      <button
                        key={placeholder.key}
                        onClick={() => insertPlaceholder(placeholder.key)}
                        className="px-2.5 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[10.5px] font-bold text-slate-700 hover:text-blue-600 rounded-lg shadow-2xs cursor-pointer transition press flex items-center gap-1"
                        title={placeholder.description}
                      >
                        <span>{placeholder.key.replace('{{', '').replace('}}', '')}</span>
                        <span className="text-[9px] text-slate-400 font-normal">({placeholder.description})</span>
                      </button>
                    ))}
                    {getPlaceholdersForCategory(editingTemplateCategory).length === 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold italic">No variables available for this category.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">
                    Message Template Body
                  </label>
                  <textarea
                    id="template-body"
                    rows={7}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none leading-relaxed font-sans text-slate-700"
                    value={editingTemplateBody}
                    onChange={(e) => setEditingTemplateBody(e.target.value)}
                    onFocus={() => setActiveInputId('template-body')}
                    onKeyDown={(e) => handleKeyDown(e, 'body')}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      if (isCreatingNew) {
                        await handleCreateNewTemplateFromModal();
                      } else {
                        await handleSaveTemplateContent();
                        setIsEditorOpen(false);
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition cursor-pointer press shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isCreatingNew ? 'Create Template' : 'Update Template'}</span>
                  </button>
                  {!isCreatingNew && (
                    <button
                      onClick={() => handleSendTestNotification(editingTemplateChannel, editingTemplateBody, editingTemplateSubject)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition cursor-pointer press"
                    >
                      <Send className="w-4 h-4" />
                      <span>Simulate Dispatch Test</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Real-Time Content Render */}
              <div
                className="lg:col-span-5 flex flex-col items-center"
                style={{ perspective: '1000px' }}
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  <span>Real-Time Content Render</span>
                </span>

                {/* iPhone Frame Wrapper (With 3D Projection) */}
                <div
                  className="relative select-none rounded-[40px] transition-all duration-500 ease-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: 'rotateY(-8deg) rotateX(4deg) rotateZ(-1deg)',
                    boxShadow: '-12px 16px 36px rgba(0, 0, 0, 0.16), -2px 5px 12px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  {/* Glass Reflection Overlay */}
                  <div className="absolute inset-0 pointer-events-none rounded-[40px] bg-gradient-to-tr from-transparent via-white/5 to-white/10 z-20" />

                  {/* Simulator device frame - iPhone Pro Mockup (Taller, realistic size with ultra-thin bezel) */}
                  {(editingTemplateChannel === 'whatsapp' || editingTemplateChannel === 'sms') ? (
                    <div
                      className="w-[290px] h-[590px] bg-slate-950 rounded-[40px] p-[4px] border-[3px] border-slate-800 relative flex flex-col"
                      style={{
                        boxShadow: 'inset 0 0 8px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      {/* Dynamic Island */}
                      <div className="w-[82px] h-[20px] bg-black rounded-full absolute top-[11px] left-1/2 -translate-x-1/2 z-30 flex items-center justify-between px-2.5 select-none pointer-events-none">
                        <div className="w-1 h-1 rounded-full bg-slate-800/40" />
                        <div className="w-2 h-2 rounded-full bg-[#0a141a] border border-slate-900/60" />
                      </div>

                      {/* Physical Buttons (Side overlays) */}
                      <div className="absolute -left-[5px] top-[75px] w-[2px] h-[16px] bg-slate-800 rounded-l-sm" />
                      <div className="absolute -left-[5px] top-[108px] w-[2px] h-[34px] bg-slate-800 rounded-l-sm" />
                      <div className="absolute -left-[5px] top-[152px] w-[2px] h-[34px] bg-slate-800 rounded-l-sm" />
                      <div className="absolute -right-[5px] top-[96px] w-[2px] h-[42px] bg-slate-800 rounded-r-sm" />

                      <div className={`flex-1 rounded-[34px] overflow-hidden flex flex-col relative ${editingTemplateChannel === 'whatsapp' ? 'bg-[#efeae2]' : 'bg-[#F2F2F7]'}`}>

                        {/* iPhone Status Bar */}
                        <div className={`h-8 pt-2 px-5 flex items-center justify-between z-20 select-none absolute top-0 left-0 right-0 ${editingTemplateChannel === 'whatsapp' ? 'text-white' : 'text-slate-800'}`}>
                          <span className="text-[9px] font-bold tracking-tight">12:30</span>
                          <div className="flex items-center gap-1 opacity-90">
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                              <path d="M2 22h20V2z" />
                            </svg>
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12 21l-12-18h24z" />
                            </svg>
                            <div className={`w-4 h-2.5 border rounded-sm p-[1px] flex items-center justify-start ${editingTemplateChannel === 'whatsapp' ? 'border-white' : 'border-slate-800'}`}>
                              <div className={`h-full w-[80%] rounded-2xs ${editingTemplateChannel === 'whatsapp' ? 'bg-white' : 'bg-slate-800'}`} />
                            </div>
                          </div>
                        </div>

                        {editingTemplateChannel === 'whatsapp' ? (
                          <div className="h-14 bg-[#075e54] text-white px-3 pb-1.5 flex items-end gap-2 shadow-sm shrink-0">
                            <div className="w-6 h-6 rounded-full bg-teal-850 flex items-center justify-center font-bold text-[9px] uppercase border border-white/20 select-none">BC</div>
                            <div className="text-left leading-none">
                              <span className="text-[10.5px] font-bold block">BrokerConnect Alerts</span>
                              <span className="text-[7.5px] opacity-75">Verified Business Channel</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-14 bg-white text-slate-800 border-b border-slate-200 px-3 pb-1.5 flex items-end justify-center shrink-0">
                            <div className="text-center">
                              <span className="text-[10px] font-extrabold block">BROKERCONNECT</span>
                              <span className="text-[7px] text-slate-400 font-medium">Text Message Gateway</span>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 p-3 pb-4 overflow-y-auto space-y-3 flex flex-col justify-end">
                          <div className={`p-3 max-w-[90%] text-xs shadow-xs rounded-2xl relative ${editingTemplateChannel === 'whatsapp'
                            ? 'bg-white text-slate-800 self-start rounded-tl-xs border border-white'
                            : 'bg-blue-600 text-white self-end rounded-br-xs'
                            }`}>
                            {editingTemplateChannel === 'whatsapp' && (
                              <div className="text-[9.5px] font-bold text-emerald-600 mb-1 flex items-center gap-1 font-mono">
                                <span>ID: {editingTemplateId || 'unset'}</span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed text-[11px] text-left">
                              {renderPreviewBody(editingTemplateBody, editingTemplateCategory) || 'Type template text...'}
                            </p>

                            <div className="text-right mt-1.5 flex items-center justify-end gap-1">
                              <span className={`text-[8px] ${editingTemplateChannel === 'whatsapp' ? 'text-slate-400' : 'text-blue-200'}`}>12:30 PM</span>
                              {editingTemplateChannel === 'whatsapp' && <span className="text-emerald-500 text-[10px]">✓✓</span>}
                            </div>
                          </div>
                        </div>

                        <div className="h-10 bg-white border-t border-slate-200/60 p-2 flex items-center gap-2 shrink-0 relative">
                          <div className="flex-1 h-6 bg-slate-100 rounded-full" />
                          <div className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[80px] h-[3px] bg-slate-400/50 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Email Simulator */
                    <div className="w-full xl:w-[290px] min-h-[400px] xl:h-[590px] bg-slate-100 rounded-2xl border-2 border-slate-200 flex flex-col text-left overflow-hidden relative shadow-[inset_0_0_4px_rgba(255,255,255,0.2)]">
                      <div className="bg-slate-800 text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Mail Client View</span>
                      </div>

                      <div className="flex-1 bg-white p-4 flex flex-col text-xs leading-normal">
                        <div className="space-y-1.5 pb-2.5 border-b border-slate-100 text-[10.5px]">
                          <div>
                            <span className="text-slate-400 font-bold">From: </span>
                            <span className="text-slate-700 font-semibold">BrokerConnect Notifications &lt;noreply@brokerconnect.io&gt;</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold">Subject: </span>
                            <span className="text-slate-800 font-extrabold font-sans">
                              {renderPreviewBody(editingTemplateSubject, editingTemplateCategory) || '(Subject unset)'}
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex-1 mt-3 overflow-y-auto pr-1 whitespace-pre-wrap text-[11px] text-slate-600 leading-relaxed font-sans max-h-[420px]"
                          dangerouslySetInnerHTML={{
                            __html: renderPreviewBody(editingTemplateBody, editingTemplateCategory) || 'Write email template body...'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Channel Type Selector under the screen */}
                <div className="mt-4 w-[290px] space-y-1 text-left">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">
                    Channel Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none font-semibold text-slate-700"
                    value={editingTemplateChannel}
                    onChange={(e) => setEditingTemplateChannel(e.target.value as any)}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS Gateway</option>
                    <option value="email">Email</option>
                  </select>
                  <p className="text-[9px] text-slate-400 mt-1 font-sans">
                    Switch preview channel simulator layout.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==================== 3. PORTABLE LIGHTBOX LIVE SIMULATOR MODAL ==================== */}
      {previewEventId && previewEvent && (
        <div className="fixed inset-0 bg-slate-955/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col anim-scale-in text-left">

            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span>Interactive Channel Preview: {previewEvent.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Inspecting live message rendering for this event trigger template routing mappings.
                </p>
              </div>
              <button
                onClick={() => setPreviewEventId(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

              {/* Modal Left column: Variable details and channel tab select */}
              <div className="md:col-span-5 space-y-6">

                {/* Event Category Info */}
                <div className="space-y-2.5">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Trigger Event Activity</span>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs">{previewEvent.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{previewEvent.description}</p>
                  </div>
                </div>

                {/* Variable Values Mapping table */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Simulated Variable Bindings</span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden text-[10.5px]">
                    <div className="bg-slate-50/70 p-2 border-b border-slate-100 grid grid-cols-12 font-bold text-slate-400 uppercase">
                      <div className="col-span-5">Variable Tag</div>
                      <div className="col-span-7">Mock Value</div>
                    </div>
                    <div className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
                      {previewEvent.variables.map(v => (
                        <div key={v.name} className="p-2.5 grid grid-cols-12 items-center">
                          <code className="col-span-5 text-blue-500 font-bold font-mono text-[9px]">{v.name}</code>
                          <div className="col-span-7 font-semibold truncate pl-1">{v.mockValue}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Channel select pills */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Preview Notification Channel</span>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setPreviewChannel('whatsapp')}
                      disabled={!previewEvent.whatsappEnabled}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${!previewEvent.whatsappEnabled ? 'opacity-40 cursor-not-allowed text-slate-400' :
                        previewChannel === 'whatsapp' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setPreviewChannel('sms')}
                      disabled={!previewEvent.smsEnabled}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${!previewEvent.smsEnabled ? 'opacity-40 cursor-not-allowed text-slate-400' :
                        previewChannel === 'sms' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>SMS Msg</span>
                    </button>
                    <button
                      onClick={() => setPreviewChannel('email')}
                      disabled={!previewEvent.emailEnabled}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${!previewEvent.emailEnabled ? 'opacity-40 cursor-not-allowed text-slate-400' :
                        previewChannel === 'email' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>

                {/* Test notification CTA inside modal */}
                {(() => {
                  const mappedTemp = getMappedTemplateForEvent(previewEvent, previewChannel);
                  if (!mappedTemp) return null;
                  return (
                    <button
                      onClick={() => handleSendTestNotification(previewChannel, mappedTemp.body, mappedTemp.subject)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition cursor-pointer press shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>Trigger Simulation Test</span>
                    </button>
                  );
                })()}

              </div>

              {/* Modal Right column: Interactive Frame rendering */}
              <div
                className="md:col-span-7 flex justify-center"
                style={{ perspective: '1000px' }}
              >
                {(() => {
                  const mappedTemp = getMappedTemplateForEvent(previewEvent, previewChannel);

                  if (!mappedTemp) {
                    return (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 w-full max-w-[320px]">
                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <span className="text-xs font-bold text-slate-500 block">No Template Configured</span>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Please associate a reusable text template with this channel to preview rendering content.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      className="relative select-none rounded-[32px] transition-all duration-500 ease-out"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateY(-8deg) rotateX(4deg) rotateZ(-1deg)',
                        boxShadow: '-12px 16px 36px rgba(0, 0, 0, 0.16), -2px 5px 12px rgba(0, 0, 0, 0.08)'
                      }}
                    >
                      {/* Glass Reflection Overlay */}
                      <div className="absolute inset-0 pointer-events-none rounded-[32px] bg-gradient-to-tr from-transparent via-white/5 to-white/10 z-20" />

                      {previewChannel === 'whatsapp' || previewChannel === 'sms' ? (
                        <div
                          className="w-[280px] h-[460px] bg-slate-950 rounded-[32px] p-[4px] border-[3px] border-slate-800 relative flex flex-col"
                          style={{
                            boxShadow: 'inset 0 0 8px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          {/* Dynamic Island */}
                          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-3.5 bg-black rounded-full z-30 flex items-center justify-center">
                            <div className="w-6 h-0.5 bg-slate-800 rounded-full" />
                          </div>

                          {/* Side buttons */}
                          <div className="absolute -left-[5px] top-[60px] w-[2px] h-[12px] bg-slate-800 rounded-l-sm" />
                          <div className="absolute -left-[5px] top-[85px] w-[2px] h-[24px] bg-slate-800 rounded-l-sm" />
                          <div className="absolute -left-[5px] top-[115px] w-[2px] h-[24px] bg-slate-800 rounded-l-sm" />
                          <div className="absolute -right-[5px] top-[75px] w-[2px] h-[30px] bg-slate-800 rounded-r-sm" />

                          <div className={`flex-1 rounded-[28px] overflow-hidden flex flex-col relative ${previewChannel === 'whatsapp' ? 'bg-[#efeae2]' : 'bg-[#F2F2F7]'}`}>

                            <div className="h-10 pt-4 px-4 flex items-center justify-between bg-slate-950 text-white">
                              <div className="text-[10px] font-bold">12:30</div>
                              <div className="w-3 h-3 rounded-full bg-slate-800" />
                            </div>

                            {previewChannel === 'whatsapp' ? (
                              <div className="h-10 bg-[#075e54] text-white px-3 flex items-center gap-2 shadow-sm shrink-0">
                                <div className="w-6 h-6 rounded-full bg-teal-850 flex items-center justify-center font-bold text-[9px] uppercase border border-white/20 select-none">BC</div>
                                <div className="text-left leading-none">
                                  <span className="text-[10.5px] font-bold block">BrokerConnect Alerts</span>
                                  <span className="text-[7.5px] opacity-75">Verified Business Channel</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-10 bg-white text-slate-800 border-b border-slate-200 px-3 flex items-center justify-center shrink-0">
                                <div className="text-center">
                                  <span className="text-[10px] font-extrabold block">BROKERCONNECT</span>
                                  <span className="text-[7px] text-slate-400 font-medium">Text Message</span>
                                </div>
                              </div>
                            )}

                            <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col justify-end">
                              <div className={`p-3 max-w-[90%] text-xs shadow-xs rounded-2xl relative ${previewChannel === 'whatsapp'
                                ? 'bg-white text-slate-800 self-start rounded-tl-xs border border-white'
                                : 'bg-blue-600 text-white self-end rounded-br-xs'
                                }`}>
                                {previewChannel === 'whatsapp' && (
                                  <div className="text-[9px] font-bold text-emerald-600 mb-1 flex items-center gap-1 font-mono">
                                    <span>ID: {mappedTemp.templateId}</span>
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap leading-relaxed text-[11px] text-left">
                                  {renderMockBody(mappedTemp.body, previewEvent.variables)}
                                </p>

                                <div className="text-right mt-1.5 flex items-center justify-end gap-1">
                                  <span className={`text-[8px] ${previewChannel === 'whatsapp' ? 'text-slate-400' : 'text-blue-200'}`}>12:30 PM</span>
                                  {previewChannel === 'whatsapp' && <span className="text-emerald-500 text-[10px]">✓✓</span>}
                                </div>
                              </div>
                            </div>

                            <div className="h-10 bg-white border-t border-slate-200/60 p-2 flex items-center gap-2 shrink-0">
                              <div className="flex-1 h-6 bg-slate-100 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[400px] min-h-[360px] bg-slate-100 rounded-2xl border border-slate-200 shadow-md flex flex-col text-left overflow-hidden">
                          <div className="bg-slate-800 text-white p-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">Mail Preview client</span>
                          </div>

                          <div className="flex-1 bg-white p-5 flex flex-col text-xs leading-normal">
                            <div className="space-y-1.5 pb-2.5 border-b border-slate-100 text-[10.5px]">
                              <div>
                                <span className="text-slate-400 font-bold">From: </span>
                                <span className="text-slate-700 font-semibold">BrokerConnect Notifications &lt;noreply@brokerconnect.io&gt;</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold">Subject: </span>
                                <span className="text-slate-800 font-extrabold font-sans">
                                  {renderMockBody(mappedTemp.subject || '', previewEvent.variables)}
                                </span>
                              </div>
                            </div>

                            <div className="flex-1 mt-3 overflow-y-auto pr-1 whitespace-pre-wrap text-[11px] text-slate-600 leading-relaxed font-sans">
                              {renderMockBody(mappedTemp.body, previewEvent.variables)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
