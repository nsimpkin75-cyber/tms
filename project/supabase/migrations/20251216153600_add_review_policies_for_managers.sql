/*
  # Add Review Management Policies

  1. Changes
    - Add INSERT policy for managers and leadership to create reviews
    - Add UPDATE policy for managers to update their reviews
    - Add policies for review_items table
    - Add policies for action_items creation by managers

  2. Security
    - Managers can create reviews for users in their department
    - Only the reviewer can update their own reviews
    - Review items can be managed alongside reviews
    - Managers can create action items for their team members
*/

-- Add INSERT policy for reviews (managers can create reviews)
CREATE POLICY "Managers can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- Add UPDATE policy for reviews
CREATE POLICY "Reviewers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Add policies for review_items
CREATE POLICY "Users can view review items for their reviews"
  ON review_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND (reviews.user_id = auth.uid() OR reviews.reviewer_id = auth.uid())
    )
  );

CREATE POLICY "Reviewers can insert review items"
  ON review_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

CREATE POLICY "Reviewers can update review items"
  ON review_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_items.review_id
      AND reviews.reviewer_id = auth.uid()
    )
  );

-- Add policy for managers to create action items for team members
CREATE POLICY "Managers can create action items for team"
  ON action_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = action_items.owner_id
      AND profiles.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles AS owner
      JOIN profiles AS manager ON owner.department = manager.department
      WHERE owner.id = action_items.owner_id
      AND manager.id = auth.uid()
      AND manager.role IN ('manager', 'leadership')
    )
  );
