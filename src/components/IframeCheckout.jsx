import React, { useState, useEffect, useRef } from 'react';
import { useOrders } from '../contexts/OrderContext';
import { generateUUID } from '../utils/helpers';

const IframeCheckout = () => {
  const { addOrder, updateOrderStatus } = useOrders();
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  
  // For pre-filled data (if you want to test with pre-filled values)
  const [prefill, setPrefill] = useState({
    cardholderName: '',
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    amount: '',
    currency: 'USD'
  });
  
  const [usePrefill, setUsePrefill] = useState(false);

  // Initialize payment when component mounts
  useEffect(() => {
    const initializePayment = () => {
      setIsLoading(true);
      setError('');
      setMessage('');
      
      try {
        // Generate a new order ID
        const newOrderId = generateUUID();
        setOrderId(newOrderId);
        
        // Create an order with Pending status
        const orderData = {
          orderId: newOrderId,
          cardHolderName: usePrefill ? prefill.cardholderName : '',
          cardNumber: usePrefill ? prefill.cardNumber : '',
          expiryMonth: usePrefill && prefill.expiryDate ? prefill.expiryDate.split('/')[0] : '',
          expiryYear: usePrefill && prefill.expiryDate ? `20${prefill.expiryDate.split('/')[1]}` : '',
          cardCVC: usePrefill ? prefill.cvc : '',
          amount: usePrefill ? parseFloat(prefill.amount) : 0,
          currency: usePrefill ? prefill.currency : 'USD',
          status: 'Pending',
          date: new Date().toISOString()
        };
        
        // Add order to context
        addOrder(orderData);
        
        // Prepare data to send to iframe
        const paymentData = {
          orderId: newOrderId,
          cardholder: usePrefill ? prefill.cardholderName : '',
          cardNumber: usePrefill ? prefill.cardNumber : '',
          expiryDate: usePrefill ? prefill.expiryDate : '',
          cvc: usePrefill ? prefill.cvc : '',
          amount: usePrefill ? prefill.amount : '',
          currency: usePrefill ? prefill.currency : 'USD',
          showForm: 1
        };
        
        // Send message to iframe
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(paymentData, 'https://celalios.com');
        }
      } catch (err) {
        console.error('Error sending data to iframe:', err);
        setError('Failed to initiate payment. Please try again.');
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [usePrefill, prefill, addOrder]);

  // Handle iframe messages from payment processor
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from the payment iframe domain
      if (event.origin !== 'https://celalios.com') return;
      
      try {
        // Process the response from the iframe
        const data = event.data;
        
        if (data.status) {
          // Update order status in our context
          updateOrderStatus(orderId, data.status);
          
          // Show success or error message based on status
          if (data.status === 'Success') {
            setIsSuccessful(true);
            setMessage('Payment processed successfully!');
          } else if (data.status === 'Failed') {
            setError('Payment processing failed. Please try again.');
          }
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error processing iframe message:', err);
        setError('An error occurred while processing the payment.');
        setIsLoading(false);
      }
    };

    // Add event listener for messages from iframe
    window.addEventListener('message', handleMessage);
    
    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [orderId, updateOrderStatus]);

  // Handle pre-fill input changes


  // Reset the form
  const handleReset = () => {
    setIsLoading(false);
    setMessage('');
    setError('');
    setOrderId('');
    setIsSuccessful(false);
    setPrefill({
      cardholderName: '',
      cardNumber: '',
      expiryDate: '',
      cvc: '',
      amount: '',
      currency: 'USD'
    });
    
    // Reinitialize payment after reset
    const initializePayment = () => {
      const newOrderId = generateUUID();
      setOrderId(newOrderId);
      
      const orderData = {
        orderId: newOrderId,
        status: 'Pending',
        date: new Date().toISOString()
      };
      
      addOrder(orderData);
      
      const paymentData = {
        orderId: newOrderId,
        showForm: 1
      };
      
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(paymentData, 'https://celalios.com');
      }
    };
    
    initializePayment();
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mb-4">
          {message}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {isSuccessful ? (
        <div className="text-center py-6">
          <div className="mb-6 p-4 rounded-lg bg-green-100">
            <div className="flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="ml-2 text-lg font-medium text-green-700">
                Payment Successful
              </span>
            </div>
          </div>
          
          <button
            onClick={handleReset}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
          >
            Make Another Payment
          </button>
        </div>
      ) : (
        <>
         

          
         

          {/* iframe container */}
          <div className="border rounded-md p-2 bg-gray-50 mb-6" style={{ height: '400px' }}>
            <iframe
              ref={iframeRef}
              src="https://celalios.com/"
              title="Payment Form"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-same-origin"
            ></iframe>
          </div>
          
          {/* Note about iframe functionality */}
          <p className="text-sm text-gray-500 text-center mt-4">
            Note: This iframe loads an external payment form from the payment processor.
          </p>
        </>
      )}
    </div>
  );
};

export default IframeCheckout;