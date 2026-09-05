# Mobile App Information Architecture

## 1. Objective

Define the information architecture for the shared `ESS + MSS` mobile app for Android and iOS.

This document covers:

- app structure
- navigation model
- primary screens
- role-based screen visibility
- MVP screen set
- key user journeys

The app should support:

- employee self-service
- manager self-service
- quick approvals
- mobile-first daily HR interactions

## 2. App Strategy

Build one shared mobile app for both:

- employees
- managers

The app should be role-aware after login.

### Role-Based Experience

- employee users see ESS features
- manager users see ESS + MSS features
- advanced admin users should still primarily use web

This keeps the mobile product simpler and avoids managing separate apps unless required later.

## 3. Navigation Model

Use a simple bottom-tab navigation for the MVP.

### Recommended Bottom Tabs

1. Home
2. Attendance
3. Leave
4. Approvals
5. More

### Notes

- `Approvals` should appear only for users with MSS approval permissions
- for employee-only users, the fourth tab can be `Notifications` or remain hidden based on final UX choice
- `More` holds lower-frequency utilities and profile-related items

## 4. Global App Areas

The app should be structured around these major areas:

- authentication
- employee dashboard
- attendance
- leave
- approvals
- documents
- profile
- notifications
- team views for managers
- settings and support

## 5. Screen Architecture

## 5.1 Authentication

### Screens

- Splash screen
- Tenant-aware login screen
- OTP/password login flow if required
- Forgot password
- Session/device verification screen if needed

### Notes

- tenant identification may be email-domain-based, company-code-based, or URL/workspace-based
- biometric unlock can be added later after first successful login

## 5.2 Home

### Employee Home Dashboard

Show:

- greeting and profile summary
- today attendance status
- leave balance highlights
- pending requests
- quick actions
- recent announcements
- recent notifications

### Manager Home Dashboard

Show all employee widgets plus:

- pending approvals count
- team attendance exceptions
- employees on leave today
- joiners/exits or pending team actions

### Home Quick Actions

- mark attendance
- apply leave
- attendance regularization
- upload document
- open approvals
- view team today

## 5.3 Attendance

### Attendance Main Screen

Show:

- today status
- check-in/check-out button if enabled
- shift information
- work hours summary
- weekly summary
- regularization shortcut

### Attendance History

- daily attendance calendar/list
- status filters
- missed/exception days

### Attendance Regularization

- choose date
- view current record
- submit correction request
- attach note or proof if allowed

### Geo/Location Attendance

If tenant policy enables it:

- capture location
- show location permission state
- show attendance success or failure reason

## 5.4 Leave

### Leave Dashboard

Show:

- leave balances
- upcoming approved leave
- recent leave requests
- leave policy summary snippets

### Apply Leave

Fields:

- leave type
- date range
- half day / session if needed
- reason
- attachment if policy allows

### Leave History

- pending
- approved
- rejected
- cancelled

### Leave Request Detail

- full request details
- approval timeline
- approver comments
- cancel request option when allowed

## 5.5 Approvals

This area is manager-focused and visible only to users with approval rights.

### Approval Inbox

Show:

- pending approvals list
- grouped by type
- priority or aging indicators

### Approval Types For MVP

- leave approval
- attendance regularization approval

### Approval Detail Screen

Show:

- employee summary
- request details
- relevant history
- policy context where useful
- approve
- reject
- send back if supported

### Approval Filters

- by request type
- by status
- by team/unit if scope allows

## 5.6 Team

This can live inside `Home`, `Approvals`, or `More` depending on final UX.

### Team Summary Screen

Show:

- direct reports count
- on leave today
- absent or exception count
- pending approvals
- recent team alerts

### Team Member List

- direct reports
- searchable list
- status chips

### Team Member Detail

Show:

- basic employee info
- department/designation
- today attendance status
- leave balance summary if allowed
- active requests if relevant

This screen should never expose fields restricted by policy.

## 5.7 Documents

### Documents List

Show:

- available documents
- uploaded documents
- required documents pending
- expiry reminders if relevant

### Upload Document

- choose category
- upload from camera/gallery/files
- add remarks if needed

### Document Detail

- verification status
- uploaded date
- expiry date
- replace or re-upload if allowed

## 5.8 Profile

### Profile Summary

- employee card
- contact info
- department/designation
- reporting manager
- employment summary

### Editable Profile Sections

- contact details
- emergency contacts
- selected personal details

### Change Request Flow

For restricted fields:

- employee requests change
- request enters workflow
- employee can track status

## 5.9 Notifications

### Notifications Center

Show:

- approval updates
- leave updates
- attendance alerts
- reminders
- announcements

### Notification Detail

- message
- action target deep link
- read/unread state

## 5.10 More

Recommended items:

- profile
- documents
- notifications
- announcements
- help and support
- privacy/security
- logout

Manager-specific extras may include:

- team summary
- team leave calendar

## 6. Role-Based Visibility Matrix

### Employee

Visible:

- Home
- Attendance
- Leave
- Profile
- Documents
- Notifications

Hidden or limited:

- Approvals
- Team views

### Manager

Visible:

- all employee features
- Approvals
- Team summary
- Team member views within scope

### HR/Admin

If mobile access is allowed:

- mostly same as manager-level quick views
- avoid exposing full admin configuration in mobile

## 7. MVP Screen Set

The first mobile MVP should include:

- login
- home dashboard
- attendance summary
- mark attendance if enabled
- leave balance and leave apply
- leave history
- approval inbox for managers
- approval detail with approve/reject
- notifications center
- profile summary

This is enough for a meaningful ESS/MSS launch.

## 8. Phase 2 Screen Expansion

Add:

- document upload and list
- attendance regularization
- team attendance exceptions
- team member details
- profile change requests
- announcements

## 9. Phase 3 Screen Expansion

Add:

- geo attendance enhancements
- biometric unlock
- richer team insights
- downloadable letters
- claims/reimbursements if product scope expands

## 10. Key User Journeys

### Employee Journey: Apply Leave

1. Open app
2. Go to Leave
3. View balances
4. Tap Apply Leave
5. Submit request
6. See confirmation and approval status

### Employee Journey: Mark Attendance

1. Open app
2. Go to Attendance or use Home quick action
3. Mark attendance
4. See success/failure state
5. Review current day status

### Manager Journey: Approve Leave

1. Receive notification
2. Open Approvals
3. Review request detail
4. Approve or reject
5. System updates employee and logs action

### Employee Journey: Request Profile Change

1. Open Profile
2. Edit allowed fields or create change request
3. Submit request
4. Track status from request history

## 11. Mobile API Grouping Recommendation

The backend should group APIs around mobile tasks:

- auth
- dashboard
- attendance
- leave
- approvals
- profile
- documents
- notifications
- team

This will make app development cleaner than exposing only generic CRUD endpoints.

## 12. UX and Content Priorities

The app should favor:

- short labels
- obvious status states
- one-tap approvals
- strong empty states
- minimal form friction
- fast loading summaries

Avoid:

- crowded dashboards
- desktop-style tables
- deep nested settings
- configuration-heavy screens

## 13. Final Recommendation

The mobile app should be organized as a single role-aware `ESS + MSS` product with:

- bottom-tab navigation
- employee-first daily actions
- manager approval workflows
- strong notification integration
- limited but high-value team visibility

This gives a clean MVP path and aligns well with the web-admin plus mobile-self-service product strategy.
