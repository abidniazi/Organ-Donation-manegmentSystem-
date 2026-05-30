

-- ─────────────────────────────────────────────
-- STEP 0: CLEANUP (Safe to re-run anytime)
-- ─────────────────────────────────────────────
BEGIN
  FOR t IN (SELECT table_name FROM user_tables
            WHERE table_name IN ('DONATION_AUDIT','DONOR_AUDIT','DONATIONS',
                                  'DONORS','RECIPIENTS','DOCTORS','HOSPITALS','ORGANS'))
  LOOP
    EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS';
  END LOOP;
  FOR s IN (SELECT sequence_name FROM user_sequences
            WHERE sequence_name IN ('SEQ_HOSPITALS','SEQ_DONORS',
                                    'SEQ_RECIPIENTS','SEQ_DOCTORS','SEQ_DONATIONS'))
  LOOP
    EXECUTE IMMEDIATE 'DROP SEQUENCE ' || s.sequence_name;
  END LOOP;
END;
/

-- ─────────────────────────────────────────────
-- STEP 1: CREATE TABLES
-- ─────────────────────────────────────────────

-- Table 1: HOSPITALS
CREATE TABLE HOSPITALS (
    hospital_id    NUMBER          CONSTRAINT pk_hospitals PRIMARY KEY,
    hospital_name  VARCHAR2(150)   CONSTRAINT nn_hosp_name  NOT NULL,
    city           VARCHAR2(80)    CONSTRAINT nn_hosp_city  NOT NULL,
    contact_no     VARCHAR2(15),
    email          VARCHAR2(100)   CONSTRAINT uq_hosp_email UNIQUE,
    established    NUMBER(4),
    CONSTRAINT chk_hosp_year CHECK (established BETWEEN 1800 AND 2100)
);

-- Table 2: DONORS
-- FIX: Removed CHECK (date_of_birth < SYSDATE) — Oracle does NOT allow
--      SYSDATE in CHECK constraints. DOB validation is handled in the
--      sp_register_donor procedure instead.
CREATE TABLE DONORS (
    donor_id          NUMBER        CONSTRAINT pk_donors PRIMARY KEY,
    full_name         VARCHAR2(100) CONSTRAINT nn_donor_name  NOT NULL,
    date_of_birth     DATE          CONSTRAINT nn_donor_dob   NOT NULL,
    blood_type        VARCHAR2(5)   CONSTRAINT nn_donor_blood NOT NULL,
    contact_no        VARCHAR2(15),
    email             VARCHAR2(100) CONSTRAINT uq_donor_email UNIQUE,
    hospital_id       NUMBER,
    registration_date DATE          DEFAULT SYSDATE,
    is_active         CHAR(1)       DEFAULT 'Y',
    CONSTRAINT fk_donor_hospital FOREIGN KEY (hospital_id) REFERENCES HOSPITALS(hospital_id) ON DELETE SET NULL,
    CONSTRAINT chk_donor_blood   CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    CONSTRAINT chk_donor_active  CHECK (is_active IN ('Y','N'))
);

-- Table 3: RECIPIENTS
CREATE TABLE RECIPIENTS (
    recipient_id   NUMBER        CONSTRAINT pk_recipients PRIMARY KEY,
    full_name      VARCHAR2(100) CONSTRAINT nn_recip_name  NOT NULL,
    date_of_birth  DATE          CONSTRAINT nn_recip_dob   NOT NULL,
    blood_type     VARCHAR2(5)   CONSTRAINT nn_recip_blood NOT NULL,
    organ_needed   VARCHAR2(50)  CONSTRAINT nn_recip_organ NOT NULL,
    urgency_level  VARCHAR2(10)  DEFAULT 'Medium',
    hospital_id    NUMBER,
    contact_no     VARCHAR2(15),
    email          VARCHAR2(100),
    CONSTRAINT fk_recip_hospital FOREIGN KEY (hospital_id) REFERENCES HOSPITALS(hospital_id) ON DELETE SET NULL,
    CONSTRAINT chk_recip_blood   CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    CONSTRAINT chk_recip_urgency CHECK (urgency_level IN ('Low','Medium','High','Critical')),
    CONSTRAINT chk_recip_organ   CHECK (organ_needed IN ('Kidney','Liver','Heart','Lung','Pancreas','Cornea','Bone Marrow'))
);

