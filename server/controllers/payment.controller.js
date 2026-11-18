const crypto = require('crypto');
const PaytmChecksum = require('paytmchecksum');
const { Op } = require('sequelize');
const sequelize = require('../src/config/db');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const ApiResponse = require('../utils/ApiResponse');
const { emitNewOrder } = require('../admin/admin.socket');

const getPaytmConfig = () => {
  const isProduction = process.env.PAYTM_ENV === 'production';
  return {
    isProduction,
    mid: process.env.PAYTM_MID,
    merchantKey: process.env.PAYTM_MERCHANT_KEY,
    website: process.env.PAYTM_WEBSITE || (isProduction ? 'DEFAULT' : 'WEBSTAGING'),
    paytmHost: isProduction ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in',
    callbackUrl: process.env.PAYTM_CALLBACK_URL || 'https://doodcafe.onrender.com/api/payment/callback',
  };
};

const getFrontendUrl = () => {
  let url = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN;
  if (url && typeof url === 'string') {
    if (url.includes(',')) {
      url = url.split(',')[0].trim();
    }
    url = url.trim().replace(/\/+$/, '');
  }

  if (!url) {
    console.warn('[Payment Callback] FRONTEND_URL / CLIENT_ORIGIN missing, falling back to allowed origin');
    url = 'https://doodcafe-frontend.onrender.com';
  }

  return url;
};

const redirectToCheckout = (res, rawStatus, safeOrderId) => {
  let status = 'failed';
  if (rawStatus === 'paid' || rawStatus === 'success') {
    status = 'success';
  } else if (rawStatus === 'pending') {
    status = 'pending';
  }

  const frontendUrl = getFrontendUrl();
  const orderIdParam = typeof safeOrderId === 'string' ? safeOrderId.trim() : '';
  const redirectUrl = `${frontendUrl}/checkout?payment_status=${encodeURIComponent(status)}&orderId=${encodeURIComponent(orderIdParam)}`;

  return res.redirect(303, redirectUrl);
};

