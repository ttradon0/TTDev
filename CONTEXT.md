# Meeting Room Booking

This context describes how university users reserve campus meeting rooms and how administrators manage those rooms and reservations.

## Language

**User**:
An email-and-password account assigned either the Student or Admin role. Demo accounts are provisioned in advance; public sign-up is not available.
_Avoid_: Member, customer

**Student**:
A university user who can book and cancel meeting rooms.
_Avoid_: Attendee (for the person making a booking)

**Admin**:
A university user who manages rooms and bookings.
_Avoid_: Moderator

**Room**:
A university meeting space with a capacity that can be booked when its status is Available.
_Avoid_: Venue

**Room capacity**:
The maximum number of people allowed in a booking for that room.
_Avoid_: Seating count (unless it means a different physical measure)

**Room status**:
The room's operational state: Available or Maintenance. A room under Maintenance cannot be booked.
_Avoid_: Booking status

**Removed room**:
A room no longer offered for new bookings; existing bookings retain enough room information to remain readable.
_Avoid_: Deleted booking history

**Booking**:
A confirmed reservation of one room for a meeting name, date, start time, end time, and attendee count.
_Avoid_: Request, reservation request

**Active booking**:
A confirmed booking that has not been cancelled and whose end time has not passed. A student may have at most one active booking.
_Avoid_: Pending booking

**Time slot**:
A 30-minute interval on a room's day schedule. Bookings use one or more adjacent time slots.
_Avoid_: Arbitrary time block

**Booking hours**:
The daily period from 06:00 through 18:00 in Asia/Bangkok.
_Avoid_: Opening hours

**Allowed duration**:
A booking lasts 30, 60, 90, or 120 minutes.
_Avoid_: Custom duration

**Booking window**:
The rolling 24 hours from the current time in Asia/Bangkok.
_Avoid_: Tomorrow-only window

**Cancellation cutoff**:
The point 30 minutes before a booking starts; students may cancel at or before it, while admins can cancel regardless of the cutoff.
_Avoid_: Cancellation deadline