-- Table 4: DOCTORS
CREATE TABLE DOCTORS (
    doctor_id       NUMBER        CONSTRAINT pk_doctors PRIMARY KEY,
    full_name       VARCHAR2(100) CONSTRAINT nn_doc_name NOT NULL,
    specialization  VARCHAR2(100),
    hospital_id     NUMBER,
    contact_no      VARCHAR2(15),
    email           VARCHAR2(100) CONSTRAINT uq_doc_email    UNIQUE,
    license_no      VARCHAR2(30)  CONSTRAINT uq_doc_license  UNIQUE,
    CONSTRAINT fk_doc_hospital FOREIGN KEY (hospital_id) REFERENCES HOSPITALS(hospital_id) ON DELETE SET NULL
);

-- Table 5: DONATIONS
CREATE TABLE DONATIONS (
    donation_id    NUMBER        CONSTRAINT pk_donations PRIMARY KEY,
    donor_id       NUMBER        CONSTRAINT nn_don_donor NOT NULL,
    recipient_id   NUMBER        CONSTRAINT nn_don_recip NOT NULL,
    doctor_id      NUMBER        CONSTRAINT nn_don_doc   NOT NULL,
    hospital_id    NUMBER        CONSTRAINT nn_don_hosp  NOT NULL,
    organ_type     VARCHAR2(50)  CONSTRAINT nn_don_organ NOT NULL,
    donation_date  DATE          DEFAULT SYSDATE,
    status         VARCHAR2(20)  DEFAULT 'Pending',
    notes          VARCHAR2(300),
    CONSTRAINT fk_don_donor     FOREIGN KEY (donor_id)     REFERENCES DONORS(donor_id),
    CONSTRAINT fk_don_recipient FOREIGN KEY (recipient_id) REFERENCES RECIPIENTS(recipient_id),
    CONSTRAINT fk_don_doctor    FOREIGN KEY (doctor_id)    REFERENCES DOCTORS(doctor_id),
    CONSTRAINT fk_don_hospital  FOREIGN KEY (hospital_id)  REFERENCES HOSPITALS(hospital_id),
    CONSTRAINT chk_don_organ    CHECK (organ_type IN ('Kidney','Liver','Heart','Lung','Pancreas','Cornea','Bone Marrow')),
    CONSTRAINT chk_don_status   CHECK (status IN ('Pending','Approved','Completed','Rejected','Cancelled'))
);

-- Audit Tables (for Trigger Module)
CREATE TABLE DONATION_AUDIT (
    audit_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name   VARCHAR2(50)  DEFAULT 'DONATIONS',
    operation    VARCHAR2(10)  NOT NULL,
    donation_id  NUMBER,
    old_status   VARCHAR2(20),
    new_status   VARCHAR2(20),
    changed_by   VARCHAR2(50)  DEFAULT USER,
    changed_on   TIMESTAMP     DEFAULT SYSTIMESTAMP
);

CREATE TABLE DONOR_AUDIT (
    audit_id    NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    operation   VARCHAR2(10)  NOT NULL,
    donor_id    NUMBER,
    donor_name  VARCHAR2(100),
    action_by   VARCHAR2(50)  DEFAULT USER,
    action_on   TIMESTAMP     DEFAULT SYSTIMESTAMP
);

-- ─────────────────────────────────────────────
-- STEP 2: CREATE SEQUENCES
-- ─────────────────────────────────────────────
CREATE SEQUENCE SEQ_HOSPITALS  START WITH 1   INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_DONORS     START WITH 1   INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_RECIPIENTS START WITH 1   INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_DOCTORS    START WITH 1   INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_DONATIONS  START WITH 100 INCREMENT BY 1 NOCACHE NOCYCLE;

-- ─────────────────────────────────────────────
-- STEP 3: INSERT SAMPLE DATA
-- ─────────────────────────────────────────────

