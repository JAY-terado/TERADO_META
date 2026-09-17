import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CallingCustomerDetails } from '../../components/screens/CallingCustomerDetails';
import { CallingLeadsList } from '../../components/screens/CallingLeadsList';

export const LeadsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedLeadId = searchParams.get('id');

  if (selectedLeadId) {
    return <CallingCustomerDetails />;
  }

  return <CallingLeadsList />;
};

export default LeadsPage;
