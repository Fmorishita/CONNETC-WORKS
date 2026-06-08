-- ============================================================================
-- ConnectWorks Operations Hub — SAMPLE DATA (for testing)
-- Run in Supabase → SQL Editor AFTER ops_schema.sql. Safe & re-runnable.
-- Uses the ops_ prefixed tables (isolated from any other app's tables).
-- Inserts: base address · 3 leads · 5 visits TODAY · 1 quote (+items) ·
--          1 follow-up · 1 project (+materials). All marked 'SAMPLE'.
-- To REMOVE later: run the "CLEANUP" block at the bottom.
-- ============================================================================

-- ---- clean any previous sample rows first (makes this re-runnable) ----
delete from public.ops_project_materials where notes='SAMPLE';
delete from public.ops_projects where notes='SAMPLE';
delete from public.ops_follow_ups where notes='SAMPLE';
delete from public.ops_quote_line_items where quote_id in (select id from public.ops_quotes where quote_number like 'Q-SAMPLE-%');
delete from public.ops_quotes where quote_number like 'Q-SAMPLE-%';
delete from public.ops_visits where internal_notes='SAMPLE';
delete from public.leads where notes='SAMPLE';

-- ---- 1) Base address (route start/end) ----
update public.ops_settings
  set base_address='3911 Camino del Rio S', base_city='San Diego', base_state='CA', base_zip_code='92108'
  where id=1;

-- ---- 2) Leads ----
insert into public.leads (name,business,phone,email,business_type,service,project_type,timeline,budget,source,status,address,city,state,zip_code,message,notes) values
('Marcus Lee','Bay City Brewing Co','619-555-0142','marcus@baycitybrew.test','Restaurant / Coffee Shop','Video Surveillance','New Installation','As soon as possible','$5,000–$10,000','Website','New','3760 Hancock St','San Diego','CA','92110','Need cameras for taproom and back of house.','SAMPLE'),
('Sara Nguyen','Liberty Public Market','619-555-0188','sara@libertymarket.test','Retail Store','Structured Cabling','New Buildout / Remodel','This month','$3,000–$5,000','Referral','Contacted','2820 Historic Decatur Rd','San Diego','CA','92106','New vendor stalls need network drops.','SAMPLE'),
('Diego Ramirez','Kearny Mesa Auto Care','858-555-0173','diego@kmautocare.test','Auto Shop','Access Control','Upgrade Existing System','1–3 months','$1,000–$3,000','Yelp','Site Visit Scheduled','7150 Convoy Ct','San Diego','CA','92111','Want keypad entry for service bays.','SAMPLE');

-- ---- 3) Visits scheduled for TODAY (spread across the county to test optimization) ----
insert into public.ops_visits
  (client_name,business_name,phone,email,address,city,state,zip_code,visit_type,service_needed,scheduled_date,start_time,estimated_duration,fixed_time,priority,status,notes,internal_notes) values
('Marcus Lee','Bay City Brewing Co','619-555-0142','marcus@baycitybrew.test','3760 Hancock St','San Diego','CA','92110','Site Assessment','Video Surveillance',current_date,'08:30',60,false,'High','Scheduled','Walk taproom + back of house.','SAMPLE'),
('Sara Nguyen','Liberty Public Market','619-555-0188','sara@libertymarket.test','2820 Historic Decatur Rd','San Diego','CA','92106','Installation','Structured Cabling',current_date,'10:00',90,false,'Medium','Scheduled','Run drops to 6 stalls.','SAMPLE'),
('Front Desk','Downtown Office Tower','619-555-0200','ops@dtoffice.test','600 B St','San Diego','CA','92101','Site Assessment','Network & Wireless',current_date,'12:30',45,false,'Medium','Scheduled','Suite 1500 Wi-Fi survey.','SAMPLE'),
('Boutique Mgr','La Jolla Retail','858-555-0150','mgr@ljretail.test','7855 Girard Ave','La Jolla','CA','92037','Follow-up Visit','Commercial Audio & Video',current_date,'14:00',60,false,'Low','Scheduled','Check display zones.','SAMPLE'),
('Diego Ramirez','Kearny Mesa Auto Care','858-555-0173','diego@kmautocare.test','7150 Convoy Ct','San Diego','CA','92111','Emergency Service','Access Control',current_date,'15:30',60,true,'High','Scheduled','Keypad down — fixed time, customer waiting.','SAMPLE');