-- Hospitals
INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL, 'City Medical Center',           'Lahore',    '042-1234567', 'info@cmc.pk',   1985);
INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL, 'National Organ Institute',      'Karachi',   '021-9876543', 'noi@health.pk', 2001);
INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL, 'Shaukat Khanum Hospital',       'Lahore',    '042-3571666', 'sk@skmch.org',  1994);
INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL, 'Agha Khan University Hospital', 'Karachi',   '021-3493021', 'info@aku.edu',  1985);
INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL, 'Pakistan Institute of Med Sci', 'Islamabad', '051-9261170', 'pims@gov.pk',   1972);

-- Doctors
INSERT INTO DOCTORS VALUES (SEQ_DOCTORS.NEXTVAL, 'Dr. Ahsan Malik',  'Transplant Surgery',  1, '0300-1010101', 'ahsan@cmc.pk',  'PMC-2021-001');
INSERT INTO DOCTORS VALUES (SEQ_DOCTORS.NEXTVAL, 'Dr. Sana Qureshi', 'Nephrology',          2, '0311-2020202', 'sana@noi.pk',   'PMC-2019-045');
INSERT INTO DOCTORS VALUES (SEQ_DOCTORS.NEXTVAL, 'Dr. Bilal Ahmed',  'Cardiothoracic Surg', 3, '0322-3030303', 'bilal@sk.pk',   'PMC-2018-112');
INSERT INTO DOCTORS VALUES (SEQ_DOCTORS.NEXTVAL, 'Dr. Fatima Zahra', 'Hepatology',          4, '0333-4040404', 'fatima@aku.pk', 'PMC-2020-078');
INSERT INTO DOCTORS VALUES (SEQ_DOCTORS.NEXTVAL, 'Dr. Tariq Hassan', 'Pulmonology',         5, '0344-5050505', 'tariq@pims.pk', 'PMC-2017-033');

-- Donors
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Ali Raza',      DATE '1990-05-15', 'O+',  '0300-1111111', 'ali@email.com',   1, SYSDATE, 'Y');
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Sara Khan',     DATE '1985-08-22', 'A-',  '0311-2222222', 'sara@email.com',  2, SYSDATE, 'Y');
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Usman Ali',     DATE '1992-03-10', 'B+',  '0322-3333333', 'usman@mail.com',  3, SYSDATE, 'Y');
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Hina Baig',     DATE '1988-11-05', 'AB+', '0333-4444444', 'hina@mail.com',   4, SYSDATE, 'Y');
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Kamran Sheikh', DATE '1995-07-19', 'O-',  '0344-5555555', 'kamran@mail.com', 5, SYSDATE, 'Y');
INSERT INTO DONORS VALUES (SEQ_DONORS.NEXTVAL, 'Zara Hussain',  DATE '1993-02-28', 'A+',  '0355-6666666', 'zara@mail.com',   1, SYSDATE, 'Y');

-- Recipients
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Nadia Akhtar',   DATE '1978-04-20', 'O+',  'Kidney',  'High',     1, '0300-7777777', 'nadia@mail.com');
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Rashid Mehmood', DATE '1965-09-12', 'A-',  'Liver',   'Critical', 2, '0311-8888888', 'rashid@mail.com');
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Amina Tariq',    DATE '1982-12-30', 'B+',  'Heart',   'Critical', 3, '0322-9999999', 'amina@mail.com');
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Farhan Sadiq',   DATE '1990-06-15', 'AB+', 'Kidney',  'Medium',   4, '0333-0000000', 'farhan@mail.com');
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Bushra Malik',   DATE '1975-01-08', 'O-',  'Lung',    'High',     5, '0344-1111111', 'bushra@mail.com');
INSERT INTO RECIPIENTS VALUES (SEQ_RECIPIENTS.NEXTVAL, 'Imran Chaudhry', DATE '1988-03-25', 'A+',  'Cornea',  'Low',      1, '0355-2222222', 'imran@mail.com');

