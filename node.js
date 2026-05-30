const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak, VerticalAlign, Header, Footer, PageNumber
} = require('docx');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────
const bdr  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const bdrs = { top: bdr, bottom: bdr, left: bdr, right: bdr };
const hbdr = { style: BorderStyle.SINGLE, size: 1, color: "1F4E79" };
const hbdrs= { top: hbdr, bottom: hbdr, left: hbdr, right: hbdr };
const nbdr = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const nbdrs= { top: nbdr, bottom: nbdr, left: nbdr, right: nbdr };

const sp = (b=0,a=0) => ({ spacing: { before: b, after: a } });

const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, ...sp(400,120),
  children: [new TextRun({ text: t, bold:true, size:34, color:"1F4E79", font:"Arial" })] });

const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, ...sp(280,80),
  children: [new TextRun({ text: t, bold:true, size:26, color:"2E75B6", font:"Arial" })] });

const h3 = (t) => new Paragraph({ ...sp(180,60),
  children: [new TextRun({ text: t, bold:true, size:22, color:"404040", font:"Arial" })] });

const p = (t, extra={}) => new Paragraph({ ...sp(60,60),
  children: [new TextRun({ text:t, size:22, font:"Arial", ...extra })] });

const note = (t) => new Paragraph({ ...sp(80,80),
  shading: { fill:"FFF9C4", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 8, color:"F0A500" } },
  indent: { left: 200 },
  children: [new TextRun({ text: "\u26A0  "+t, size:20, font:"Arial", italics:true, color:"7B5800" })] });

const tip = (t) => new Paragraph({ ...sp(80,80),
  shading: { fill:"E8F5E9", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 8, color:"2E7D32" } },
  indent: { left: 200 },
  children: [new TextRun({ text: "\u2705  "+t, size:20, font:"Arial", italics:true, color:"1B5E20" })] });

const bl = (t, bold=false) => new Paragraph({
  numbering: { reference:"bullets", level:0 }, ...sp(40,40),
  children: [new TextRun({ text:t, size:22, font:"Arial", bold })] });

const nl = (t, bold=false) => new Paragraph({
  numbering: { reference:"numbers", level:0 }, ...sp(50,50),
  children: [new TextRun({ text:t, size:22, font:"Arial", bold })] });

const br = () => new Paragraph({ children:[new PageBreak()] });
const ln = () => new Paragraph({ ...sp(60,60), children:[new TextRun("")] });

const div = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size:6, color:"2E75B6", space:1 } },
  ...sp(120,120), children:[new TextRun("")] });

function code(lines) {
  return lines.map(l => new Paragraph({
    ...sp(15,15),
    shading: { fill:"1E1E2E", type: ShadingType.CLEAR },
    children: [new TextRun({ text: l || " ", font:"Courier New", size:18,
      color: l.trim().startsWith('--') ? "6A9955" : l.trim().startsWith('CREATE')||l.trim().startsWith('INSERT')||l.trim().startsWith('SELECT')||l.trim().startsWith('UPDATE')||l.trim().startsWith('DELETE')||l.trim().startsWith('EXEC')||l.trim().startsWith('SET')||l.trim().startsWith('BEGIN')||l.trim().startsWith('END') ? "569CD6" : l.includes('(') && !l.trim().startsWith('--') ? "DCDCAA" : "D4D4D4" })]
  }));
}

function stepBox(num, title) {
  return new Table({
    width: { size:9360, type:WidthType.DXA }, columnWidths:[800,8560],
    rows:[new TableRow({ children:[
      new TableCell({ borders:hbdrs, width:{size:800,type:WidthType.DXA},
        shading:{fill:"1F4E79",type:ShadingType.CLEAR},
        verticalAlign: VerticalAlign.CENTER,
        margins:{top:100,bottom:100,left:120,right:120},
        children:[new Paragraph({alignment:AlignmentType.CENTER,
          children:[new TextRun({text:`STEP\n${num}`,bold:true,size:22,color:"FFFFFF",font:"Arial"})]})]
      }),
      new TableCell({ borders:hbdrs, width:{size:8560,type:WidthType.DXA},
        shading:{fill:"D6E4F0",type:ShadingType.CLEAR},
        margins:{top:100,bottom:100,left:200,right:120},
        children:[new Paragraph({
          children:[new TextRun({text:title,bold:true,size:26,color:"1F4E79",font:"Arial"})]})]
      })
    ]})]
  });
}

