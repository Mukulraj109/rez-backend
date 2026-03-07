import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, Joi } from '../middleware/validation';
import {
  getBillTypes,
  getProviders,
  fetchBill,
  payBill,
  getHistory,
} from '../controllers/billPaymentController';

const router = Router();

// ============================================
// Validation Schemas
// ============================================

const providerQuerySchema = Joi.object({
  type: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'broadband', 'dth', 'landline')
    .required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

const fetchBillSchema = Joi.object({
  providerId: Joi.string().required().messages({
    'any.required': 'Provider ID is required',
  }),
  customerNumber: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Customer number is required',
    'string.max': 'Customer number must be 50 characters or less',
  }),
});

const payBillSchema = Joi.object({
  providerId: Joi.string().required().messages({
    'any.required': 'Provider ID is required',
  }),
  customerNumber: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Customer number is required',
  }),
  amount: Joi.number().positive().required().messages({
    'any.required': 'Amount is required',
    'number.positive': 'Amount must be greater than 0',
  }),
});

const historyQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  billType: Joi.string()
    .valid('electricity', 'water', 'gas', 'internet', 'mobile_postpaid', 'broadband', 'dth', 'landline')
    .optional(),
});

// ============================================
// Public routes (types don't need auth)
// ============================================

router.get('/types', getBillTypes);

// ============================================
// Authenticated routes
// ============================================

router.use(authenticate);

router.get('/providers', validateQuery(providerQuerySchema), getProviders);
router.post('/fetch-bill', validate(fetchBillSchema), fetchBill);
router.post('/pay', validate(payBillSchema), payBill);
router.get('/history', validateQuery(historyQuerySchema), getHistory);

export default router;
