import { useId } from 'react';
import { BILL_CONFIG } from '../config/billConfig';
import { buildBillData } from '../utils/billUtils';
import billLogo from '../assets/bill-logo.png';
import './Bill.css';

function PaidStamp() {
  const baseId = useId();
  const topPathId = `${baseId}-top`;
  const bottomPathId = `${baseId}-bottom`;

  return (
    <div className="bill-paid-stamp" aria-label="Paid stamp">
      <svg viewBox="0 0 100 100" width="70" height="70" role="img" aria-hidden="true">
        <defs>
          <path
            id={topPathId}
            d="M 50,78 A 28,28 0 1,1 50,22 A 28,28 0 1,1 50,78"
          />
          <path
            id={bottomPathId}
            d="M 50,14.5 A 35.5,35.5 0 1,0 50,85.5 A 35.5,35.5 0 1,0 50,14.5"
          />
        </defs>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <text
          fill="currentColor"
          fontSize="8.8"
          fontWeight="800"
          fontFamily="monospace"
          letterSpacing="1.1"
        >
          <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
            DOOD CAFE
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="8.8"
          fontWeight="800"
          fontFamily="monospace"
          letterSpacing="1.2"
        >
          <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
            ★ PAID ★
          </textPath>
        </text>
        <text
          x="50"
          y="53.5"
          textAnchor="middle"
          fill="currentColor"
          fontSize="10"
          fontWeight="900"
          fontFamily="monospace"
          letterSpacing="0.8"
        >
          PAID
        </text>
      </svg>
    </div>
  );
}

export default function Bill({ order, config = BILL_CONFIG, className = '', innerRef = null }) {
  if (!order) return null;

  const bill = buildBillData(order, config);
  const { config: cfg } = bill;

  return (
    <div
      ref={innerRef}
      className={`bill-receipt ${className}`.trim()}
      data-paper={bill.paperWidth}
    >
      {/* Header */}
      <div className="bill-header">
        <img
          src={billLogo}
          alt={cfg.businessName}
          className="bill-logo"
        />
        <div className="bill-biz-name">{cfg.businessName}</div>
        <div className="bill-biz-addr">{cfg.address}</div>
        <div className="bill-biz-contact">Email: {cfg.email}</div>
        <div className="bill-biz-contact">Phone: {cfg.phone}</div>
        <div className="bill-biz-contact">GST: {cfg.gstin}</div>
        <div className="bill-doc-title">INVOICE</div>
      </div>

      <div className="bill-sep bill-sep-eq" aria-hidden="true" />

      {/* Date & Bill Number on One Line + Order Info */}
      <div className="bill-meta">
        <div className="bill-meta-line">
          <span>Date: {bill.dateStr}</span>
          <span>No: {bill.billNo}</span>
        </div>
        <div className="bill-meta-sub">Type: {bill.orderTypeLabel}</div>
        {(bill.customerName || bill.customerPhone) && (
          <div className="bill-meta-sub">
            {bill.customerName ? `Customer: ${bill.customerName}` : ''}
            {bill.customerName && bill.customerPhone ? ' · ' : ''}
            {bill.customerPhone ? `Phone: ${bill.customerPhone}` : ''}
          </div>
        )}
        {bill.deliveryAddress && (
          <div className="bill-meta-sub bill-meta-addr">
            Address: {bill.deliveryAddress}
          </div>
        )}
      </div>

      <div className="bill-sep bill-sep-dash" aria-hidden="true" />

      {/* Items Table */}
      <table className={`bill-items-table ${cfg.showHsn ? 'has-hsn' : ''}`}>
        <thead>
          <tr>
            <th className="bill-col-item">ITEM</th>
            {cfg.showHsn && <th className="bill-col-hsn">HSN</th>}
            <th className="bill-col-qty">QTY</th>
            <th className="bill-col-rate">RATE</th>
            <th className="bill-col-total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => (
            <tr key={idx}>
              <td className="bill-col-item">{item.name}</td>
              {cfg.showHsn && <td className="bill-col-hsn">{item.hsn}</td>}
              <td className="bill-col-qty">{item.quantity}</td>
              <td className="bill-col-rate">{item.rate.toFixed(2)}</td>
              <td className="bill-col-total">{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bill-sep bill-sep-dash" aria-hidden="true" />

      {/* Summary & PAID Stamp */}
      <div className="bill-totals-section">
        {cfg.showPaidStamp && bill.isPaid && <PaidStamp />}
        <div className="bill-totals-lines">
          <div className="bill-summary-row">
            <span>Items :</span>
            <span>{bill.itemCount}</span>
          </div>
          <div className="bill-summary-row">
            <span>Sub Total : INR</span>
            <span>{bill.subtotal.toFixed(2)}</span>
          </div>
          {cfg.showTaxLines && (
            <>
              <div className="bill-summary-row">
                <span>CGST ({bill.halfTaxPercent}%) : INR</span>
                <span>{bill.cgst.toFixed(2)}</span>
              </div>
              <div className="bill-summary-row">
                <span>SGST ({bill.halfTaxPercent}%) : INR</span>
                <span>{bill.sgst.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="bill-summary-row bill-summary-grand">
            <span>Total : INR</span>
            <span>{bill.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bill-sep bill-sep-dash" aria-hidden="true" />

      {/* PAYMENT Block */}
      <div className="bill-payment-block">
        <div className="bill-payment-heading">PAYMENT</div>
        <div className="bill-payment-row">
          <span>Method:</span>
          <span>{bill.paymentMethod}</span>
        </div>
        <div className="bill-payment-row">
          <span>Status:</span>
          <span>{bill.paymentStatus}</span>
        </div>
        <div className="bill-payment-row">
          <span>Paid:</span>
          <span>INR {bill.paidAmount.toFixed(2)}</span>
        </div>
        {bill.receivedAmount !== null && (
          <div className="bill-payment-row">
            <span>Received:</span>
            <span>INR {bill.receivedAmount.toFixed(2)}</span>
          </div>
        )}
        {bill.changeAmount !== null && (
          <div className="bill-payment-row">
            <span>Change:</span>
            <span>INR {bill.changeAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="bill-sep bill-sep-dash" aria-hidden="true" />

      <div className="bill-footer">{cfg.footerNote}</div>
    </div>
  );
}
