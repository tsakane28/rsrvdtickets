import React from 'react';

const PaymentDetails = ({ paymentId, amount, currency, timestamp }) => {
  // Format the timestamp to a readable date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="payment-details border rounded-md p-3 my-2 bg-gray-50">
      <h3 className="font-bold text-sm mb-1">Payment Information</h3>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div className="text-gray-600">Payment ID:</div>
        <div>{paymentId || 'N/A'}</div>
        
        <div className="text-gray-600">Amount:</div>
        <div>{amount ? `${amount} ${currency || 'USD'}` : 'N/A'}</div>
        
        <div className="text-gray-600">Timestamp:</div>
        <div>{formatDate(timestamp)}</div>
        
        <div className="text-gray-600">Status:</div>
        <div className="text-green-600 font-medium">PAID</div>
      </div>
    </div>
  );
};

export default PaymentDetails; 