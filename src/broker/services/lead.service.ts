import { createCustomer, requestCustomerOtp, verifyCustomerOtp } from '../../pages/api/registercustomer';

export const LeadService = {
  requestOtp: requestCustomerOtp,
  verifyOtp: verifyCustomerOtp,
  createLead: createCustomer,
};