-- Donations
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 1, 1, 1, 1, 'Kidney', SYSDATE - 10, 'Completed', 'Successful transplant');
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 2, 2, 2, 2, 'Liver',  SYSDATE - 5,  'Approved',  'Surgery scheduled');
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 3, 3, 3, 3, 'Heart',  SYSDATE - 2,  'Pending',   'Awaiting final clearance');
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 4, 4, 4, 4, 'Kidney', SYSDATE - 8,  'Completed', 'Patient recovering well');
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 5, 5, 5, 5, 'Lung',   SYSDATE - 1,  'Pending',   'Blood tests in progress');
INSERT INTO DONATIONS VALUES (SEQ_DONATIONS.NEXTVAL, 6, 6, 1, 1, 'Cornea', SYSDATE,      'Approved',  'Pre-op checks done');

COMMIT;

-- ─────────────────────────────────────────────
-- STEP 4: CREATE VIEW
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_donation_dashboard AS
SELECT
    DN.donation_id,
    D.full_name          AS donor_name,
    D.blood_type         AS donor_blood,
    R.full_name          AS recipient_name,
    R.blood_type         AS recipient_blood,
    R.urgency_level,
    DN.organ_type,
    DN.donation_date,
    DN.status,
    H.hospital_name,
    H.city,
    DR.full_name         AS doctor_name,
    DR.specialization
FROM DONATIONS DN
JOIN DONORS     D  ON DN.donor_id     = D.donor_id
JOIN RECIPIENTS R  ON DN.recipient_id = R.recipient_id
JOIN HOSPITALS  H  ON DN.hospital_id  = H.hospital_id
JOIN DOCTORS    DR ON DN.doctor_id    = DR.doctor_id;

-- ─────────────────────────────────────────────
-- STEP 5: STORED PROCEDURES
-- ─────────────────────────────────────────────

-- Procedure 1: Register a new donor
-- FIX: DOB < SYSDATE validation moved here from the (invalid) CHECK constraint
CREATE OR REPLACE PROCEDURE sp_register_donor (
    p_name        IN VARCHAR2,
    p_dob         IN DATE,
    p_blood_type  IN VARCHAR2,
    p_contact     IN VARCHAR2,
    p_email       IN VARCHAR2,
    p_hospital_id IN NUMBER
) AS
BEGIN
    -- Validate date of birth is in the past
    IF p_dob >= SYSDATE THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: Date of birth must be in the past.');
        RETURN;
    END IF;

    INSERT INTO DONORS (donor_id, full_name, date_of_birth, blood_type,
                        contact_no, email, hospital_id, registration_date, is_active)
    VALUES (SEQ_DONORS.NEXTVAL, p_name, p_dob, p_blood_type,
            p_contact, p_email, p_hospital_id, SYSDATE, 'Y');
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('SUCCESS: Donor registered – ' || p_name);
EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: Email already registered – ' || p_email);
        ROLLBACK;
    WHEN VALUE_ERROR THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: Invalid blood type or data format.');
        ROLLBACK;
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);
        ROLLBACK;
END sp_register_donor;
/

-- Procedure 2: Update donation status
CREATE OR REPLACE PROCEDURE sp_update_donation_status (
    p_donation_id IN NUMBER,
    p_new_status  IN VARCHAR2
) AS
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM DONATIONS WHERE donation_id = p_donation_id;
    IF v_count = 0 THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: Donation ID not found – ' || p_donation_id);
        RETURN;
    END IF;
    UPDATE DONATIONS SET status = p_new_status WHERE donation_id = p_donation_id;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('SUCCESS: Status updated to ' || p_new_status);
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('ERROR: ' || SQLERRM);
        ROLLBACK;
END sp_update_donation_status;
/

-- ─────────────────────────────────────────────
-- STEP 6: FUNCTIONS
-- ─────────────────────────────────────────────

-- Function 1: Calculate donor age in years
CREATE OR REPLACE FUNCTION fn_donor_age (p_dob IN DATE)
RETURN NUMBER IS
BEGIN
    RETURN TRUNC(MONTHS_BETWEEN(SYSDATE, p_dob) / 12);
END fn_donor_age;
/

