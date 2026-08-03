const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.config', 'app', 'matrimony.db');
const db = new sqlite3.Database(dbPath);

const dummyNames = [
  "Aarav Sharma", "Aditi Rao", "Vikram Singh", "Priya Patel",
  "Rohan Desai", "Kavya Menon", "Arjun Nair", "Neha Gupta",
  "Rahul Verma", "Sanya Iyer"
];

const genders = ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female"];
const castes = ["Brahmin", "Kamma", "Rajput", "Patel", "Brahmin", "Nair", "Nair", "Baniya", "Kshatriya", "Brahmin"];
const phones = [
  "9876543210", "9876543211", "9876543212", "9876543213",
  "9876543214", "9876543215", "9876543216", "9876543217",
  "9876543218", "9876543219"
];
const cities = ["Chennai", "Hyderabad", "Delhi", "Ahmedabad", "Mumbai", "Kochi", "Trivandrum", "Pune", "Lucknow", "Bangalore"];

const insertStmt = db.prepare(`
  INSERT INTO candidates (
    registrationId, fullName, gender, dob, tobHour, tobMinute, tobAmPm, birthPlace, 
    caste, subCaste, gothram, star, raasi, laknam, horoscopeBalance,
    nativity, religion, motherTongue, qualification, occupation, 
    income, placeOfJob, fatherName, motherName, 
    contactPerson, contactNumber, presentAddress, 
    assets, partnerComments, additionalInfo
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.serialize(() => {
  for (let i = 0; i < 10; i++) {
    const additionalInfo = JSON.stringify({
      brothersCount: i % 3,
      brothersMarried: i % 2,
      sistersCount: (i + 1) % 3,
      sistersMarried: (i + 1) % 2,
      regDate: "2026-08-01"
    });

    insertStmt.run(
      `TMM-${100 + i}`,
      dummyNames[i],
      genders[i],
      `199${i}-05-15`, // DOB
      "10", "30", "AM", // TOB (hour, minute, ampm)
      cities[i],
      castes[i], // caste
      "Smartha", // subcaste
      "Kashyapa", // gothram
      "Ashwini", // star
      "Mesha", // raasi
      "Vrishabha", // laknam
      "5 Years", // balance
      cities[i], // nativity
      "Hindu", // religion
      i % 2 === 0 ? "Tamil" : "Telugu", // mother tongue
      "B.Tech", // qual
      "Software Engineer", // occ
      "80,000", // income
      cities[i], // place of job
      "Father " + dummyNames[i].split(" ")[1],
      "Mother " + dummyNames[i].split(" ")[1],
      "Self", // contact person
      phones[i], // phone
      "123 Main St, " + cities[i], // address
      "Own House", // assets
      "Looking for a well-educated partner.", // expectation
      additionalInfo // JSON
    );
  }
  
  insertStmt.finalize();
});

db.close(() => {
  console.log("Successfully inserted 10 dummy profiles.");
});