// @desc   Initiate Paytm JS Checkout transaction
// @route  POST /api/payment/initiate
// @access Private (authenticated customer)
const initiatePayment = async (req, res, next) => {
  try {
    const isOnlinePaymentEnabled = process.env.ENABLE_ONLINE_PAYMENT === 'true';
    if (!isOnlinePaymentEnabled) {
      return ApiResponse.error(res, {
        statusCode: 403,
        message: 'Online payment is currently disabled. Please use Cash on Delivery or Pay at Counter.',
      });
    }

    const { mid, merchantKey, website, paytmHost, callbackUrl, isProduction } = getPaytmConfig();

    if (!mid || !merchantKey) {
      return ApiResponse.error(res, {
        statusCode: 503,
        message: 'Paytm Payment Gateway is currently not configured on server',
      });
    }

    const {
      items,
      customerName,
      customerPhone,
      specialInstructions,
      orderType,
      customer_location,
      deliveryAddress,
      coordinates,
      tableNumber,
      tableNo,
      idempotencyKey,
    } = req.body;

    // Idempotency: if already exists with same key
    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const existing = await Order.findOne({ where: { idempotencyKey: idempotencyKey.trim() } });
      if (existing) {
        if (existing.paymentStatus === 'paid') {
          return ApiResponse.success(res, {
            statusCode: 200,
            message: 'Order already placed and paid',
            data: {
              orderId: existing.id,
              orderNumber: existing.orderNumber,
              billNumber: existing.billNumber,
              paymentStatus: existing.paymentStatus,
              alreadyPaid: true,
            },
          });
        }
      }
    }

    const resolvedOrderType = ['takeaway', 'delivery', 'dine-in'].includes(orderType) ? orderType : 'takeaway';
    const rawTable = tableNumber || tableNo;
    const resolvedTableNumber = resolvedOrderType === 'dine-in' && rawTable ? String(rawTable).trim() : null;
    const resolvedCustomerName = customerName ? customerName.trim() : (req.user?.name || 'Customer');
    const resolvedCustomerPhone = customerPhone ? customerPhone.trim() : (req.user?.phone || '');

    // Delivery geofence check
    if (resolvedOrderType === 'delivery') {
      const locCheck = `${deliveryAddress || ''} ${customer_location || ''}`.toLowerCase();
      if (locCheck && !locCheck.includes('coimbatore')) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: 'Delivery currently available in Coimbatore city limits only',
        });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return ApiResponse.error(res, {
        statusCode: 400,
        message: 'Order must contain at least one item',
      });
    }

    const enrichedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const itemId = item.menuItemId || item.id || item._id;
      let menuItem = null;

      if (itemId && typeof itemId === 'string' && itemId.trim()) {
        menuItem = await MenuItem.findByPk(itemId.trim());
      } else if (item.name && typeof item.name === 'string' && item.name.trim()) {
        menuItem = await MenuItem.findOne({
          where: { name: { [Op.iLike]: item.name.trim() } },
        });
      }

      if (!menuItem) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Menu item not found: ${itemId || item.name || 'Unknown item'}`,
        });
      }

      if (!menuItem.available) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Item "${menuItem.name}" is currently unavailable`,
        });
      }

      const qty = item.quantity && Number(item.quantity) > 0 ? parseInt(item.quantity, 10) : 1;
      if (isNaN(qty) || qty < 1 || qty > 99) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Invalid quantity for item "${menuItem.name}"`,
        });
      }

      const dbPrice = Number(menuItem.price);
      totalAmount += dbPrice * qty;

      enrichedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: dbPrice,
        quantity: qty,
      });
    }

    const fallbackLocation = 'Coimbatore, Tamil Nadu';
    const fallbackCoords = { lat: 11.0168, lng: 76.9558 };

    // Transaction-safe order creation with paymentMode: 'upi', paymentStatus: 'pending'
    const order = await sequelize.transaction(async (t) => {
      try {
        await sequelize.query('SELECT pg_advisory_xact_lock(987654321);', { transaction: t });
      } catch (_) {}

      const [maxResult] = await sequelize.query(
        'SELECT COALESCE(MAX("orderNumber"), 1000) + 1 AS next FROM orders',
        { type: sequelize.constructor.QueryTypes.SELECT, transaction: t }
      );
      const nextOrderNumber = (maxResult && maxResult.next) ? Number(maxResult.next) : 1001;
      const billNumber = `ORD-${nextOrderNumber}`;
      // Crypto-based random and unguessable paytmOrderId satisfying Paytm's ^[A-Za-z0-9_-]{1,50}$ rules
      const paytmOrderId = `PTM_${crypto.randomBytes(16).toString('hex')}`;

      return await Order.create({
        userId: req.user.id,
        items: enrichedItems,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        orderType: resolvedOrderType,
        paymentMode: 'upi',
        paymentStatus: 'pending',
        tableNumber: resolvedTableNumber,
        customerName: resolvedCustomerName,
        customerPhone: resolvedCustomerPhone,
        customer_location: (customer_location || deliveryAddress || (resolvedOrderType === 'dine-in' ? `Dood Cafe — Dine-in${resolvedTableNumber ? ` (Table ${resolvedTableNumber})` : ''}` : fallbackLocation)).substring(0, 200),
        deliveryAddress: (deliveryAddress || customer_location || (resolvedOrderType === 'dine-in' ? `Dood Cafe — Dine-in${resolvedTableNumber ? ` (Table ${resolvedTableNumber})` : ''}` : fallbackLocation)).substring(0, 250),
        coordinates: (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number')
          ? coordinates
          : fallbackCoords,
        specialInstructions: specialInstructions || '',
        status: 'pending',
        orderNumber: nextOrderNumber,
        billNumber,
        paytmOrderId,
        idempotencyKey: (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim()) ? idempotencyKey.trim() : null,
      }, { transaction: t });
    });

    const paytmOrderId = order.paytmOrderId;

    // Call Paytm Initiate Transaction API
    const paytmParams = {
      body: {
        requestType: 'Payment',
        mid,
        websiteName: website,
        orderId: paytmOrderId,
        callbackUrl,
        txnAmount: {
          value: Number(order.totalAmount).toFixed(2),
          currency: 'INR',
        },
        userInfo: {
          custId: `CUST_${req.user.id.replace(/-/g, '').slice(0, 20)}`,
        },
      },
    };

    const signature = await PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), merchantKey);
    paytmParams.head = { signature };

    const initiateUrl = `${paytmHost}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(paytmOrderId)}`;
    const paytmResponse = await fetch(initiateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmParams),
    });

    const paytmData = await paytmResponse.json();
    const resultStatus = paytmData?.body?.resultInfo?.resultStatus;

    if (resultStatus !== 'S') {
      const errMsg = paytmData?.body?.resultInfo?.resultMsg || 'Failed to initiate Paytm payment';
      return ApiResponse.error(res, {
        statusCode: 502,
        message: errMsg,
      });
    }

    const txnToken = paytmData.body.txnToken;

    return ApiResponse.success(res, {
      statusCode: 200,
      message: 'Payment initiated successfully',
      data: {
        orderId: order.id,
        paytmOrderId,
        txnToken,
        amount: order.totalAmount,
        mid,
        isStaging: !isProduction,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Handle Paytm webhook / redirect callback
// @route  POST /api/payment/callback
// @access Public (No JWT)
const handlePaymentCallback = async (req, res, next) => {
  try {
    const { mid, merchantKey, paytmHost } = getPaytmConfig();
    const rawBody = req.body || {};
    const paytmOrderId = rawBody.ORDERID;
    const paytmChecksum = rawBody.CHECKSUMHASH;

    const isBrowserRequest = Boolean(
      (req.headers.accept && req.headers.accept.includes('text/html')) ||
      req.is('application/x-www-form-urlencoded') ||
      (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) ||
      (!req.xhr && !req.headers.accept?.includes('application/json'))
    );

    if (!paytmOrderId) {
      if (isBrowserRequest) {
        return redirectToCheckout(res, 'failed', '');
      }
      return ApiResponse.error(res, { statusCode: 400, message: 'Missing ORDERID in callback' });
    }

    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { paytmOrderId },
          { id: paytmOrderId },
        ],
      },
    });

    if (!order) {
      if (isBrowserRequest) {
        return redirectToCheckout(res, 'failed', paytmOrderId);
      }
      return ApiResponse.error(res, { statusCode: 404, message: 'Order not found' });
    }

    // Idempotent: if already paid, do nothing
    if (order.paymentStatus === 'paid') {
      if (isBrowserRequest) {
        return redirectToCheckout(res, 'success', order.paytmOrderId);
      }
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Order already paid (idempotent)',
        data: { orderId: order.orderNumber, paymentStatus: 'paid' },
      });
    }

    // 1. Verify Paytm's Checksum
    const paytmParams = { ...rawBody };
    delete paytmParams.CHECKSUMHASH;

    let isChecksumValid = false;
    if (paytmChecksum && merchantKey) {
      try {
        isChecksumValid = await PaytmChecksum.verifySignature(paytmParams, merchantKey, paytmChecksum);
      } catch (_) {
        isChecksumValid = false;
      }
    }

    if (!isChecksumValid) {
      order.paymentStatus = 'failed';
      order.gatewayName = 'PAYTM';
      order.rawGatewayResponse = {
        ...rawBody,
        failureReason: 'Invalid Paytm callback checksum signature',
      };
      await order.save();

      if (isBrowserRequest) {
        return redirectToCheckout(res, 'failed', order.paytmOrderId);
      }
      return ApiResponse.error(res, { statusCode: 400, message: 'Invalid Paytm callback checksum signature' });
    }

    // 2. Call Transaction Status API to confirm
    const statusBody = {
      mid,
      orderId: paytmOrderId,
    };
    const statusSignature = await PaytmChecksum.generateSignature(JSON.stringify(statusBody), merchantKey);
    const statusResponse = await fetch(`${paytmHost}/v3/order/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: statusBody,
        head: { signature: statusSignature },
      }),
    });

    const statusData = await statusResponse.json();
    const responseBody = statusData?.body || {};
    const resultStatus = responseBody?.resultInfo?.resultStatus;

    // Verify ALL match:
    // a. Status is success
    const isStatusSuccess = resultStatus === 'TXN_SUCCESS';

    // b. Paytm paid amount equals order total in DB (compare as numbers with 2 decimals)
    const paidAmount = parseFloat(Number(responseBody.txnAmount || rawBody.TXNAMOUNT || 0).toFixed(2));
    const expectedAmount = parseFloat(Number(order.totalAmount || 0).toFixed(2));
    const isAmountMatched = !isNaN(paidAmount) && paidAmount === expectedAmount;

    // c. MID in the response equals configured PAYTM_MID
    const responseMid = responseBody.mid || rawBody.MID;
    const isMidMatched = Boolean(responseMid && responseMid === mid);

    const isVerifiedPaid = isStatusSuccess && isAmountMatched && isMidMatched;

    if (isVerifiedPaid) {
      order.paymentStatus = 'paid';
      order.transactionId = responseBody.txnId || rawBody.TXNID || null;
      order.bankTxnId = responseBody.bankTxnId || rawBody.BANKTXNID || null;
      order.gatewayName = responseBody.gatewayName || responseBody.paymentMode || 'PAYTM';
      order.rawGatewayResponse = responseBody;
      await order.save();

      if (req.io) {
        req.io.emit('order-payment-updated', {
          orderId: order.id,
          paymentStatus: 'paid',
          orderNumber: order.orderNumber,
          billNumber: order.billNumber,
        });
        req.io.emit('newOrderNotification', order.toJSON());
      }
      try {
        emitNewOrder(order.toJSON());
      } catch (_) {}
    } else if (resultStatus === 'PENDING') {
      // Item 5: Paytm status "PENDING" leaves the order pending (never mark failed or paid)
      order.transactionId = responseBody.txnId || rawBody.TXNID || order.transactionId;
      order.rawGatewayResponse = responseBody;
      await order.save();
    } else {
      let failureReason = 'Transaction not successful';
      if (!isStatusSuccess) {
        failureReason = `Status was ${resultStatus || 'UNKNOWN'}: ${responseBody?.resultInfo?.resultMsg || 'Transaction failed'}`;
      } else if (!isAmountMatched) {
        failureReason = `Amount mismatch: paid ${paidAmount} does not match expected ${expectedAmount}`;
      } else if (!isMidMatched) {
        failureReason = `MID mismatch: received ${responseMid} does not match configured MID`;
      }

      order.paymentStatus = 'failed';
      order.transactionId = responseBody.txnId || rawBody.TXNID || null;
      order.bankTxnId = responseBody.bankTxnId || rawBody.BANKTXNID || null;
      order.gatewayName = responseBody.gatewayName || responseBody.paymentMode || 'PAYTM';
      order.rawGatewayResponse = {
        ...responseBody,
        failureReason,
      };
      await order.save();
    }

    if (isBrowserRequest) {
      return redirectToCheckout(res, order.paymentStatus, order.paytmOrderId);
    }

    return ApiResponse.success(res, {
      statusCode: 200,
      message: `Payment status updated to ${order.paymentStatus}`,
      data: {
        orderId: order.orderNumber,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get live payment status for frontend polling
// @route  GET /api/payment/status/:orderId
// @access Public / Authenticated
const getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return ApiResponse.error(res, { statusCode: 400, message: 'paytmOrderId is required' });
    }

    // Look up by paytmOrderId only
    const order = await Order.findOne({
      where: { paytmOrderId: orderId },
    });

    if (!order) {
      return ApiResponse.error(res, { statusCode: 404, message: 'Order not found' });
    }

    // If order is still pending, proactively check Paytm Transaction Status API
    if (order.paymentStatus === 'pending' && order.paytmOrderId) {
      const { mid, merchantKey, paytmHost } = getPaytmConfig();
      if (mid && merchantKey) {
        try {
          const statusBody = { mid, orderId: order.paytmOrderId };
          const statusSignature = await PaytmChecksum.generateSignature(JSON.stringify(statusBody), merchantKey);
          const statusRes = await fetch(`${paytmHost}/v3/order/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              body: statusBody,
              head: { signature: statusSignature },
            }),
          });
          const statusData = await statusRes.json();
          const responseBody = statusData?.body || {};
          const verifiedStatus = responseBody?.resultInfo?.resultStatus;

          const isStatusSuccess = verifiedStatus === 'TXN_SUCCESS';
          const paidAmount = parseFloat(Number(responseBody.txnAmount || 0).toFixed(2));
          const expectedAmount = parseFloat(Number(order.totalAmount || 0).toFixed(2));
          const isAmountMatched = !isNaN(paidAmount) && paidAmount === expectedAmount;
          const responseMid = responseBody.mid;
          const isMidMatched = Boolean(responseMid && responseMid === mid);

          const isVerifiedPaid = isStatusSuccess && isAmountMatched && isMidMatched;

          if (isVerifiedPaid) {
            order.paymentStatus = 'paid';
            order.transactionId = responseBody.txnId || null;
            order.bankTxnId = responseBody.bankTxnId || null;
            order.gatewayName = responseBody.gatewayName || responseBody.paymentMode || 'PAYTM';
            order.rawGatewayResponse = responseBody;
            await order.save();

            if (req.io) {
              req.io.emit('order-payment-updated', {
                orderId: order.id,
                paymentStatus: 'paid',
                orderNumber: order.orderNumber,
                billNumber: order.billNumber,
              });
            }
          } else if (verifiedStatus === 'PENDING') {
            // Item 5: Paytm status "PENDING" leaves the order pending (never mark failed or paid)
          } else if (verifiedStatus === 'TXN_FAILURE' || (isStatusSuccess && (!isAmountMatched || !isMidMatched))) {
            let failureReason = 'Transaction not successful';
            if (!isStatusSuccess) {
              failureReason = `Status was ${verifiedStatus || 'UNKNOWN'}: ${responseBody?.resultInfo?.resultMsg || 'Transaction failed'}`;
            } else if (!isAmountMatched) {
              failureReason = `Amount mismatch: paid ${paidAmount} does not match expected ${expectedAmount}`;
            } else if (!isMidMatched) {
              failureReason = `MID mismatch: received ${responseMid} does not match configured MID`;
            }

            order.paymentStatus = 'failed';
            order.transactionId = responseBody.txnId || null;
            order.gatewayName = responseBody.gatewayName || 'PAYTM';
            order.rawGatewayResponse = {
              ...responseBody,
              failureReason,
            };
            await order.save();
          }
        } catch (_) {
          // Non-fatal status check failure
        }
      }
    }

    // Return ONLY { orderId (order number), paymentStatus, paymentMode, totalAmount }
    return ApiResponse.success(res, {
      statusCode: 200,
      data: {
        orderId: order.orderNumber,
        paymentStatus: order.paymentStatus,
        paymentMode: order.paymentMode,
        totalAmount: order.totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiatePayment,
  handlePaymentCallback,
  getPaymentStatus,
};
