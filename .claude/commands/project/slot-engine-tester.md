You are a test case generator for the Dura (דורה) appointment scheduling engine.

The slot engine generates available time slots based on: working hours, service duration, existing bookings, buffer time between appointments, Shabbat/holiday rules, and multi-stylist support.

## Input

The user will provide: $ARGUMENTS

- A file path to the slot engine implementation → generate tests for that specific code
- A scenario description → generate tests for that scenario
- No argument → generate the full baseline test suite

## Your job

Read the slot engine implementation (if provided), understand its logic, then generate a comprehensive Jest test file covering all edge cases below.

## Edge case categories to cover

### 1. Basic slot generation
- Working hours 09:00–18:00, service 60min, no existing bookings → expect slots at 09:00, 10:00, ..., 17:00
- Working hours 09:00–18:00, service 90min → expect slots at 09:00, 10:30, ..., 16:30
- Buffer time of 15min between appointments → slots shrink accordingly
- Service duration longer than remaining working hours → no slot generated

### 2. Existing bookings
- One booking 10:00–11:00, 60min service, 0 buffer → slots exclude 10:00, include 09:00 and 11:00
- Two back-to-back bookings → only gaps large enough for the service produce slots
- Booking at end of day leaves no room → last slot not generated
- Overlapping bookings in DB (data integrity issue) → engine should not crash, log warning

### 3. Buffer time
- Buffer = 10min, service = 60min: booking ending at 11:00 means next slot is 11:10
- Buffer applies after the appointment, not before
- Buffer does not apply at the start of working hours (first slot is exactly at open time)
- Buffer at end of day: if slot + service + buffer exceeds closing time, slot is still valid (buffer only matters between appointments, not at close)

### 4. Shabbat and Jewish holidays
- Friday: working hours may end early (e.g. 14:00) — engine must respect configured hours, not assume full day
- Saturday (Shabbat): no slots should be generated regardless of working hours configuration
- If `isShabbat(date)` returns true → result must be empty array
- Jewish holiday (Yom Kippur, Pesach, etc.) marked as closed → same as Shabbat, empty result
- Holiday eve (erev chag): may have shortened hours — respect the business's configured hours for that day

### 5. Multi-stylist
- Two stylists, same working hours, same service → each has independent slot list
- Stylist A booked at 10:00, Stylist B free → Stylist B still shows 10:00 as available
- Client books "any available stylist" → slot available if at least one stylist is free
- One stylist on leave (blocked hours all day) → their slots are empty, others unaffected

### 6. Long services (keratin, laser course, bridal makeup)
- 3-hour service in 09:00–18:00 → slots at 09:00, 10:00, ..., 15:00 (last slot 15:00+3h=18:00)
- 3-hour service with 15min buffer: slot at 09:00 ends 12:00, next at 12:15
- Service longer than working hours → zero slots

### 7. Concurrency / race conditions
- Two clients request the same slot simultaneously → only one succeeds, second gets conflict error
- Optimistic lock timeout: slot reserved for 5 minutes during checkout → expires and becomes available again
- Booking created during slot generation → returned slots should not include the just-booked time

### 8. Timezone and DST
- All times stored and compared in UTC, displayed in Asia/Jerusalem
- Israel DST transition date: slot generation must not produce a phantom extra hour or skip an hour
- Booking stored at DST boundary → retrieved and displayed correctly

### 9. Edge of day
- Service exactly fills remaining time: working hours end 18:00, slot 17:00 + 60min = 18:00 → valid
- Service would end 1 minute after closing → not a valid slot
- First slot of the day: no buffer before it (buffer only applies between appointments)

### 10. No working hours configured
- Stylist has no WorkingHours record for the requested day → return empty array (not an error)
- Business closed on specific day (e.g. Sunday) → empty array

## Output format

Generate a single Jest test file at path: `server/services/__tests__/slotEngine.test.ts`

Structure:
```
describe('SlotEngine', () => {
  describe('Basic slot generation', () => { ... })
  describe('Existing bookings', () => { ... })
  describe('Buffer time', () => { ... })
  describe('Shabbat and Jewish holidays', () => { ... })
  describe('Multi-stylist', () => { ... })
  describe('Long services', () => { ... })
  describe('Concurrency', () => { ... })
  describe('Timezone and DST', () => { ... })
  describe('Edge of day', () => { ... })
  describe('No working hours', () => { ... })
})
```

Each test:
- Has a clear `it('should ...')` description
- Sets up minimal fixture data (working hours, bookings, buffer)
- Calls the slot engine function
- Asserts the exact expected output

Use `date-fns` or `dayjs` for date construction in tests. Mock `isShabbat()` and `isHoliday()` as jest mocks.

If the implementation file was provided, import from it directly. Otherwise, import from `'../slotEngine'` as a placeholder.
