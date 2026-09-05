# ESS and MSS Mobile Strategy

## 1. Objective

Define the mobile app strategy for:

- `ESS` (Employee Self-Service)
- `MSS` (Manager Self-Service)

The mobile apps should focus on high-frequency daily actions and approvals, while complex administration, setup, and configuration should remain primarily web-based.

## 2. Product Direction

Use mobile for:

- employee convenience
- manager approvals
- attendance and leave actions
- quick document access
- alerts and workflow responses

Use web for:

- tenant setup
- master configuration
- policy definition
- organization management
- deep reporting
- complex admin workflows

This is the right product split for both usability and delivery speed.

## 3. Recommended Mobile Scope

### 3.1 ESS Mobile Scope

Employees should be able to:

- log in securely
- view profile summary
- update allowed profile fields
- upload documents
- apply for leave
- view leave balances and leave history
- mark attendance where policy allows
- view attendance status and exceptions
- submit attendance regularization
- download HR letters and documents
- receive notifications
- raise profile change requests
- view organization announcements

### 3.2 MSS Mobile Scope

Managers should be able to:

- view team summary
- approve or reject leave requests
- approve or reject attendance regularization
- view team attendance exceptions
- view joiners, exits, and pending team actions
- receive approval notifications
- view direct report basic details

## 4. What Should Stay Web-First

The following should remain web-first in the early phases:

- organization setup
- department and hierarchy management
- leave and attendance policy configuration
- role and permission configuration
- workflow template setup
- bulk imports
- advanced reports and exports
- document category and verification master setup
- tenant-level admin settings

## 5. Recommended Platform Approach

Build:

- one shared backend API platform
- one web app for admin, HR, finance, and advanced management tasks
- one mobile app product for employees and managers

The mobile experience should be role-aware inside the same app:

- employee sees ESS features
- manager sees ESS + MSS features

This avoids maintaining separate employee and manager apps unless branding or market strategy requires that later.

## 6. Recommended Mobile Technology

For Android and iOS, prefer:

- `React Native`
- `Expo` if compatible with required device features
- `TypeScript`

### Why

- one codebase for Android and iOS
- faster MVP delivery
- shared team knowledge with React/Next.js
- easier consistency across web and mobile product language

### Native Features Needed

The app should be designed to support:

- push notifications
- secure login sessions
- camera/file upload for documents
- location capture if attendance policy requires it
- biometric unlock later if needed

## 7. Mobile-First Use Cases

These are the highest-priority journeys for the first mobile release:

1. Employee login and dashboard
2. Leave apply and leave status tracking
3. Attendance mark and attendance summary
4. Manager approval inbox
5. Notifications and reminders
6. Document access and upload

## 8. Mobile UX Principles

- very fast task completion
- simple home dashboard
- approvals in one or two taps
- clear status chips for leave and attendance
- strong offline/error handling messaging
- minimal typing where possible

Mobile should optimize for:

- glanceable data
- quick actions
- approval workflows

Not for deep configuration or long-form admin data entry.

## 9. Authentication and Security

Mobile security should include:

- secure token/session handling
- forced tenant-aware access checks from backend
- device/session revocation support
- optional biometric unlock later
- strict API scope enforcement

Sensitive data visibility in mobile should respect the same:

- role permissions
- field policies
- workflow authority
- tenant scope rules

as web.

## 10. Offline and Network Strategy

The first version does not need full offline operation, but should support:

- graceful retry behavior
- local caching of non-sensitive summary data
- queued uploads if practical later
- clear handling for poor network conditions

This is important for field employees and managers on the move.

## 11. Push Notification Strategy

Push notifications should be first-class for mobile.

### Important Notification Types

- leave request submitted
- leave approved/rejected
- attendance regularization pending approval
- attendance approval decision
- probation or document reminders
- policy announcements
- onboarding/offboarding task reminders where relevant

## 12. Mobile API Design Considerations

The backend should expose mobile-friendly APIs for:

- dashboard summaries
- approval inbox
- leave apply/status
- attendance actions
- document list and upload
- profile summary and allowed edits
- notifications

Mobile APIs should avoid requiring the app to assemble too many separate calls for common screens.

## 13. Permission Model Impact

The mobile app must follow the same permission model already defined for web:

- employee users stay self-scoped
- managers get only configured reportee scope
- field-level restrictions still apply
- export-heavy and admin-heavy permissions stay web-side

Mobile should not become a shortcut around web access restrictions.

## 14. Release Phases

### Phase 1 Mobile MVP

- login
- employee dashboard
- leave flows
- attendance summary
- manager approval inbox
- notifications

### Phase 2 Mobile Expansion

- document upload and access
- profile change requests
- team attendance insights
- joiner/exit alerts for managers

### Phase 3 Advanced Mobile Features

- geo attendance if enabled
- biometric unlock
- richer offline handling
- mobile letter downloads
- reimbursement and claims later if product expands

## 15. Final Recommendation

Build Android and iOS support as one cross-platform `ESS/MSS` mobile app, not as a full admin app.

Recommended product split:

- Web app: admin, HR operations, configuration, advanced reports
- Mobile app: ESS and MSS daily actions, approvals, alerts, and quick access

This gives the best mix of usability, speed, and maintainability.