function hdrRow(cells, widths) {
  return new TableRow({ children: cells.map((c,i) =>
    new TableCell({ borders:hbdrs, width:{size:widths[i],type:WidthType.DXA},
      shading:{fill:"1F4E79",type:ShadingType.CLEAR},
      margins:{top:80,bottom:80,left:120,right:120},
      children:[new Paragraph({children:[new TextRun({text:c,bold:true,size:20,color:"FFFFFF",font:"Arial"})]})]
    }))
  });
}

function dataRow(cells, widths, idx) {
  return new TableRow({ children: cells.map((c,i) =>
    new TableCell({ borders:bdrs, width:{size:widths[i],type:WidthType.DXA},
      shading:{fill: idx%2===0?"F5F9FF":"FFFFFF", type:ShadingType.CLEAR},
      margins:{top:80,bottom:80,left:120,right:120},
      children:[new Paragraph({children:[new TextRun({text:c,size:20,font:"Arial"})]})]
    }))
  });
}

// ── SECTIONS ─────────────────────────────────────────────────────────────────

function titlePage() { return [
  new Paragraph({ alignment:AlignmentType.CENTER, ...sp(1200,200),
    children:[new TextRun({text:"ORGAN DONATION",bold:true,size:60,color:"1F4E79",font:"Arial"})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, ...sp(0,200),
    children:[new TextRun({text:"MANAGEMENT SYSTEM",bold:true,size:60,color:"1F4E79",font:"Arial"})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, ...sp(0,120),
    children:[new TextRun({text:"Complete Project Guide — Oracle Database 21c",size:28,color:"2E75B6",font:"Arial",italics:true})] }),
  div(),
  new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[4680,4680],
    rows:[new TableRow({ children:[
      new TableCell({ borders:nbdrs, width:{size:4680,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120},
        children:[
          new Paragraph({children:[new TextRun({text:"Student ID:",bold:true,size:22,font:"Arial"})]}),
          new Paragraph({children:[new TextRun({text:"BSIT51F22R001",size:22,font:"Arial",color:"1F4E79"})]}),
          ln(),
          new Paragraph({children:[new TextRun({text:"Course:",bold:true,size:22,font:"Arial"})]}),
          new Paragraph({children:[new TextRun({text:"Database Administration & Management",size:22,font:"Arial"})]})
        ]
      }),
      new TableCell({ borders:nbdrs, width:{size:4680,type:WidthType.DXA}, margins:{top:80,bottom:80,left:120,right:120},
        children:[
          new Paragraph({children:[new TextRun({text:"Software:",bold:true,size:22,font:"Arial"})]}),
          new Paragraph({children:[new TextRun({text:"Oracle Database 21c + SQL Developer",size:22,font:"Arial"})]}),
          ln(),
          new Paragraph({children:[new TextRun({text:"Project:",bold:true,size:22,font:"Arial"})]}),
          new Paragraph({children:[new TextRun({text:"Mini Project – Original Design",size:22,font:"Arial"})]})
        ]
      })
    ]})]
  }),
  div(), ln(),
  new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[9360],
    rows:[new TableRow({ children:[
      new TableCell({ borders:hbdrs, width:{size:9360,type:WidthType.DXA},
        shading:{fill:"FFF3CD",type:ShadingType.CLEAR}, margins:{top:120,bottom:120,left:200,right:200},
        children:[
          new Paragraph({children:[new TextRun({text:"\u26A0  MANDATORY PROJECT REQUIREMENTS MET",bold:true,size:22,font:"Arial",color:"7B5800"})]}),
          new Paragraph({children:[new TextRun({text:"5+ Tables  |  PK & FK  |  Constraints  |  10+ SQL Queries  |  2+ JOINs  |  1 View  |  1 Sequence  |  1 Procedure  |  1 Function  |  1 Trigger",size:20,font:"Arial",color:"404040"})]}),
        ]
      })
    ]})]
  }),
  br()
]; }

