# Comprehensive Review & Performance Management System

## Overview
A complete performance management system with weekly check-ins, monthly reviews, 6-month performance reviews, AI validation, and executive pay review dashboards.

## Test Accounts
All test accounts are now working and can be used to test the system:

- **Admin**: admin@eposnow.com / Admin123!
- **Manager**: jane.smith@eposnow.com / Password123!
- **Employees**:
  - john.doe@eposnow.com / Password123!
  - mike.wilson@eposnow.com / Password123!

## Core Features Implemented

### 1. Review Scheduling & Bulk Operations
**Location**: `src/components/manager/ReviewScheduler.tsx`

**Features**:
- Bulk team member selection
- KPI template creation and management
- Apply standard KPIs to multiple team members at once
- Schedule weekly check-ins or monthly reviews in bulk
- Calendar integration ready (needs Google Calendar API)
- Automatic notifications to employees

**How to Use**:
1. Navigate to Reviews section as a manager
2. Select team members (individually or all at once)
3. Create or load KPI templates
4. Apply KPIs to selected team members
5. Choose review type (weekly/monthly) and start date
6. Schedule reviews - notifications sent automatically

### 2. Weekly Check-ins
**Location**: `src/components/manager/ComprehensiveReviewConductor.tsx`

**Features**:
- KPI tracking with achievement percentages
- Goal progress updates
- Weekly highlights, challenges, and support needed
- Manager comments and feedback
- Optional but feeds into monthly review averages

**Process**:
1. Manager/employee opens scheduled weekly check-in
2. Enter actual KPI values - achievement % calculated automatically
3. Update goal progress with sliders
4. Document highlights and challenges
5. Manager provides comments
6. Save draft or complete review

### 3. Monthly Reviews
**Location**: `src/components/manager/ComprehensiveReviewConductor.tsx`

**Features**:
- Monthly KPI results with visual progress bars
- Weekly average performance pulled automatically
- AI-generated summary of weekly check-ins
- Competency ratings (1-4 scale)
- Required comments for all ratings
- AI validation of comments before submission
- Automatic approval workflow for rating 4s
- CDP goals and learning actions integrated
- Overall performance and competency scores

**Rating System**:
- **1**: Below expectations - needs significant improvement
- **2**: Developing - working toward expectations
- **3**: Meets expectations - solid performance
- **4**: Exceeds expectations - consistently goes above and beyond (requires approval)

**Process**:
1. Manager opens monthly review
2. System shows weekly average if check-ins were completed
3. Enter monthly KPI results
4. Rate competencies with detailed comments
5. For rating 4: provide evidence and use AI validation
6. AI checks if comments are sufficient
7. If rating is 4, automatic approval request sent to head of dept
8. Complete and submit review

### 4. AI Validation
**Edge Function**: `validate-competency-rating`

**Validation Rules**:
- **Rating 4**:
  - Minimum 50 words in comments
  - Concrete evidence required
  - Must include specific examples
  - Must include quantifiable results
  - Triggers head of department approval

- **Rating 3**:
  - Minimum 20 words
  - Should justify the rating

- **Rating 1-2**:
  - Minimum 30 words
  - Must include improvement areas
  - Should provide development guidance

**AI Checks**:
- Word count validation
- Looks for specific examples/instances
- Checks for quantifiable results
- Identifies improvement language for low ratings
- Provides feedback if comments insufficient

### 5. Approval Workflow for Rating 4s
**Location**: `src/components/manager/RatingApprovalWorkflow.tsx`

**Features**:
- Heads of department receive notifications
- Review employee's rating with all evidence
- Three options:
  1. **Approve**: Rating stands, employee eligible for pay review
  2. **Moderate**: Adjust rating with explanation
  3. **Reject**: Send back to manager for more evidence
- All decisions notify manager and employee
- Audit trail maintained

**Process**:
1. Manager gives rating 4 with evidence
2. System automatically creates approval request
3. Head of dept receives notification
4. Reviews justification and evidence
5. Makes decision (approve/moderate/reject)
6. Notifications sent to all parties
7. If approved, included in pay review considerations

### 6. 6-Month Performance Reviews
**Location**: `src/components/manager/SixMonthPerformanceReview.tsx`

**Features**:
- Select employee and any 6 completed monthly reviews
- Automatic calculation of averages
- Trend analysis (improving/declining/stable)
- Manager assessment with:
  - Overall summary
  - Key strengths
  - Development areas
  - Recommended actions
- Recommendations for:
  - Pay review
  - Bonus
  - Promotion
- Required rationale for recommendations
- Automatic approval for 4+4 scores

