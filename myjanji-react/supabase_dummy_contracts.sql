-- Dummy Contracts for Supabase
-- Run this in the Supabase SQL Editor to insert test data
-- Make sure the users table has USER-001 and USER-002 before running this

-- First, insert the test users if they don't exist
INSERT INTO users (user_id, name, email, phone, created_at)
VALUES 
  ('USER-001', 'SpongeBob SquarePants', 'spongebob@bikinibottom.sea', '+60 12-345 6789', NOW()),
  ('USER-002', 'Ultraman Taro', 'ultraman@m78.nebula', '+60 98-765 4321', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Insert dummy contracts with all relevant fields
INSERT INTO contracts (
  contract_id,
  created_user_id,
  acceptee_user_id,
  contract_name,
  contract_topic,
  status,
  template_type,
  created_at,
  due_date,
  creator_nfc_verified,
  creator_face_verified,
  acceptee_nfc_verified,
  acceptee_face_verified,
  form_data,
  pdf_url
) VALUES 
-- SpongeBob's contracts (USER-001 as creator)
(
  'CNT-001',
  'USER-001',
  'USER-002',
  'Rental Camera',
  'Photography Equipment',
  'Ongoing',
  'ITEM_BORROW',
  '2025-09-15T00:00:00Z',
  '2025-12-20T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-001.pdf'
),
(
  'CNT-002',
  'USER-001',
  'USER-002',
  'Renovation Deposit',
  'Home Improvement',
  'Breached',
  'SALE_DEPOSIT',
  '2025-08-01T00:00:00Z',
  '2025-12-31T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-002.pdf'
),
(
  'CNT-003',
  'USER-001',
  'USER-002',
  'Freelance Design',
  'Creative Services',
  'Completed',
  'FREELANCE_JOB',
  '2025-07-10T00:00:00Z',
  '2025-12-15T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-003.pdf'
),
(
  'CNT-004',
  'USER-001',
  'USER-002',
  'Equipment Loan',
  'Business Equipment',
  'Ongoing',
  'ITEM_BORROW',
  '2025-09-05T00:00:00Z',
  '2026-01-05T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-004.pdf'
),
(
  'CNT-005',
  'USER-001',
  'USER-002',
  'Service Agreement',
  'Professional Services',
  'Ongoing',
  'FREELANCE_JOB',
  '2025-10-01T00:00:00Z',
  '2025-12-25T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-005.pdf'
),
(
  'CNT-006',
  'USER-001',
  'USER-002',
  'Personal Loan',
  'Financial Loan',
  'Pending',
  'FRIENDLY_LOAN',
  '2025-10-05T00:00:00Z',
  '2025-12-30T00:00:00Z',
  true,
  true,
  false,
  false,
  '{"amount": 5000, "purpose": "Personal expenses", "date": "2025-12-30"}',
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-006.pdf'
),
-- Ultraman's contracts (USER-002 as creator)
(
  'CNT-101',
  'USER-002',
  'USER-001',
  'Wedding Photography',
  'Event Photography Services',
  'Ongoing',
  'FREELANCE_JOB',
  '2025-09-20T00:00:00Z',
  '2025-12-18T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-101.pdf'
),
(
  'CNT-102',
  'USER-002',
  'USER-001',
  'Car Rental Payment',
  'Vehicle Rental Agreement',
  'Ongoing',
  'VEHICLE_USE',
  '2025-09-10T00:00:00Z',
  '2026-01-10T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-102.pdf'
),
(
  'CNT-103',
  'USER-002',
  'USER-001',
  'House Rental Deposit',
  'Property Rental',
  'Pending',
  'SALE_DEPOSIT',
  '2025-10-08T00:00:00Z',
  '2026-01-08T00:00:00Z',
  true,
  true,
  false,
  false,
  '{"item": "House Rental", "deposit": 3000, "price": 1500}',
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-103.pdf'
),
(
  'CNT-104',
  'USER-002',
  'USER-001',
  'Interior Design Work',
  'Design Services',
  'Ongoing',
  'FREELANCE_JOB',
  '2025-08-15T00:00:00Z',
  '2025-12-28T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-104.pdf'
),
(
  'CNT-105',
  'USER-002',
  'USER-001',
  'Catering Service',
  'Event Catering',
  'Completed',
  'FREELANCE_JOB',
  '2025-06-20T00:00:00Z',
  '2025-12-10T00:00:00Z',
  true,
  true,
  true,
  true,
  NULL,
  'https://umldjcyvmtjtjyyhspif.supabase.co/storage/v1/object/public/contract_pdf/generated/CNT-105.pdf'
)
ON CONFLICT (contract_id) DO UPDATE SET
  contract_name = EXCLUDED.contract_name,
  contract_topic = EXCLUDED.contract_topic,
  status = EXCLUDED.status,
  pdf_url = EXCLUDED.pdf_url;

-- Verify the data was inserted
SELECT 
  contract_id, 
  contract_name, 
  contract_topic, 
  status, 
  created_user_id, 
  acceptee_user_id, 
  pdf_url 
FROM contracts 
ORDER BY contract_id;