function section_overview() { return [
  h1("PROJECT OVERVIEW"),
  p("The Organ Donation Management System (ODMS) is a relational database application built on Oracle Database 21c. It manages donors, recipients, hospitals, doctors, and donation records — enforcing data integrity, tracking changes via triggers, and providing a complete reporting layer through views and stored programs."),
  ln(),
  h2("Database Object Summary"),
  new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[2000,3000,4360],
    rows:[
      hdrRow(["Object Type","Object Name","Purpose"],[2000,3000,4360]),
      ...[ ["TABLE","HOSPITALS","Stores hospital information"],
           ["TABLE","DONORS","Stores organ donor records"],
           ["TABLE","RECIPIENTS","Stores recipient/patient records"],
           ["TABLE","DOCTORS","Stores doctor information"],
           ["TABLE","DONATIONS","Core donation transaction table"],
           ["TABLE","DONATION_AUDIT","Audit log for donation changes"],
           ["TABLE","DONOR_AUDIT","Audit log for donor changes"],
           ["SEQUENCE","SEQ_HOSPITALS / SEQ_DONORS...","Auto-generate primary keys"],
           ["VIEW","vw_donation_dashboard","Full donation report join"],
           ["PROCEDURE","sp_register_donor","Registers a new donor safely"],
           ["PROCEDURE","sp_update_donation_status","Updates donation workflow status"],
           ["FUNCTION","fn_donor_age","Returns donor age from DOB"],
           ["FUNCTION","fn_check_eligibility","Returns donor eligibility string"],
           ["TRIGGER","trg_donation_audit","Logs INSERT/UPDATE/DELETE on DONATIONS"],
           ["TRIGGER","trg_donor_audit","Logs INSERT/DELETE on DONORS"],
      ].map((r,i) => dataRow(r,[2000,3000,4360],i))
    ]
  }),
  div(), br()
]; }

function section_schema() { return [
  h1("DATABASE SCHEMA DESIGN"),
  h2("Entity Relationship Overview"),
  ...code([
    "  HOSPITALS (hospital_id PK)",
    "      |──< DONORS    (hospital_id FK)",
    "      |──< RECIPIENTS(hospital_id FK)",
    "      |──< DOCTORS   (hospital_id FK)",
    "      |──< DONATIONS (hospital_id FK)",
    "",
    "  DONORS      (donor_id PK)     ──< DONATIONS (donor_id FK)",
    "  RECIPIENTS  (recipient_id PK) ──< DONATIONS (recipient_id FK)",
    "  DOCTORS     (doctor_id PK)    ──< DONATIONS (doctor_id FK)",
  ]),
  ln(),
  h2("Constraints Used"),
  new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[1800,1800,1800,3960],
    rows:[
      hdrRow(["Constraint","Type","Table","Rule"],[1800,1800,1800,3960]),
      ...[ ["pk_hospitals","PRIMARY KEY","HOSPITALS","hospital_id unique, not null"],
           ["pk_donors","PRIMARY KEY","DONORS","donor_id unique, not null"],
           ["uq_donor_email","UNIQUE","DONORS","No duplicate emails"],
           ["fk_donor_hospital","FOREIGN KEY","DONORS","Refs HOSPITALS, ON DELETE SET NULL"],
           ["chk_donor_blood","CHECK","DONORS","Must be valid blood type"],
           ["chk_don_status","CHECK","DONATIONS","Pending/Approved/Completed/Rejected/Cancelled"],
           ["chk_recip_urgency","CHECK","RECIPIENTS","Low/Medium/High/Critical"],
           ["chk_recip_organ","CHECK","RECIPIENTS","Valid organ names only"],
      ].map((r,i)=>dataRow(r,[1800,1800,1800,3960],i))
    ]
  }),
  div(), br()
]; }

