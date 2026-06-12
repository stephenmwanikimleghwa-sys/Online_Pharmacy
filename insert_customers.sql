-- Insert legacy customers from transcount.sql into users table
-- Run via: supabase db query --linked --file insert_customers.sql

INSERT INTO users (
  username, password, first_name, last_name, email,
  is_staff, is_active, is_superuser, date_joined, role,
  is_verified, created_at, updated_at, must_change_password,
  credit_balance, is_credit_customer,
  can_delete_records, can_edit_prices, can_manage_inventory,
  can_manage_users, can_process_sales, can_view_audit_logs,
  can_view_reports, can_view_financials,
  permission_flags, phone_number, address
) VALUES
  ('pharmweb','!','PHARMWEB','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0720003788','N/A KITALE'),
  ('transcounty-pharmacy-annex','!','TRANSCOUNTY PHARMACY ANNEX','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0720246981','N/A KITALE'),
  ('chebukati','!','CHEBUKATI','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0788663052','N/A BAKITA'),
  ('clare','!','CLARE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0717129161','N/A KEIYO'),
  ('kibore','!','KIBORE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0754307804','N/A KITALALE'),
  ('betty','!','BETTY','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0711177942','N/A KACHIBORA'),
  ('ngare','!','NGARE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0718164260','N/A OPP PCEA'),
  ('rahab','!','RAHAB','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0758987006','N/A KEIYO'),
  ('favour-medical-clinic','!','FAVOUR MEDICAL CLINIC','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0726147066','N/A BODE'),
  ('tuwani-highway-clinic','!','TUWANI HIGHWAY CLINIC','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0711116776','N/A TUWANI'),
  ('alka-medical-clinic','!','ALKA MEDICAL CLINIC','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0757355148','N/A KITALE'),
  ('david-k-njue','!','DAVID K NJUE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0757542320','- -'),
  ('kinyua','!','KINYUA','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0757542320','- -'),
  ('tosha-pharmacy','!','TOSHA PHARMACY','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0725-621-030','LAINI MOJA'),
  ('primacare','!','PRIMACARE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0796413786','KITALE'),
  ('david-marambachi','!','DAVID MARAMBACHI','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0711329476','KITALALE'),
  ('sifuna','!','SIFUNA','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0718066248','KITALE'),
  ('madoh-medical-clinic','!','MADOH MEDICAL CLINIC','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0756917447','KESOGON'),
  ('hututu-clinic','!','HUTUTU CLINIC','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0707337684','HUTUTU MTONI'),
  ('yuya-clinic-dorothy','!','YUYA CLINIC-DOROTHY','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0708559265','YUYA'),
  ('dr-alex','!','DR.ALEX','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0705725922','MAILI MBILI'),
  ('kaibei-health-centre','!','KAIBEI HEALTH CENTRE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0746976614','ENDEBESS'),
  ('gynokit','!','GYNOKIT','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','-','-'),
  ('brian','!','BRIAN','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0725367951','-'),
  ('chepchoina-health-centre','!','CHEPCHOINA HEALTH CENTRE','','',false,true,false,CURRENT_TIMESTAMP,'customer',false,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,false,0.00,true,false,false,false,false,false,false,false,false,'{}','0721442520','CHEPCHOINA')
ON CONFLICT (username) DO NOTHING;

-- Verify count
SELECT COUNT(*) AS total_customers FROM users WHERE role = 'customer';
