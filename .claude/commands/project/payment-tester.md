You are a payment integration test generator for the Dura (דורה) app.

The app uses an Israeli payment processor (Tranzila or Cardcom) for in-app booking payments. Your job is to generate a complete test suite for the payment service layer.

## Input

The user will provide: $ARGUMENTS

- A file path to the payment service implementation → generate tests for that code
- A processor name (`tranzila` or `cardcom`) → generate tests assuming that processor's API
- No argument → read `server/services/paymentService.ts` and generate tests for it

## Test scenarios to cover

### 1. Successful charge
- Valid card token, correct amount in ILS, booking ID attached
- Expect: payment record created with status `COMPLETED`, `provider_ref` populated
- Expect: booking status updated to `CONFIRMED`
- Expect: confirmation notification triggered

### 2. Declined card
- Processor returns decline code (e.g. insufficient funds, card blocked)
- Expect: payment record created with status `FAILED`
- Expect: booking status stays `PENDING` (not confirmed)
- Expect: error returned to client with Hebrew-friendly message key
- Expect: slot lock released so other clients can book

### 3. Network timeout / processor unreachable
- HTTP request to processor times out after configured threshold
- Expect: payment service throws a retryable error (not a permanent failure)
- Expect: booking stays `PENDING`, not marked `FAILED` (to allow retry)
- Expect: error is logged with booking ID for manual investigation

### 4. Duplicate charge prevention
- Same booking ID submitted twice (e.g. client double-taps confirm button)
- Expect: idempotency check prevents second charge
- Expect: second call returns the existing payment record, not a new charge
- Use idempotency key = `booking_${bookingId}`

### 5. Partial amount mismatch
- Client sends amount different from server-calculated price (tampered request)
- Expect: server rejects before calling processor — never trust client-side amount
- Expect: 400 error with code `AMOUNT_MISMATCH`

### 6. Full refund — within cancellation window
- Booking cancelled within 24 hours before appointment
- Expect: refund API called on processor with full amount
- Expect: payment record updated to status `REFUNDED`
- Expect: booking status set to `CANCELLED`
- Expect: refund confirmation notification sent to client

### 7. No refund — outside cancellation window
- Booking cancelled less than 24 hours before appointment (or after)
- Expect: refund API NOT called
- Expect: booking status set to `CANCELLED_NO_REFUND`
- Expect: client notified that no refund will be issued

### 8. Partial refund (if supported)
- Business offers partial refund as goodwill gesture
- Expect: partial refund amount validated (cannot exceed original charge)
- Expect: payment record updated with `refunded_amount` field

### 9. Refund failure
- Refund API call fails (processor error)
- Expect: booking NOT marked as cancelled (rollback)
- Expect: error logged with full context for manual processing
- Expect: client shown error — do not silently fail a refund

### 10. Saved card reuse
- Client has a saved card token from a previous payment
- Token reused for new booking charge
- Expect: processor called with token, no new card data entered
- Expect: if token expired → graceful error asking client to re-enter card

### 11. Currency validation
- All amounts must be in ILS (₪)
- Expect: service rejects any charge with non-ILS currency
- Expect: amount stored as integer (agorot / cents) to avoid float precision issues

### 12. Webhook / callback handling (if processor uses callbacks)
- Processor sends async payment confirmation webhook
- Expect: webhook signature verified before processing
- Expect: invalid signature → 401, no state change
- Expect: valid webhook → payment status updated, booking confirmed
- Expect: duplicate webhook (same `provider_ref`) → idempotent, no double-confirmation

## Output format

Generate a Jest test file at: `server/services/__tests__/paymentService.test.ts`

Structure:
```
describe('PaymentService', () => {
  describe('Charge', () => { ... })
  describe('Refund', () => { ... })
  describe('Saved cards', () => { ... })
  describe('Webhooks', () => { ... })
  describe('Validation', () => { ... })
})
```

- Mock the HTTP client (axios/fetch) used to call the processor — do not make real API calls
- Mock the database (Prisma) — use `jest.mock('@prisma/client')`
- Each test: arrange → act → assert
- Use realistic Israeli amounts (e.g. 250 ILS = 25000 agorot)

If the implementation was provided, import from it directly. Otherwise use `'../paymentService'` as placeholder.
