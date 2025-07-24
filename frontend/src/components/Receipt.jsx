import React from 'react';

const Receipt = ({ sale, items }) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeSale = sale || { total: 0, paymentType: '' };
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 14, width: 300 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div>My Store Name</div>
        <div>Address line</div>
        <div>{new Date().toLocaleString()}</div>
      </div>
      <hr />
      <div>
        {safeItems.map(item => (
          <div key={item.barcode} style={{ marginBottom: 4 }}>
            {item.name} ({item.barcode})<br />
            Qty: {item.quantity}  Price: Rs {item.price} <br />
            Exp: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
            <hr />
          </div>
        ))}
      </div>
      <div>
        <b>Subtotal:</b> Rs {safeSale.total.toFixed(2)}<br />
        <b>Tax:</b> Rs {(safeSale.total * 0.08).toFixed(2)}<br />
        <b>Total:</b> Rs {(safeSale.total * 1.08).toFixed(2)}<br />
        <b>Payment:</b> {safeSale.paymentType}
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        Thank you for your purchase!
      </div>
    </div>
  );
};

export default Receipt; 