function section_sqldeveloper() { return [
  h1("STEP-BY-STEP: RUNNING IN SQL DEVELOPER"),
  note("Follow every step in order. Do not skip the cleanup step if re-running the script."),
  ln(),

  stepBox(1,"Install & Open Oracle SQL Developer"),
  ln(),
  bl("Download SQL Developer from: https://www.oracle.com/tools/downloads/sqldev-downloads.html"),
  bl("Extract the ZIP file and run sqldeveloper.exe (no installation needed)"),
  bl("On first launch, it may ask for a JDK path — point it to your Oracle 21c JDK folder"),
  tip("SQL Developer is free and bundled with Oracle XE 21c installation"),
  ln(),

  stepBox(2,"Create a New Database Connection"),
  ln(),
  nl("Click the green + icon in the Connections panel (left side)"),
  nl("Fill in the connection details:"),
  new Table({ width:{size:8000,type:WidthType.DXA}, columnWidths:[3000,5000],
    rows:[
      hdrRow(["Field","Value"],[3000,5000]),
      ...[ ["Connection Name","ODMS_Local"],
           ["Username","system  (or your schema user)"],
           ["Password","Your Oracle password"],
           ["Hostname","localhost"],
           ["Port","1521"],
           ["Service Name","XEPDB1  (or XE)"],
      ].map((r,i)=>dataRow(r,[3000,5000],i))
    ]
  }),
  ln(),
  nl("Click Test — you should see Status: Success"),
  nl("Click Save, then Connect"),
  tip("If connection fails, open Services (Win+R → services.msc) and start OracleServiceXE and OracleOraDB21Home1TNSListener"),
  ln(),

  stepBox(3,"Open the SQL Script File"),
  ln(),
  nl("In SQL Developer menu: File → Open"),
  nl("Navigate to and select ODMS_Complete_Setup.sql"),
  nl("The script opens in the SQL Worksheet editor"),
  note("Make sure the correct connection (ODMS_Local) is selected in the top-right dropdown of the worksheet"),
  ln(),

  stepBox(4,"Enable DBMS_OUTPUT (Required for Procedures)"),
  ln(),
  nl("Go to View menu → DBMS Output"),
  nl("A panel appears at the bottom of the screen"),
  nl("Click the green + icon in the DBMS Output panel and select your connection"),
  tip("This allows you to see DBMS_OUTPUT.PUT_LINE messages from procedures and triggers"),
  ln(),

  stepBox(5,"Run the Complete Setup Script"),
  ln(),
  nl("Press F5 (or click Run Script button — the play icon with lines)"),
  note("Do NOT use the single-statement run button (F9). Use F5 to run the entire script."),
  nl("Watch the Script Output panel at the bottom for any errors"),
  nl("You should see: ODMS Setup Complete! All objects created."),
  ln(),
  h3("What F5 Creates (in order):"),
  bl("Cleanup of any existing objects"),
  bl("7 Tables (HOSPITALS, DONORS, RECIPIENTS, DOCTORS, DONATIONS, DONATION_AUDIT, DONOR_AUDIT)"),
  bl("5 Sequences for auto-increment IDs"),
  bl("Sample data (5 hospitals, 5 doctors, 6 donors, 6 recipients, 6 donations)"),
  bl("1 View: vw_donation_dashboard"),
  bl("2 Stored Procedures: sp_register_donor, sp_update_donation_status"),
  bl("2 Functions: fn_donor_age, fn_check_eligibility"),
  bl("2 Triggers: trg_donation_audit, trg_donor_audit"),
  ln(),

  stepBox(6,"Verify All Objects Were Created"),
  ln(),
  p("After running the script, run these verification queries one by one using F9:"),
  ...code([
    "-- Check all tables",
    "SELECT table_name FROM user_tables ORDER BY table_name;",
    "",
    "-- Check all sequences",
    "SELECT sequence_name FROM user_sequences;",
    "",
    "-- Check triggers",
    "SELECT trigger_name, status FROM user_triggers;",
    "",
    "-- Check procedures and functions",
    "SELECT object_name, object_type FROM user_objects",
    "WHERE object_type IN ('PROCEDURE','FUNCTION','VIEW');",
  ]),
  ln(),

  stepBox(7,"Run Individual SQL Queries"),
  ln(),
  p("Highlight any single query and press F9 to run just that query. Example:"),
  ...code([
    "-- Select and press F9",
    "SELECT * FROM vw_donation_dashboard ORDER BY donation_date DESC;",
  ]),
  tip("Results appear in the Query Result panel below. Click column headers to sort."),
  ln(),

  stepBox(8,"Test Stored Procedures"),
  ln(),
  ...code([
    "SET SERVEROUTPUT ON;",
    "",
    "-- Register a new donor",
    "EXEC sp_register_donor('New Person', DATE '1998-01-01', 'B+',",
    "     '0300-1234567', 'newperson@mail.com', 2);",
    "",
    "-- Update a donation status",
    "EXEC sp_update_donation_status(103, 'Completed');",
  ]),
  ln(),

  stepBox(9,"Test Functions"),
  ln(),
  ...code([
    "-- Test age function",
    "SELECT full_name, fn_donor_age(date_of_birth) AS age FROM DONORS;",
    "",
    "-- Test eligibility function",
    "SELECT donor_id, full_name,",
    "       fn_check_eligibility(donor_id) AS status",
    "FROM DONORS;",
  ]),
  ln(),

  stepBox(10,"Test Triggers (Audit System)"),
  ln(),
  ...code([
    "-- Make a change to trigger the audit",
    "UPDATE DONATIONS SET status = 'Approved' WHERE donation_id = 102;",
    "COMMIT;",
    "",
    "-- Check audit log",
    "SELECT * FROM DONATION_AUDIT ORDER BY changed_on DESC;",
  ]),
  ln(),

  h2("Common Errors & Fixes"),
  new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3000,6360],
    rows:[
      hdrRow(["Error","Fix"],[3000,6360]),
      ...[ ["ORA-12514: Listener service unknown","Run: lsnrctl status → use correct service name (XEPDB1 or XE)"],
           ["ORA-12541: No Listener","Start OracleOraDB21Home1TNSListener in services.msc"],
           ["ORA-00942: Table not found","Re-run the full script with F5"],
           ["ORA-01031: Insufficient privileges","Log in as SYSTEM or grant required privileges"],
           ["Procedure compiles with errors","Run: SHOW ERRORS; in the worksheet"],
           ["DBMS_OUTPUT shows nothing","Go to View → DBMS Output and add your connection"],
      ].map((r,i)=>dataRow(r,[3000,6360],i))
    ]
  }),
  div(), br()
]; }

