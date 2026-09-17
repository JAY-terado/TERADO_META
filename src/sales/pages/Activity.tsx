import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SalesCRM } from '../../components/screens/SalesCRM';
import { CustomerDetails } from '../../components/screens/CustomerDetails';

export const ActivityPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');

  if (leadId) {
    return <CustomerDetails />;
  }

  return <SalesCRM viewMode="activity" />;
};
