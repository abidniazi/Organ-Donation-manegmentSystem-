const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // serves your HTML file

// ── DB CONFIG ─────────────────────────────────────
const DB_CONFIG = {
  user:          'system',   // e.g. SYSTEM or your schema name
  password:      '1234',
  connectString: 'localhost/orclpdb'     // or 'localhost:1521/XEPDB1'
};

// ── HELPER ────────────────────────────────────────
async function query(sql, binds = [], opts = {}) {
  let conn;
  try {
    conn = await oracledb.getConnection(DB_CONFIG);
    opts.outFormat = oracledb.OUT_FORMAT_OBJECT;
    const result = await conn.execute(sql, binds, opts);
    return result;
  } finally {
    if (conn) await conn.close();
  }
}

// ══════════════════════════════════════════════════
// HOSPITALS
// ══════════════════════════════════════════════════
app.get('/api/hospitals', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM HOSPITALS ORDER BY hospital_id`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hospitals', async (req, res) => {
  const { hospital_name, city, contact_no, email, established } = req.body;
  try {
    await query(
      `INSERT INTO HOSPITALS VALUES (SEQ_HOSPITALS.NEXTVAL,:1,:2,:3,:4,:5)`,
      [hospital_name, city, contact_no || null, email || null, established || null],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/hospitals/:id', async (req, res) => {
  try {
    await query(`DELETE FROM HOSPITALS WHERE hospital_id=:1`,
      [req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// DONORS
// ══════════════════════════════════════════════════
app.get('/api/donors', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM DONORS ORDER BY donor_id`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/donors', async (req, res) => {
  const { full_name, date_of_birth, blood_type, contact_no, email, hospital_id } = req.body;
  try {
    // Calls your stored procedure
    const conn = await oracledb.getConnection(DB_CONFIG);
    await conn.execute(
      `BEGIN sp_register_donor(:1,:2,:3,:4,:5,:6); END;`,
      [full_name, new Date(date_of_birth), blood_type,
       contact_no || null, email, hospital_id || null],
      { autoCommit: true }
    );
    await conn.close();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/donors/:id', async (req, res) => {
  try {
    await query(`DELETE FROM DONORS WHERE donor_id=:1`,
      [req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// RECIPIENTS
// ══════════════════════════════════════════════════
app.get('/api/recipients', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM RECIPIENTS ORDER BY recipient_id`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/recipients', async (req, res) => {
  const { full_name, date_of_birth, blood_type, organ_needed,
          urgency_level, hospital_id, contact_no } = req.body;
  try {
    await query(
      `INSERT INTO RECIPIENTS VALUES
       (SEQ_RECIPIENTS.NEXTVAL,:1,:2,:3,:4,:5,:6,:7,NULL)`,
      [full_name, new Date(date_of_birth), blood_type, organ_needed,
       urgency_level || 'Medium', hospital_id || null, contact_no || null],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/recipients/:id', async (req, res) => {
  try {
    await query(`DELETE FROM RECIPIENTS WHERE recipient_id=:1`,
      [req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// DOCTORS
// ══════════════════════════════════════════════════
app.get('/api/doctors', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM DOCTORS ORDER BY doctor_id`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/doctors', async (req, res) => {
  const { full_name, specialization, hospital_id, contact_no, license_no } = req.body;
  try {
    await query(
      `INSERT INTO DOCTORS VALUES
       (SEQ_DOCTORS.NEXTVAL,:1,:2,:3,:4,NULL,:5)`,
      [full_name, specialization || null, hospital_id || null,
       contact_no || null, license_no],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    await query(`DELETE FROM DOCTORS WHERE doctor_id=:1`,
      [req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// DONATIONS
// ══════════════════════════════════════════════════
app.get('/api/donations', async (req, res) => {
  try {
    const r = await query(`SELECT * FROM vw_donation_dashboard ORDER BY donation_date DESC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/donations', async (req, res) => {
  const { donor_id, recipient_id, doctor_id, hospital_id,
          organ_type, donation_date, notes } = req.body;
  try {
    await query(
      `INSERT INTO DONATIONS VALUES
       (SEQ_DONATIONS.NEXTVAL,:1,:2,:3,:4,:5,:6,'Pending',:7)`,
      [donor_id, recipient_id, doctor_id, hospital_id, organ_type,
       donation_date ? new Date(donation_date) : new Date(), notes || null],
      { autoCommit: true }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/donations/:id', async (req, res) => {
  const { status, notes } = req.body;
  try {
    // Calls your stored procedure
    const conn = await oracledb.getConnection(DB_CONFIG);
    await conn.execute(
      `BEGIN sp_update_donation_status(:1,:2); END;`,
      [parseInt(req.params.id), status],
      { autoCommit: true }
    );
    if (notes !== undefined) {
      await conn.execute(
        `UPDATE DONATIONS SET notes=:1 WHERE donation_id=:2`,
        [notes, parseInt(req.params.id)], { autoCommit: true }
      );
    }
    await conn.close();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/donations/:id', async (req, res) => {
  try {
    await query(`DELETE FROM DONATIONS WHERE donation_id=:1`,
      [req.params.id], { autoCommit: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// AUDIT LOGS
// ══════════════════════════════════════════════════
app.get('/api/audit', async (req, res) => {
  try {
    const dn = await query(
      `SELECT 'DONATIONS' AS tbl, operation, donation_id AS rec_id,
              old_status, new_status, changed_by, changed_on
       FROM DONATION_AUDIT ORDER BY changed_on DESC FETCH FIRST 30 ROWS ONLY`
    );
    const dr = await query(
      `SELECT 'DONORS' AS tbl, operation, donor_id AS rec_id,
              donor_name, NULL AS new_status, action_by, action_on AS changed_on
       FROM DONOR_AUDIT ORDER BY action_on DESC FETCH FIRST 20 ROWS ONLY`
    );
    res.json([...dn.rows, ...dr.rows]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// FUNCTIONS (called as SQL queries)
// ══════════════════════════════════════════════════
app.get('/api/eligibility/:id', async (req, res) => {
  try {
    const r = await query(
      `SELECT fn_check_eligibility(:1) AS result FROM DUAL`,
      [parseInt(req.params.id)]
    );
    res.json({ result: r.rows[0].RESULT });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════
app.listen(3000, () => console.log('ODMS Backend running → http://localhost:3000'));