function section_queries() { return [
  h1("10 REQUIRED SQL QUERIES"),
  note("Run each query individually using F9 (highlight query first)"),
  ln(),

  h3("Q1 — Full Dashboard View (JOIN)"),
  ...code(["SELECT * FROM vw_donation_dashboard ORDER BY donation_date DESC;"]),
  ln(),

  h3("Q2 — Donations Count by Organ Type"),
  ...code(["SELECT organ_type, COUNT(*) AS total_donations",
           "FROM DONATIONS GROUP BY organ_type ORDER BY total_donations DESC;"]),
  ln(),

  h3("Q3 — Donor Eligibility (Function)"),
  ...code(["SELECT donor_id, full_name, blood_type,",
           "       fn_check_eligibility(donor_id) AS eligibility",
           "FROM DONORS;"]),
  ln(),

  h3("Q4 — Donor Age Report (Function)"),
  ...code(["SELECT full_name, blood_type,",
           "       fn_donor_age(date_of_birth) AS age_years",
           "FROM DONORS ORDER BY age_years;"]),
  ln(),

  h3("Q5 — Critical Recipients with Hospital (JOIN)"),
  ...code(["SELECT R.full_name, R.organ_needed, R.urgency_level,",
           "       H.hospital_name, H.city",
           "FROM RECIPIENTS R",
           "JOIN HOSPITALS H ON R.hospital_id = H.hospital_id",
           "WHERE R.urgency_level = 'Critical';"]),
  ln(),

  h3("Q6 — Completed Donations Report (Multi-JOIN)"),
  ...code(["SELECT D.full_name AS donor, R.full_name AS recipient,",
           "       DN.organ_type, DN.donation_date, DR.full_name AS doctor",
           "FROM DONATIONS DN",
           "JOIN DONORS     D  ON DN.donor_id     = D.donor_id",
           "JOIN RECIPIENTS R  ON DN.recipient_id = R.recipient_id",
           "JOIN DOCTORS    DR ON DN.doctor_id    = DR.doctor_id",
           "WHERE DN.status = 'Completed';"]),
  ln(),

  h3("Q7 — Hospital Donation Statistics (GROUP BY)"),
  ...code(["SELECT H.hospital_name, H.city,",
           "       COUNT(DN.donation_id) AS total_donations",
           "FROM HOSPITALS H",
           "LEFT JOIN DONATIONS DN ON H.hospital_id = DN.hospital_id",
           "GROUP BY H.hospital_name, H.city ORDER BY total_donations DESC;"]),
  ln(),

  h3("Q8 — Blood Match Subquery"),
  ...code(["SELECT full_name, blood_type FROM DONORS",
           "WHERE blood_type IN (",
           "    SELECT blood_type FROM RECIPIENTS WHERE urgency_level = 'Critical'",
           ") AND is_active = 'Y';"]),
  ln(),

  h3("Q9 — Audit Log"),
  ...code(["SELECT audit_id, operation, donation_id,",
           "       old_status, new_status, changed_by, changed_on",
           "FROM DONATION_AUDIT ORDER BY changed_on DESC FETCH FIRST 10 ROWS ONLY;"]),
  ln(),

  h3("Q10 — Pending Donations Older Than 3 Days"),
  ...code(["SELECT DN.donation_id, D.full_name AS donor,",
           "       R.full_name AS recipient, DN.organ_type,",
           "       TRUNC(SYSDATE - DN.donation_date) AS days_pending",
           "FROM DONATIONS DN",
           "JOIN DONORS     D  ON DN.donor_id     = D.donor_id",
           "JOIN RECIPIENTS R  ON DN.recipient_id = R.recipient_id",
           "WHERE DN.status = 'Pending' AND DN.donation_date < SYSDATE - 3",
           "ORDER BY days_pending DESC;"]),
  div(), br()
]; }