-- ---- 4) Quote with line items ----
insert into public.ops_quotes
  (quote_number,client_name,business_name,client_email,client_phone,project_address,quote_title,quote_description,service_category,
   subtotal,discount,tax,total,deposit_required,estimated_start_date,estimated_duration,valid_until,status,warranty_text,terms_text)
values
('Q-SAMPLE-001','Marcus Lee','Bay City Brewing Co','marcus@baycitybrew.test','619-555-0142','3760 Hancock St, San Diego, CA 92110',
 'Commercial Security Camera Installation','SAMPLE','Video Surveillance',4160,0,0,4160,2080,current_date+5,'3–4 days',current_date+15,'Draft',
 'ConnectWorks provides a 1-year warranty on labor/installation and a 1-year warranty on equipment, subject to manufacturer terms and normal usage conditions.',
 'This quote is valid for 15 days. Final pricing may vary if site conditions, cable paths, equipment requirements or project scope change after approval.');

insert into public.ops_quote_line_items (quote_id,item_name,description,quantity,unit,unit_price,total,sort_order)
select q.id, v.item_name, v.description, v.quantity, v.unit, v.unit_price, v.total, v.sort_order
from public.ops_quotes q
cross join (values
  ('Dome Camera 4MP','Vandal-proof IP dome, night vision',8,'Each',145,1160,0),
  ('16-Channel NVR','4TB storage, remote mobile access',1,'Each',850,850,1),
  ('Installation & cabling','Mounting, Cat6 runs, terminations, cleanup',1,'Lot',1800,1800,2),
  ('Configuration & remote setup','Mobile app, users, on-site training',1,'Job',350,350,3)
) as v(item_name,description,quantity,unit,unit_price,total,sort_order)
where q.quote_number='Q-SAMPLE-001';

-- ---- 5) Follow-up tied to the quote ----
insert into public.ops_follow_ups (quote_id,client_name,business_name,follow_up_date,follow_up_type,status,suggested_message,notes)
select id,client_name,business_name,current_date+3,'First Follow-up','Pending',
 'Hi Marcus, just following up on the camera system quote for Bay City Brewing. Happy to answer questions or adjust anything. — ConnectWorks','SAMPLE'
from public.ops_quotes where quote_number='Q-SAMPLE-001';

-- ---- 6) Project + materials ----
insert into public.ops_projects (client_name,business_name,project_address,service_category,project_scope,start_date,estimated_completion_date,assigned_team,status,materials_status,notes)
values ('Marcus Lee','Bay City Brewing Co','3760 Hancock St, San Diego, CA 92110','Video Surveillance','8-camera IP system + 16ch NVR install',current_date+5,current_date+9,'Omar','Scheduled','Partial','SAMPLE');

insert into public.ops_project_materials (project_id,item_name,quantity,supplier,status,notes)
select p.id, v.item, v.qty, v.sup, v.st, 'SAMPLE'
from public.ops_projects p
cross join (values
  ('Dome Camera 4MP',8,'Anixter','Ordered'),
  ('NVR 16ch 4TB',1,'Anixter','Needed'),
  ('Cat6 box (1000ft)',2,'Graybar','Received')
) as v(item,qty,sup,st)
where p.notes='SAMPLE' and p.business_name='Bay City Brewing Co';

-- ============================================================================
-- CLEANUP — run ONLY this block to remove all sample data:
-- ----------------------------------------------------------------------------
-- delete from public.ops_project_materials where notes='SAMPLE';
-- delete from public.ops_projects where notes='SAMPLE';
-- delete from public.ops_follow_ups where notes='SAMPLE';
-- delete from public.ops_quote_line_items where quote_id in (select id from public.ops_quotes where quote_number like 'Q-SAMPLE-%');
-- delete from public.ops_quotes where quote_number like 'Q-SAMPLE-%';
-- delete from public.ops_visits where internal_notes='SAMPLE';
-- delete from public.leads where notes='SAMPLE';
-- ============================================================================
