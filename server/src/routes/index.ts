import { Router } from 'express'
import { requireAuth, requireOwner } from '../middleware/auth.js'
import { ah } from '../utils/handler.js'
import * as boot from '../controllers/bootController.js'
import * as auth from '../controllers/authController.js'
import * as otp from '../controllers/authOtpController.js'
import * as me from '../controllers/meController.js'
import * as business from '../controllers/businessController.js'
import * as team from '../controllers/teamController.js'
import * as dashboard from '../controllers/dashboardController.js'
import * as customer from '../controllers/customerController.js'
import * as order from '../controllers/orderController.js'
import * as payment from '../controllers/orderPaymentController.js'
import * as measurement from '../controllers/measurementController.js'
import * as notification from '../controllers/notificationController.js'

const router = Router()

router.get(['/api', '/api/'], boot.apiRoot)
router.get('/api/health', boot.health)
router.get('/api/warmup', boot.warmup)
router.get('/api/welcome', boot.welcome)
router.get('/login', boot.loginPage)

router.post('/api/auth/signup', auth.signup)
router.post('/api/auth/staff-signup', auth.staffSignup)
router.post('/api/auth/otp/login/challenge', otp.loginChallenge)
router.post('/api/auth/otp/login/resend', otp.loginResend)
router.post('/api/auth/otp/login/complete', otp.loginComplete)
router.post('/api/auth/otp/login/verify', otp.loginVerify)
router.post('/api/auth/otp/forgot/send', otp.forgotSend)
router.post('/api/auth/otp/forgot/verify', otp.forgotVerify)
router.post('/api/auth/otp/forgot/reset', otp.forgotReset)

router.use('/api', requireAuth)

router.get('/api/me', ah(me.getMe))
router.patch('/api/business', requireOwner, ah(business.patchBusiness))
router.post('/api/business/rotate-join-code', requireOwner, ah(business.rotateCode))
router.get('/api/team', ah(team.listTeam))
router.get('/api/dashboard/stats', ah(dashboard.stats))
router.get('/api/dashboard/summary', ah(dashboard.summary))

router.get('/api/customers', ah(customer.list))
router.get('/api/customers/active', ah(customer.listActive))
router.get('/api/customers/:id', ah(customer.get))
router.get('/api/customers/:id/orders', ah(customer.orders))
router.post('/api/customers', ah(customer.create))
router.put('/api/customers/:id', ah(customer.update))
router.post('/api/customers/:id/disable', ah(customer.disable))
router.put('/api/customers/:id/disable', ah(customer.disable))
router.post('/api/customers/:id/enable', ah(customer.enable))
router.put('/api/customers/:id/enable', ah(customer.enable))

router.get('/api/customers/:customerId/measurements', ah(measurement.listForCustomer))
router.get('/api/customers/:customerId/measurements/:garment', ah(measurement.getGarment))
router.put('/api/customers/:customerId/measurements/:garment', ah(measurement.saveGarment))

router.get('/api/measurement-templates', ah(measurement.allTemplatesHandler))
router.get('/api/measurement-templates/:garment', ah(measurement.garmentTemplate))

router.get('/api/orders', ah(order.list))
router.get('/api/orders/:id', ah(order.get))
router.post('/api/orders', ah(order.create))
router.put('/api/orders/:id', ah(order.update))

router.get('/api/orders/:orderId/payments/info', ah(payment.info))
router.post('/api/orders/:orderId/payments/cash', ah(payment.cash))
router.post('/api/orders/:orderId/payments/mark-paid', ah(payment.markPaid))
router.post('/api/orders/:orderId/payments/phonepe/initiate', ah(payment.phonePeInitiate))
router.post('/api/orders/:orderId/payments/phonepe/sync', ah(payment.phonePeSync))

router.get('/api/notifications', ah(notification.list))
router.get('/api/notifications/unread-count', ah(notification.unreadCount))
router.post('/api/notifications/:id/read', ah(notification.markRead))
router.post('/api/notifications/read-all', ah(notification.markAllRead))

export default router