function section_frontend() { return [
  h1("INTERACTIVE FRONTEND — SETUP GUIDE"),
  p("The included file ODMS_Frontend.html is a complete web-based UI that connects to Oracle via a REST proxy. It allows full CRUD operations without opening SQL Developer."),
  ln(),
  h2("What the Frontend Provides"),
  bl("Dashboard — Live stats: total donors, recipients, donations, completion rate"),
  bl("Donors Tab — View all donors, add new donor, toggle active status"),
  bl("Recipients Tab — View all recipients, filter by urgency level"),
  bl("Donations Tab — Full donation dashboard table with status badges"),
  bl("CRUD Forms — Add, update, delete records through the UI"),
  bl("Audit Log — View trigger-generated audit trail"),
  ln(),
  h2("Quick Start"),
  nl("Make sure Oracle ODMS_Complete_Setup.sql has been run successfully"),
  nl("Open ODMS_Frontend.html in any modern browser (Chrome, Edge, Firefox)"),
  nl("The UI loads with mock/demo data for testing — connect to Oracle via REST for live data"),
  ln(),
  note("For a fully live connection from browser to Oracle, ORDS (Oracle REST Data Services) must be configured. The HTML file works standalone with simulated data for demo purposes."),
  ln(),
  h2("Enabling Live Oracle Connection (ORDS Setup)"),
  nl("Download ORDS from: https://www.oracle.com/database/technologies/appdev/rest.html"),
  nl("Extract and run: java -jar ords.war install"),
  nl("Follow prompts — point to your Oracle XE 21c instance"),
  nl("ORDS starts a REST server on port 8080 by default"),
  nl("Update the API_BASE variable in ODMS_Frontend.html to: http://localhost:8080/ords/"),
  tip("ORDS enables secure REST access to your Oracle tables and procedures directly from the browser"),
  div(), br()
]; }

// ── BUILD DOCUMENT ────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: { config:[
    { reference:"bullets", levels:[{ level:0, format:LevelFormat.BULLET, text:"\u2022", alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
    { reference:"numbers", levels:[{ level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT,
        style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
  ]},
  styles:{
    default:{ document:{ run:{ font:"Arial", size:22 } } },
    paragraphStyles:[
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:34, bold:true, font:"Arial", color:"1F4E79" },
        paragraph:{ spacing:{ before:400, after:120 }, outlineLevel:0 } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ size:26, bold:true, font:"Arial", color:"2E75B6" },
        paragraph:{ spacing:{ before:280, after:80 }, outlineLevel:1 } },
    ]
  },
  sections:[{
    properties:{ page:{ size:{ width:12240, height:15840 }, margin:{ top:1080, right:1080, bottom:1080, left:1080 } } },
    children:[
      ...titlePage(),
      ...section_overview(),
      ...section_schema(),
      ...section_sqldeveloper(),
      ...section_queries(),
      ...section_frontend(),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('d:\\DBMS\\ODMS_Project_Guide.docx', buf);
  console.log('Guide document created!');
});