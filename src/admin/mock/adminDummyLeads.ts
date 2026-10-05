// In-memory dummy leads for Admin Leads page (/admin/leads)
// Matches exact schema and visual design expected by Terado CRM UI

export interface AdminDummyLead {
  id: number;
  lead_id: string;
  customer_id: number;
  city: string;
  project: number;
  project_id?: number;
  unit_type?: string;
  budget?: number;
  scheduled_visit_date?: string;
  scheduled_visit_time?: string;
  stage: number;
  status: number;
  created_by: number;
  updated_by: number;
  createdAt: string;
  updatedAt: string;
  customer_detail: {
    id: number;
    customer_name: string;
    full_name: string;
    mobile_number: string;
    email: string;
    note?: string;
    notes?: string;
    lead_source: string;
    campaign_name?: string;
    city?: string;
    address?: string;
    assigned_executive?: string;
    assigned_executive_id?: number;
    broker_id?: number;
    broker_name?: string;
    tag?: string;
    ownership_valid_till?: string;
  };
  project_detail?: {
    id: number;
    name: string;
    project_name: string;
    location: string;
    city: string;
  };
}

export const addLeadToDummyPipeline = (newLead: AdminDummyLead) => {
  initialAdminDummyLeads.unshift(newLead);
  try {
    const stored = JSON.parse(localStorage.getItem('terado_injected_leads') || '[]');
    stored.unshift(newLead);
    localStorage.setItem('terado_injected_leads', JSON.stringify(stored));
  } catch (e) {
    console.error('Failed to persist injected lead to localStorage:', e);
  }
};