-- Function 2: Check if a donor is eligible for donation
CREATE OR REPLACE FUNCTION fn_check_eligibility (p_donor_id IN NUMBER)
RETURN VARCHAR2 IS
    v_count  NUMBER;
    v_active CHAR(1);
BEGIN
    SELECT is_active INTO v_active FROM DONORS WHERE donor_id = p_donor_id;
    IF v_active = 'N' THEN
        RETURN 'NOT ELIGIBLE – Donor marked inactive';
    END IF;
    SELECT COUNT(*) INTO v_count FROM DONATIONS
    WHERE donor_id = p_donor_id AND status IN ('Pending','Approved');
    IF v_count > 0 THEN
        RETURN 'NOT ELIGIBLE – Has active donation in progress';
    ELSE
        RETURN 'ELIGIBLE – Available for donation';
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 'NOT ELIGIBLE – Donor not found';
END fn_check_eligibility;
/

-- ─────────────────────────────────────────────
-- STEP 7: TRIGGERS
-- ─────────────────────────────────────────────

-- Trigger 1: Audit all INSERT / UPDATE / DELETE on DONATIONS 
CREATE OR REPLACE TRIGGER trg_donation_audit
AFTER INSERT OR UPDATE OR DELETE ON DONATIONS
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        INSERT INTO DONATION_AUDIT (operation, donation_id, new_status)
        VALUES ('INSERT', :NEW.donation_id, :NEW.status);
    ELSIF UPDATING THEN
        INSERT INTO DONATION_AUDIT (operation, donation_id, old_status, new_status)
        VALUES ('UPDATE', :NEW.donation_id, :OLD.status, :NEW.status);
    ELSIF DELETING THEN
        INSERT INTO DONATION_AUDIT (operation, donation_id, old_status)
        VALUES ('DELETE', :OLD.donation_id, :OLD.status);
    END IF;
END trg_donation_audit;
/

-- Trigger 2: Audit INSERT / DELETE on DONORS
CREATE OR REPLACE TRIGGER trg_donor_audit
AFTER INSERT OR DELETE ON DONORS
FOR EACH ROW
BEGIN
    IF INSERTING THEN
        INSERT INTO DONOR_AUDIT (operation, donor_id, donor_name)
        VALUES ('INSERT', :NEW.donor_id, :NEW.full_name);
    ELSIF DELETING THEN
        INSERT INTO DONOR_AUDIT (operation, donor_id, donor_name)
        VALUES ('DELETE', :OLD.donor_id, :OLD.full_name);
    END IF;
END trg_donor_audit;
/

-- ─────────────────────────────────────────────
-- STEP 8: 10 REQUIRED SQL QUERIES
-- ─────────────────────────────────────────────

-- Q1: View all donations with donor, recipient, hospital, doctor (using VIEW)
SELECT * FROM vw_donation_dashboard ORDER BY donation_date DESC;

-- Q2: Count donations per organ type (GROUP BY)
SELECT organ_type, COUNT(*) AS total_donations
FROM DONATIONS
GROUP BY organ_type
ORDER BY total_donations DESC;

-- Q3: Donor eligibility check (using Function)
SELECT donor_id, full_name, blood_type,
       fn_check_eligibility(donor_id) AS eligibility_status
FROM DONORS;

-- Q4: Donor age calculation (using Function)
SELECT full_name, blood_type,
       fn_donor_age(date_of_birth) AS age_years
FROM DONORS
ORDER BY age_years;

-- Q5: Recipients with Critical urgency and their hospital (JOIN)
SELECT R.full_name, R.organ_needed, R.urgency_level,
       H.hospital_name, H.city
FROM RECIPIENTS R
JOIN HOSPITALS H ON R.hospital_id = H.hospital_id
WHERE R.urgency_level = 'Critical';

-- Q6: Completed donations report (Multi-table JOIN)
SELECT D.full_name   AS donor,
       R.full_name   AS recipient,
       DN.organ_type,
       DN.donation_date,
       DR.full_name  AS doctor