**Process**:
1. Manager selects employee
2. Choose 6 monthly reviews (doesn't have to be consecutive)
3. System calculates averages and trend
4. Complete manager assessment
5. Check recommendations (pay/bonus/promotion)
6. Provide rationale if recommending
7. Submit for approval
8. If scores are 4+4, goes to head of dept
9. If approved, visible on executive dashboard

### 7. Executive Pay Review Dashboard
**Location**: `src/components/leadership/PayReviewDashboard.tsx`

**Features**:
- View all employees eligible for pay review/bonus
- Eligibility criteria:
  - Average performance ≥ 4.0 AND competency ≥ 4.0
  - OR manager recommended for pay review
  - OR manager recommended for bonus
- Filter by department
- Filter by recommendation type
- Detailed view of each employee's 6-month review
- See trend analysis and manager recommendations
- Approve employees for pay review process
- Export to CSV for compensation planning

**Dashboard Stats**:
- Total eligible employees
- Count by recommendation type
- Average scores across all eligible
- Department breakdown

## Database Schema

### New Tables
1. **review_kpi_templates** - Reusable KPI templates
2. **review_kpis** - Individual KPIs assigned to employees
3. **review_weekly_checkins** - Weekly check-in records
4. **review_monthly_sessions** - Monthly review sessions
5. **review_competency_ratings** - Detailed competency ratings
6. **review_six_month_performance** - 6-month reviews
7. **review_rating_approvals** - Approval workflow
8. **review_goal_progress** - Goal tracking in reviews
9. **review_notifications** - Notification system

### Key Functions
- `calculate_weekly_average_performance()` - Calculates weekly average for monthly review
- `get_head_of_department()` - Finds approver for rating 4s
- `get_employees_eligible_for_pay_review()` - Returns pay review eligible employees
- `trigger_rating_approval()` - Auto-creates approval requests

### Triggers
- **on_competency_rating_insert** - Automatically creates approval request when rating is 4

## Integration Points

### Career Development Plans (CDP)
- Goals from active CDPs automatically pulled into reviews
- Progress tracked in weekly and monthly reviews
- Outstanding learning modules shown as actions

### Learning Management
- Incomplete training modules appear as actions
- Progress tracked in reviews
- Completion impacts competency ratings

### Strategic Goals
- Department/company goals can be tracked
- Progress updated in reviews
- Aligned with individual performance

### Notification System
- Review scheduled
- Review completed
- Approval needed (rating 4)
- Rating approved/moderated/rejected
- 6-month review completed
- Approved for pay review

## User Flows

### Manager Flow
1. Use Review Scheduler to set up KPIs and schedule reviews
2. Conduct weekly check-ins (optional but recommended)
3. Conduct monthly reviews with competency assessments
4. Use AI validation to ensure sufficient evidence
5. Every 6 months, compile 6-month performance review
6. Submit 6-month review for approval if high ratings

### Head of Department Flow
1. Receive notifications for rating 4 approvals
2. Review evidence and justification
3. Approve, moderate, or reject
4. Review 6-month performance reviews
5. Approve for pay review process

### Executive/Leadership Flow
1. Access Pay Review Dashboard
2. View all eligible employees
3. Filter by department or recommendation type
4. Review detailed performance data
5. Approve for pay review process
6. Export data for compensation decisions

### Employee Flow
1. Receive notification when review scheduled
2. Participate in weekly check-ins
3. View monthly review results
4. Track competency progression
5. Receive notifications on rating decisions
6. View 6-month performance summary

## AI Features

### Weekly Summary Generation
- Analyzes all weekly check-ins for the month
- Generates summary of:
  - Key highlights
  - Common challenges
  - Support provided
  - Overall trend

### Competency Rating Validation
- Validates comment quality
- Ensures sufficient detail for ratings
- Prompts for more evidence when needed
- Prevents inadequate documentation

## Security & Permissions

### Row Level Security (RLS)
- All tables have RLS enabled
- Managers see only their team's reviews
- Employees see only their own reviews
- Leadership sees department-level data
- Admins have full access

### Audit Trail
- All rating decisions logged
- Approval history maintained
- Notification records kept
- Changes tracked with timestamps

## Best Practices

### For Managers
1. Use KPI templates for consistency
2. Conduct weekly check-ins - they make monthly reviews easier
3. Use AI validation before submitting rating 4s
4. Provide specific, quantifiable evidence
5. Complete 6-month reviews on time

### For Heads of Department
1. Review approval requests promptly
2. Ensure evidence supports rating 4s
3. Provide clear feedback if moderating
4. Maintain consistency across department

### For Executives
1. Review pay review dashboard regularly
2. Consider both scores and trends
3. Review manager recommendations carefully
4. Use data for compensation planning

## Future Enhancements

### Potential Additions
- Google Calendar integration for scheduling
- Email notifications (in addition to in-app)
- Performance improvement plans (PIPs)
- 360-degree feedback
- Self-assessment before reviews
- Peer feedback integration
- Goal setting wizard
- More advanced AI summaries
- Predictive analytics for attrition risk
- Skills gap analysis

## Troubleshooting

### Common Issues

**Issue**: Weekly average not showing in monthly review
**Solution**: Ensure weekly check-ins are marked as "completed" (not just "in_progress")

**Issue**: AI validation keeps rejecting comments
**Solution**: Ensure comments are:
- Specific with examples
- Include quantifiable results
- Meet minimum word count for rating

**Issue**: Approval request not created
**Solution**: Check that:
- Rating is exactly 4
- Competency rating has comments and evidence
- Head of department exists for the department

**Issue**: Employee not showing in pay review dashboard
**Solution**: Verify:
- 6-month review is submitted (not draft)
- Employee has both performance and competency ≥ 4.0 OR manager recommendation
- Review has been approved by head of dept

## Technical Notes

### Performance Optimization
- Indexes on foreign keys for fast joins
- Efficient RLS policies using auth.uid()
- JSONB for flexible data storage
- Calculated fields cached in tables

### Data Integrity
- Foreign key constraints
- Check constraints on ratings (1-4)
- Required fields enforced
- Audit timestamps on all records

## Support

For issues or questions:
1. Check this documentation
2. Review database migration files in `supabase/migrations/`
3. Check component code for implementation details
4. Test with provided test accounts
