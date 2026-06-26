# Test Users for Implementation Department

## New Test Users for UX Review

### Implementation Employee
- **Email**: mike.roberts@futures.com
- **Password**: FuturesTest2025!
- **Role**: Employee
- **Department**: Implementation
- **Job Title**: Professional Services Consultant
- **Manager**: Sarah Johnson

**Test Data Included:**
- 5 months of performance history with upward trend
- 3 completed weekly check-ins
- 1 upcoming weekly check-in
- 1 scheduled monthly one-to-one
- Performance ratings showing improvement over time

**What You Can Test:**
1. View "My Performance" dashboard with month-on-month tracking
2. See performance scores (competency + performance + overall)
3. View rating trends and categories
4. Access review history
5. View action items and training recommendations

### Implementation Manager
- **Email**: sarah.johnson@futures.com
- **Password**: FuturesTest2025!
- **Role**: Manager
- **Department**: Implementation
- **Job Title**: Implementation Manager
- **Reports**: Mike Roberts (and access to other team members)

**Test Data Included:**
- Team member (Mike Roberts) with complete performance data
- Scheduled reviews for team members
- Access to team performance overview

**What You Can Test:**
1. View "Team Performance Overview" dashboard
2. See individual team member ratings and trends
3. Compare team members' performance
4. View team statistics (avg rating, high performers, needs support)
5. Filter team by rating category
6. Schedule different review types
7. Conduct reviews (weekly check-ins vs monthly one-to-ones)
8. Approve expert-level competency ratings

## Existing Test Users

### Admin User
- **Email**: admin@futures.com
- **Password**: Admin123!
- **Role**: Admin
- **Access**: Full system configuration and reports

### Test Manager (Sales)
- **Email**: jane.smith@futures.com
- **Password**: Manager123!
- **Role**: Manager
- **Department**: Sales
- **Team**: Has existing team members

### Test Employee (Sales)
- **Email**: john.doe@futures.com
- **Password**: Employee123!
- **Role**: Employee
- **Department**: Sales
- **Manager**: Jane Smith

## Key Features to Test

### As Implementation Employee (mike.roberts@futures.com):
1. **Dashboard**
   - Click "My Performance" button
   - View current overall rating (should show upward trend)
   - See competency and performance scores separately
   - Review performance history table

2. **Performance Tracking**
   - Month-on-month comparison
   - Trend indicators (up/down arrows)
   - Rating category badges
   - Historical performance data

3. **Reviews**
   - Click "My Reviews" button
   - View upcoming and past reviews
   - See action items from reviews

### As Implementation Manager (sarah.johnson@futures.com):
1. **Dashboard**
   - Click "View Team Performance" button
   - See team statistics overview
   - View rating distribution chart

2. **Team Performance**
   - Filter team by rating category
   - Click "View History" for any team member
   - See individual performance trends
   - Identify high performers and those needing support

3. **Review Management**
   - Click "Schedule Reviews" button
   - Schedule different review types:
     - Weekly Check-in (KPIs only)
     - Monthly One-to-One (KPIs + Competencies)
     - Probation Review
     - Half-Year Review (available in 6th month)

4. **Conducting Reviews**
   - Start a weekly check-in (simplified, KPIs only)
   - Start a monthly one-to-one (full review with competencies)
   - View weekly KPI averages in monthly reviews
   - Complete reviews to generate performance ratings

## System Behavior

### Weekly Check-ins
- Only capture KPI performance scores
- No competency assessments
- Quick 15-minute check-ins
- Scores stored for monthly averaging

### Monthly One-to-Ones
- Show average of weekly KPI scores
- Include competency assessments
- Generate comprehensive performance ratings
- Trigger overall rating calculation

### Performance Rating Calculation
When a manager completes a monthly review:
1. System averages all competency ratings (1-4 scale)
2. System averages weekly KPI scores (1-5 scale)
3. Overall Rating = 60% Performance + 40% Competency
4. Rating Category assigned automatically:
   - Outstanding: 4.5+
   - Exceeds Expectations: 3.5-4.5
   - Meets Expectations: 3.0-3.5
   - Developing: 2.0-3.0
   - Needs Improvement: <2.0

### Half-Year Reviews
- Only available to schedule in 6th month
- Automatically collates previous 6 months of data
- Shows performance trends
- Displays average scores across period
- Identifies key achievements and development areas

## Testing Workflow

### Recommended Test Flow:
1. Login as Mike Roberts (employee)
2. Explore "My Performance" dashboard
3. Review performance history and trends
4. Logout and login as Sarah Johnson (manager)
5. Explore "Team Performance Overview"
6. View Mike's performance history
7. Go to "Schedule Reviews"
8. Create a new weekly check-in for Mike
9. Start and complete the weekly check-in
10. Create a monthly one-to-one for Mike
11. Start the monthly review and see weekly averages
12. Complete the review to generate new ratings
13. Return to Team Performance to see updated ratings

## Notes

- All test data is realistic with progressive improvement trends
- Performance scores show growth over time
- Test users are in Implementation department for focused testing
- Both manager and employee views are fully functional
- System automatically calculates and updates ratings
- Changes to Copilot Config (AI interventions) are in database but UI needs updating