FROM DONATIONS DN
JOIN DONORS     D  ON DN.donor_id     = D.donor_id
JOIN RECIPIENTS R  ON DN.recipient_id = R.recipient_id
JOIN DOCTORS    DR ON DN.doctor_id    = DR.doctor_id
WHERE DN.status = 'Completed';

-- Q7: Hospitals with total donation count (LEFT JOIN + GROUP BY)
SELECT H.hospital_name, H.city,
       COUNT(DN.donation_id) AS total_donations
FROM HOSPITALS H
LEFT JOIN DONATIONS DN ON H.hospital_id = DN.hospital_id
GROUP BY H.hospital_name, H.city
ORDER BY total_donations DESC;

-- Q8: Donors whose blood type matches a Critical recipient (Subquery)
SELECT full_name, blood_type
FROM DONORS
WHERE blood_type IN (
    SELECT blood_type FROM RECIPIENTS WHERE urgency_level = 'Critical'
)
AND is_active = 'Y';

-- Q9: Audit log – Last 10 donation changes
SELECT audit_id, operation, donation_id,
       old_status, new_status, changed_by, changed_on
FROM DONATION_AUDIT
ORDER BY changed_on DESC
FETCH FIRST 10 ROWS ONLY;

-- Q10: Pending donations older than 3 days
SELECT DN.donation_id,
       D.full_name   AS donor,
       R.full_name   AS recipient,
       DN.organ_type,
       TRUNC(SYSDATE - DN.donation_date) AS days_pending
FROM DONATIONS DN
JOIN DONORS     D ON DN.donor_id     = D.donor_id
JOIN RECIPIENTS R ON DN.recipient_id = R.recipient_id
WHERE DN.status   = 'Pending'
  AND DN.donation_date < SYSDATE - 3
ORDER BY days_pending DESC;

-- ─────────────────────────────────────────────
-- STEP 9: TEST PROCEDURES AND FUNCTIONS
-- ─────────────────────────────────────────────
SET SERVEROUTPUT ON;

-- Test 1: Register a new donor (valid data)
EXEC sp_register_donor('Test Donor', DATE '1995-06-15', 'O+', '0300-9999999', 'test@odms.pk', 1);

-- Test 2: Register a donor with a future DOB (should show error)
EXEC sp_register_donor('Bad Donor', DATE '2030-01-01', 'A+', '0300-0000001', 'bad@odms.pk', 1);

-- Test 3: Update donation status (donation_id 103 = 4th record since SEQ starts at 100)
EXEC sp_update_donation_status(103, 'Completed');

-- Test 4: Update with non-existent ID (should show error)
EXEC sp_update_donation_status(999, 'Approved');

-- Test 5: Check eligibility for donor 1 (has completed donation – should be ELIGIBLE)
SELECT fn_check_eligibility(1) AS eligibility FROM DUAL;

-- Test 6: Check eligibility for donor 3 (has Pending donation – should be NOT ELIGIBLE)
SELECT fn_check_eligibility(3) AS eligibility FROM DUAL;

-- Test 7: Age calculation
SELECT fn_donor_age(DATE '1990-05-15') AS age_years FROM DUAL;

-- ─────────────────────────────────────────────
-- STEP 10: VERIFY ALL OBJECTS CREATED
-- ─────────────────────────────────────────────

-- Check all tables
SELECT table_name FROM user_tables
WHERE table_name IN ('HOSPITALS','DONORS','RECIPIENTS','DOCTORS',
                     'DONATIONS','DONATION_AUDIT','DONOR_AUDIT')
ORDER BY table_name;

-- Check all sequences
SELECT sequence_name FROM user_sequences
WHERE sequence_name IN ('SEQ_HOSPITALS','SEQ_DONORS','SEQ_RECIPIENTS',
                        'SEQ_DOCTORS','SEQ_DONATIONS')
ORDER BY sequence_name;

-- Check all procedures and functions (should show VALID)
SELECT object_name, object_type, status
FROM user_objects
WHERE object_type IN ('PROCEDURE','FUNCTION','TRIGGER','VIEW')
ORDER BY object_type, object_name;

-- ─────────────────────────────────────────────