export const initialAdminDummyLeads: AdminDummyLead[] = [
  {
    id: 91,
    lead_id: 'TRD-2026-091',
    customer_id: 191,
    city: 'Mumbai',
    project: 1,
    project_id: 1,
    unit_type: '2BHK',
    budget: 36000000,
    scheduled_visit_date: '2026-09-29',
    scheduled_visit_time: '22:01:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-29T16:31:00.000Z',
    updatedAt: '2026-09-29T16:31:00.000Z',
    customer_detail: {
      id: 191,
      customer_name: 'soham full info',
      full_name: 'soham full info',
      mobile_number: '9923657451',
      email: 'test@gmail.com',
      note: 'bbb',
      notes: 'bbb - 2BHK 3.5CR-3.75CR requirements',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2,
      tag: 'Hot Lead'
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 90,
    lead_id: 'TRD-2026-090',
    customer_id: 190,
    city: 'Pune',
    project: 2,
    project_id: 2,
    unit_type: '1.25CR-1.5CR',
    budget: 13500000,
    scheduled_visit_date: '2026-09-29',
    scheduled_visit_time: '22:37:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-29T17:07:00.000Z',
    updatedAt: '2026-09-29T17:07:00.000Z',
    customer_detail: {
      id: 190,
      customer_name: 'Atharva Uni5',
      full_name: 'Atharva Uni5',
      mobile_number: '7897897897',
      email: 'atharva.pandharikarguni5.tech',
      note: '[Referred By] Name: Atharva Uni5, Mobile: 7897897897, Email: atharva@uni5.tech',
      notes: 'Customer referred by Channel Partner Uni5',
      lead_source: 'Channel Partner',
      assigned_executive: 'Pooja Mehta',
      assigned_executive_id: 3,
      broker_name: 'Atharva Uni5',
      tag: 'Verified'
    },
    project_detail: {
      id: 2,
      name: 'Terado Emerald Oasis',
      project_name: 'Terado Emerald Oasis',
      location: 'Bandra West',
      city: 'Mumbai'
    }
  },
  {
    id: 89,
    lead_id: 'TRD-2026-089',
    customer_id: 189,
    city: 'Mumbai',
    project: 1,
    project_id: 1,
    unit_type: '2BHK',
    budget: 18000000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:36:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T17:06:00.000Z',
    updatedAt: '2026-09-28T17:06:00.000Z',
    customer_detail: {
      id: 189,
      customer_name: 'ccf',
      full_name: 'ccf',
      mobile_number: '5996666666',
      email: '',
      note: '',
      notes: 'Met at exhibition booth',
      lead_source: 'Walk-in',
      assigned_executive: 'Amit Kumar',
      assigned_executive_id: 4,
      tag: 'Follow-up'
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 88,
    lead_id: 'TRD-2026-088',
    customer_id: 188,
    city: 'Bangalore',
    project: 3,
    project_id: 3,
    unit_type: '3BHK',
    budget: 22000000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:07:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T16:37:00.000Z',
    updatedAt: '2026-09-28T16:37:00.000Z',
    customer_detail: {
      id: 188,
      customer_name: 'ss',
      full_name: 'ss',
      mobile_number: '2343453543',
      email: '',
      note: '[Referred By] Name: sss, Mobile: 2343453543, Email: sss@broker.com',
      notes: 'Customer interested in Phase 2 inventory',
      lead_source: 'Channel Partner',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2
    },
    project_detail: {
      id: 3,
      name: 'Terado Skyline Tech Park',
      project_name: 'Terado Skyline Tech Park',
      location: 'Kharadi',
      city: 'Pune'
    }
  },
  {
    id: 87,
    lead_id: 'TRD-2026-087',
    customer_id: 187,
    city: 'Mumbai',
    project: 2,
    project_id: 2,
    unit_type: '1BHK',
    budget: 46000000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:19:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T16:49:00.000Z',
    updatedAt: '2026-09-28T16:49:00.000Z',
    customer_detail: {
      id: 187,
      customer_name: 'soham test 2',
      full_name: 'soham test 2',
      mobile_number: '9468686868',
      email: '',
      note: 'xhdh',
      notes: '1BHK 4.5CR-4.75CR budget',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Pooja Mehta',
      assigned_executive_id: 3,
      tag: 'Hot Lead'
    },
    project_detail: {
      id: 2,
      name: 'Terado Emerald Oasis',
      project_name: 'Terado Emerald Oasis',
      location: 'Bandra West',
      city: 'Mumbai'
    }
  },
  {
    id: 86,
    lead_id: 'TRD-2026-086',
    customer_id: 186,
    city: 'Pune',
    project: 1,
    project_id: 1,
    unit_type: '1BHK',
    budget: 13500000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:18:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T16:48:00.000Z',
    updatedAt: '2026-09-28T16:48:00.000Z',
    customer_detail: {
      id: 186,
      customer_name: 'soham test',
      full_name: 'soham test',
      mobile_number: '8768686868',
      email: '',
      note: 'bshshd',
      notes: '1BHK 1.25CR-1.5CR',
      lead_source: 'Google Ads',
      assigned_executive: 'Amit Kumar',
      assigned_executive_id: 4
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 85,
    lead_id: 'TRD-2026-085',
    customer_id: 185,
    city: 'Mumbai',
    project: 2,
    project_id: 2,
    unit_type: '2BHK',
    budget: 46000000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:12:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T16:42:00.000Z',
    updatedAt: '2026-09-28T16:42:00.000Z',
    customer_detail: {
      id: 185,
      customer_name: 'jay test',
      full_name: 'jay test',
      mobile_number: '7468686868',
      email: 'test@gmail.com',
      note: 'dfhxtxh [Channel Partner Association] Partner: Amaya (rashi)',
      notes: '2BHK · 4.5CR-4.75CR via Amaya partner',
      lead_source: 'Channel Partner',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2,
      tag: 'Priority'
    },
    project_detail: {
      id: 2,
      name: 'Terado Emerald Oasis',
      project_name: 'Terado Emerald Oasis',
      location: 'Bandra West',
      city: 'Mumbai'
    }
  },
  {
    id: 84,
    lead_id: 'TRD-2026-084',
    customer_id: 184,
    city: 'Bangalore',
    project: 1,
    project_id: 1,
    unit_type: '1BHK',
    budget: 13500000,
    scheduled_visit_date: '2026-09-28',
    scheduled_visit_time: '22:08:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-28T16:38:00.000Z',
    updatedAt: '2026-09-28T16:38:00.000Z',
    customer_detail: {
      id: 184,
      customer_name: 'test test',
      full_name: 'test test',
      mobile_number: '9549785364',
      email: 'test@gmail.com',
      note: 'testing',
      notes: '1BHK · 1.25CR-1.5CR test submission',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Pooja Mehta',
      assigned_executive_id: 3
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 83,
    lead_id: 'TRD-2026-083',
    customer_id: 183,
    city: 'Bangalore',
    project: 1,
    project_id: 1,
    unit_type: '3 BHK Luxury',
    budget: 14500000,
    scheduled_visit_date: '2026-09-27',
    scheduled_visit_time: '15:00:00',
    stage: 2, // Site Visit Scheduled
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-27T10:00:00.000Z',
    updatedAt: '2026-09-27T10:00:00.000Z',
    customer_detail: {
      id: 183,
      customer_name: 'Vikram Malhotra',
      full_name: 'Vikram Malhotra',
      mobile_number: '9820145892',
      email: 'vikram.malhotra@gmail.com',
      note: 'Looking for 3BHK high floor with park view',
      notes: 'Inquired through Meta Facebook Instant Form',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2,
      tag: 'Hot Lead'
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 82,
    lead_id: 'TRD-2026-082',
    customer_id: 182,
    city: 'Mumbai',
    project: 2,
    project_id: 2,
    unit_type: '4 BHK Penthouse',
    budget: 28000000,
    scheduled_visit_date: '2026-09-26',
    scheduled_visit_time: '16:30:00',
    stage: 1, // Contacted
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-26T11:20:00.000Z',
    updatedAt: '2026-09-26T11:20:00.000Z',
    customer_detail: {
      id: 182,
      customer_name: 'Ananya Sharma',
      full_name: 'Ananya Sharma',
      mobile_number: '9871123450',
      email: 'ananya.sharma@outlook.com',
      note: 'Duplex penthouse with terrace requested',
      notes: 'Instagram story sponsored lead ad',
      lead_source: 'Instagram Lead Ads',
      assigned_executive: 'Pooja Mehta',
      assigned_executive_id: 3,
      tag: 'High Value'
    },
    project_detail: {
      id: 2,
      name: 'Terado Emerald Oasis',
      project_name: 'Terado Emerald Oasis',
      location: 'Bandra West',
      city: 'Mumbai'
    }
  },
  {
    id: 81,
    lead_id: 'TRD-2026-081',
    customer_id: 181,
    city: 'Pune',
    project: 3,
    project_id: 3,
    unit_type: '2 BHK Premium',
    budget: 9500000,
    scheduled_visit_date: '2026-09-25',
    scheduled_visit_time: '11:00:00',
    stage: 4, // Booked / Won
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-25T09:15:00.000Z',
    updatedAt: '2026-09-25T09:15:00.000Z',
    customer_detail: {
      id: 181,
      customer_name: 'Rajesh Kulkarni',
      full_name: 'Rajesh Kulkarni',
      mobile_number: '9923456781',
      email: 'rajesh.k@tcs.com',
      note: 'Unit C-802 token advance paid',
      notes: 'Loan approved through HDFC Bank',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Amit Kumar',
      assigned_executive_id: 4,
      tag: 'Won'
    },
    project_detail: {
      id: 3,
      name: 'Terado Skyline Tech Park',
      project_name: 'Terado Skyline Tech Park',
      location: 'Kharadi',
      city: 'Pune'
    }
  },
  {
    id: 80,
    lead_id: 'TRD-2026-080',
    customer_id: 180,
    city: 'Bangalore',
    project: 1,
    project_id: 1,
    unit_type: '1 BHK Compact',
    budget: 6500000,
    scheduled_visit_date: '2026-09-24',
    scheduled_visit_time: '14:15:00',
    stage: 2, // Site Visit Scheduled
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-24T12:00:00.000Z',
    updatedAt: '2026-09-24T12:00:00.000Z',
    customer_detail: {
      id: 180,
      customer_name: 'Sneha Roy',
      full_name: 'Sneha Roy',
      mobile_number: '9819234567',
      email: 'sneha.roy@gmail.com',
      note: 'Investment property near IT corridor',
      notes: 'Looking for high rental yield',
      lead_source: 'Website Form',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  },
  {
    id: 79,
    lead_id: 'TRD-2026-079',
    customer_id: 179,
    city: 'Mumbai',
    project: 2,
    project_id: 2,
    unit_type: '3 BHK Garden View',
    budget: 18500000,
    scheduled_visit_date: '2026-09-23',
    scheduled_visit_time: '17:00:00',
    stage: 3, // Negotiation
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-23T14:30:00.000Z',
    updatedAt: '2026-09-23T14:30:00.000Z',
    customer_detail: {
      id: 179,
      customer_name: 'Amit Patel',
      full_name: 'Amit Patel',
      mobile_number: '9876541230',
      email: 'amit.patel@yahoo.com',
      note: 'Price negotiation on floor rise charges',
      notes: 'Referred by Shreenath Realtors',
      lead_source: 'Channel Partner',
      assigned_executive: 'Pooja Mehta',
      assigned_executive_id: 3,
      tag: 'Negotiating'
    },
    project_detail: {
      id: 2,
      name: 'Terado Emerald Oasis',
      project_name: 'Terado Emerald Oasis',
      location: 'Bandra West',
      city: 'Mumbai'
    }
  },
  {
    id: 78,
    lead_id: 'TRD-2026-078',
    customer_id: 178,
    city: 'Pune',
    project: 3,
    project_id: 3,
    unit_type: '2 BHK Deluxe',
    budget: 11500000,
    scheduled_visit_date: '2026-09-22',
    scheduled_visit_time: '12:30:00',
    stage: 1, // Contacted
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-22T10:15:00.000Z',
    updatedAt: '2026-09-22T10:15:00.000Z',
    customer_detail: {
      id: 178,
      customer_name: 'Meera Joshi',
      full_name: 'Meera Joshi',
      mobile_number: '9765432109',
      email: 'meera.joshi@gmail.com',
      note: 'Family visit planned for Sunday',
      notes: 'First time home buyer inquiry',
      lead_source: 'Meta / Facebook Lead Ads',
      assigned_executive: 'Amit Kumar',
      assigned_executive_id: 4
    },
    project_detail: {
      id: 3,
      name: 'Terado Skyline Tech Park',
      project_name: 'Terado Skyline Tech Park',
      location: 'Kharadi',
      city: 'Pune'
    }
  },
  {
    id: 77,
    lead_id: 'TRD-2026-077',
    customer_id: 177,
    city: 'Bangalore',
    project: 1,
    project_id: 1,
    unit_type: '3 BHK High Rise',
    budget: 21000000,
    scheduled_visit_date: '2026-09-21',
    scheduled_visit_time: '18:00:00',
    stage: 0, // New
    status: 1,
    created_by: 1,
    updated_by: 1,
    createdAt: '2026-09-21T08:45:00.000Z',
    updatedAt: '2026-09-21T08:45:00.000Z',
    customer_detail: {
      id: 177,
      customer_name: 'Rohan Mehta',
      full_name: 'Rohan Mehta',
      mobile_number: '9833445566',
      email: 'rohan.mehta@techcorp.in',
      note: 'Interested in Phase 2 pre-launch discounts',
      notes: 'Inquiry via Instagram carousel ad',
      lead_source: 'Instagram Lead Ads',
      assigned_executive: 'Rahul Verma',
      assigned_executive_id: 2,
      tag: 'New'
    },
    project_detail: {
      id: 1,
      name: 'Terado Silicon Heights',
      project_name: 'Terado Silicon Heights',
      location: 'Outer Ring Road',
      city: 'Bangalore'
    }
  }
];
